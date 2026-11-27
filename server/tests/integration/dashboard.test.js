import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import dashboardRoutes from '../../src/routes/dashboard.routes.js';
import itemRoutes from '../../src/routes/item.routes.js';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use(errorHandler);
  return app;
}

async function createUser(data) {
  return prismaTest.user.create({
    data: {
      ...data,
      passwordHash: await bcrypt.hash(data.password || 'Password123', 10),
    },
  });
}

function authHeader(user) {
  const { accessToken } = generateTokens({ userId: user.id, role: user.role });
  return `Bearer ${accessToken}`;
}

describe('Dashboard endpoints', () => {
  let app;
  let admin;
  let instructor;
  let otherInstructor;
  let category;
  let item;
  let requestSeq = 0;

  beforeAll(() => {});

  beforeEach(async () => {
    await resetDatabase();
    requestSeq = 0;
    app = buildApp();

    admin = await createUser({
      email: 'admin@sena.edu.co',
      fullName: 'Admin Test',
      role: 'ADMIN',
      isActive: true,
    });
    instructor = await createUser({
      email: 'instructor@sena.edu.co',
      fullName: 'Instructor Test',
      role: 'INSTRUCTOR',
      shift: 'MORNING',
      isActive: true,
    });
    otherInstructor = await createUser({
      email: 'other@sena.edu.co',
      fullName: 'Otro Instructor',
      role: 'INSTRUCTOR',
      shift: 'AFTERNOON',
      isActive: true,
    });

    category = await prismaTest.category.create({ data: { name: 'Electrónica' } });
    item = await prismaTest.item.create({
      data: { code: 'PAN-ITEM', name: 'Portátil', categoryId: category.id, unit: 'UNIDAD' },
    });
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  const createRequestRecord = ({ status = 'PENDING', requesterId = instructor.id, createdAt } = {}) => {
    requestSeq += 1;
    return prismaTest.request.create({
      data: {
        code: `PAN-${String(requestSeq).padStart(3, '0')}`,
        requesterId,
        status,
        ...(createdAt ? { createdAt } : {}),
      },
    });
  };

  const getDashboard = (role, user) =>
    request(app).get(`/api/dashboard/${role}`).set('Authorization', authHeader(user));

  it('AC-PAN-01-1 — El panel informa los instructores activos y no los inactivos', async () => {
    await createUser({ email: 'act1@sena.edu.co', fullName: 'Activo 1', role: 'INSTRUCTOR', isActive: true });
    await createUser({ email: 'act2@sena.edu.co', fullName: 'Activo 2', role: 'INSTRUCTOR', isActive: true });
    await createUser({ email: 'inact1@sena.edu.co', fullName: 'Inactivo 1', role: 'INSTRUCTOR', isActive: false });
    await createUser({ email: 'inact2@sena.edu.co', fullName: 'Inactivo 2', role: 'INSTRUCTOR', isActive: false });

    const response = await getDashboard('admin', admin);
    expect(response.status).toBe(200);
    const expectedActive = await prismaTest.user.count({
      where: { role: 'INSTRUCTOR', isActive: true },
    });
    const totalInstructors = await prismaTest.user.count({ where: { role: 'INSTRUCTOR' } });
    expect(response.body.data.dashboard.activeInstructors).toBe(expectedActive);
    expect(totalInstructors).toBeGreaterThan(expectedActive);
  });

  it('AC-PAN-01-2 — El panel informa el total de elementos del catálogo', async () => {
    for (let index = 0; index < 24; index += 1) {
      await prismaTest.item.create({
        data: {
          code: `PAN-${index}`,
          name: `Elemento ${index}`,
          categoryId: category.id,
          unit: 'UNIDAD',
        },
      });
    }

    const catalog = await request(app)
      .get('/api/items')
      .query({ page: 1, limit: 20 })
      .set('Authorization', authHeader(admin));
    expect(catalog.status).toBe(200);
    expect(catalog.body.data.meta.total).toBe(25);

    const response = await getDashboard('admin', admin);
    expect(response.body.data.dashboard.catalogItems).toBe(catalog.body.data.meta.total);
    expect(response.body.data.dashboard.catalogItems).not.toBe(
      catalog.body.data.data.length
    );
  });

  it('AC-PAN-01-3 — El panel cuenta solo solicitudes PENDING', async () => {
    for (const status of [
      'PENDING',
      'PENDING',
      'APPROVED',
      'PACKED',
      'PARTIALLY_DELIVERED',
      'DELIVERED',
      'PARTIALLY_RETURNED',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
    ]) {
      await createRequestRecord({ status });
    }

    const response = await getDashboard('admin', admin);
    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.pendingRequests).toBe(2);
  });

  it('AC-PAN-01-4 — El panel alerta el umbral y coincide con stock bajo', async () => {
    const createConsumable = (code, stock, minStock) =>
      prismaTest.item.create({
        data: {
          code,
          name: `Consumible ${code}`,
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'UNIDAD',
          stock,
          minStock,
        },
      });

    await createConsumable('PAN-BORDE', 5, 5);
    await createConsumable('PAN-DEBajo', 2, 5);
    await createConsumable('PAN-ARRIBA', 6, 5);
    await createConsumable('PAN-SIN', 0, null);

    const lowStock = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', authHeader(admin));
    const panel = await getDashboard('admin', admin);
    expect(lowStock.status).toBe(200);
    expect(lowStock.body.data.data).toHaveLength(2);
    expect(panel.body.data.dashboard.lowStockAlerts).toBe(lowStock.body.data.data.length);
    expect(panel.body.data.dashboard.lowStockAlerts).toBe(2);

    // Caso de cero: todos por encima del umbral.
    await prismaTest.item.updateMany({
      where: { code: { startsWith: 'PAN-' }, minStock: { not: null } },
      data: { stock: 10 },
    });
    const zeroPanel = await getDashboard('admin', admin);
    const zeroStock = await request(app)
      .get('/api/inventory/low-stock')
      .set('Authorization', authHeader(admin));
    expect(zeroPanel.body.data.dashboard.lowStockAlerts).toBe(0);
    expect(zeroStock.body.data.data).toHaveLength(0);
  });

  it('AC-PAN-01-5 — Las últimas solicitudes van por fecha de creación descendente', async () => {
    const oldest = await createRequestRecord({
      status: 'APPROVED',
      createdAt: new Date('2026-04-02T10:00:00Z'),
    });
    const middle = await createRequestRecord({
      status: 'PENDING',
      createdAt: new Date('2026-04-10T10:00:00Z'),
    });
    const newest = await createRequestRecord({
      status: 'DELIVERED',
      createdAt: new Date('2026-04-20T10:00:00Z'),
    });

    const response = await getDashboard('admin', admin);
    expect(response.status).toBe(200);
    const latest = response.body.data.dashboard.latestRequests;
    expect(latest.length).toBeGreaterThanOrEqual(3);
    expect(latest[0].id).toBe(newest.id);
    expect(latest[0].status).toBe('DELIVERED');
    expect(latest[0].requester.id).toBe(instructor.id);
    const ids = latest.map((row) => row.id);
    expect(ids.indexOf(newest.id)).toBeLessThan(ids.indexOf(middle.id));
    expect(ids.indexOf(middle.id)).toBeLessThan(ids.indexOf(oldest.id));
  });

  it('AC-PAN-02-1 — Solo las solicitudes activas del propio instructor', async () => {
    for (const status of [
      'PENDING',
      'APPROVED',
      'PACKED',
      'PARTIALLY_DELIVERED',
      'DELIVERED',
      'PARTIALLY_RETURNED',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
    ]) {
      await createRequestRecord({ status, requesterId: instructor.id });
    }
    for (const status of ['PENDING', 'APPROVED', 'DELIVERED']) {
      await createRequestRecord({ status, requesterId: otherInstructor.id });
    }

    const response = await getDashboard('instructor', instructor);
    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.activeRequests).toBe(6);
  });

  it('AC-PAN-02-2 — Solo las devoluciones pendientes del propio instructor', async () => {
    const loanedAt = new Date('2026-04-15T10:00:00Z');

    const createUnit = (serial) =>
      prismaTest.inventoryUnit.create({
        data: { itemId: item.id, serialNumber: serial, status: 'LOANED' },
      });

    const createDeliveredAssignment = async ({
      requesterId,
      requestStatus,
      loaned = true,
      returned = false,
      lost = false,
      serial,
    }) => {
      const requestRecord = await createRequestRecord({ status: requestStatus, requesterId });
      const requestItem = await prismaTest.requestItem.create({
        data: { requestId: requestRecord.id, itemId: item.id, requestedQty: 1, approvedQty: 1 },
      });
      const unit = await createUnit(serial);
      await prismaTest.requestItemUnit.create({
        data: {
          requestItemId: requestItem.id,
          inventoryUnitId: unit.id,
          ...(loaned ? { loanedAt } : {}),
          ...(returned ? { returnedAt: new Date('2026-04-18T10:00:00Z') } : {}),
          ...(lost ? { lostAt: new Date('2026-04-19T10:00:00Z') } : {}),
        },
      });
      return { requestRecord, requestItem, unit };
    };

    // Propia entregada sin devolver: cuenta.
    await createDeliveredAssignment({
      requesterId: instructor.id,
      requestStatus: 'DELIVERED',
      serial: 'PAN-A-001',
    });
    // Propia ya devuelta: no cuenta.
    await createDeliveredAssignment({
      requesterId: instructor.id,
      requestStatus: 'COMPLETED',
      returned: true,
      serial: 'PAN-B-001',
    });
    // De otro instructor: no cuenta.
    await createDeliveredAssignment({
      requesterId: otherInstructor.id,
      requestStatus: 'DELIVERED',
      serial: 'PAN-C-001',
    });
    // Entrega parcial: la entregada cuenta, la que no ha salido no.
    const partial = await createDeliveredAssignment({
      requesterId: instructor.id,
      requestStatus: 'PARTIALLY_DELIVERED',
      serial: 'PAN-D-001',
    });
    const notDeliveredUnit = await createUnit('PAN-E-001');
    await prismaTest.requestItemUnit.create({
      data: { requestItemId: partial.requestItem.id, inventoryUnitId: notDeliveredUnit.id },
    });
    // Propia declarada perdida: no cuenta.
    await createDeliveredAssignment({
      requesterId: instructor.id,
      requestStatus: 'DELIVERED',
      lost: true,
      serial: 'PAN-F-001',
    });

    const response = await getDashboard('instructor', instructor);
    expect(response.status).toBe(200);
    expect(response.body.data.dashboard.pendingReturns).toBe(2);
  });
});
