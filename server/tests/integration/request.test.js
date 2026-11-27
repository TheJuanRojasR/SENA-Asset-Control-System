import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import requestRoutes from '../../src/routes/request.routes.js';
import notificationRoutes from '../../src/routes/notification.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/requests', requestRoutes);
  app.use('/api/notifications', notificationRoutes);
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

async function seedUnits(itemId, count, status = 'AVAILABLE') {
  const units = [];
  const base = Date.now();
  for (let i = 1; i <= count; i += 1) {
    units.push({
      itemId,
      serialNumber: `ITEM-${itemId}-${base}-${String(i).padStart(3, '0')}`,
      status,
      physicalState: 'OPERATIVO',
    });
  }
  await prismaTest.inventoryUnit.createMany({ data: units });
}

describe('Request endpoints', () => {
  let app;
  let admin;
  let instructor;
  let otherInstructor;
  let category;
  let item;
  let environment;

  beforeEach(async () => {
    await resetDatabase();
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
      fullName: 'Other Instructor',
      role: 'INSTRUCTOR',
      shift: 'AFTERNOON',
      isActive: true,
    });

    category = await prismaTest.category.create({
      data: { name: 'Electrónica' },
    });

    item = await prismaTest.item.create({
      data: {
        code: 'LAPTOP-001',
        name: 'Portátil',
        categoryId: category.id,
        minStock: 1,
        unit: 'UNIDAD',
      },
    });

    environment = await prismaTest.environment.create({
      data: { code: 'AULA-104', name: 'Ambiente 104' },
    });
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('POST /api/requests', () => {
    it('debe rechazar peticiones sin autenticación', async () => {
      const response = await request(app).post('/api/requests').send({ items: [] });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('debe prohibir crear solicitudes a un administrador', async () => {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(admin))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('debe crear una solicitud con stock suficiente', async () => {
      await seedUnits(item.id, 3);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({
          environmentId: environment.id,
          shift: 'MORNING',
          estimatedDate: '2027-01-10',
          observations: 'Solicitud de prueba',
          items: [{ itemId: item.id, requestedQty: 2 }],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.request.status).toBe('PENDING');
      expect(response.body.data.request.requesterId).toBe(instructor.id);
      expect(response.body.data.request.requestItems).toHaveLength(1);
      expect(response.body.data.request.requestItems[0].requestedQty).toBe(2);
      expect(response.body.data.request.environment.id).toBe(environment.id);
    });

    it('debe generar un código autoincremental por día', async () => {
      await seedUnits(item.id, 4);

      const first = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });

      expect(first.status).toBe(201);
      expect(first.body.data.request.code).toMatch(/^SOL-\d{8}-001$/);

      const second = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });

      expect(second.status).toBe(201);
      expect(second.body.data.request.code).toMatch(/^SOL-\d{8}-002$/);
    });

    it('debe rechazar crear solicitud sin ítems', async () => {
      await seedUnits(item.id, 1);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar crear solicitud con stock insuficiente', async () => {
      await seedUnits(item.id, 1);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 3 }] });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    });

    it('debe rechazar crear solicitud si el ítem no existe', async () => {
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: 99999, requestedQty: 1 }] });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar crear solicitud si el ambiente no existe', async () => {
      await seedUnits(item.id, 1);

      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({
          environmentId: 99999,
          items: [{ itemId: item.id, requestedQty: 1 }],
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/requests', () => {
    async function createPendingRequest(user) {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(user))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      return response.body.data.request;
    }

    it('debe permitir a un administrador listar todas las solicitudes', async () => {
      await createPendingRequest(instructor);
      await createPendingRequest(otherInstructor);

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(2);
    });

    it('debe permitir a un instructor listar solo sus solicitudes', async () => {
      await createPendingRequest(instructor);
      await createPendingRequest(otherInstructor);

      const response = await request(app)
        .get('/api/requests')
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].requesterId).toBe(instructor.id);
    });

    it('debe filtrar por estado', async () => {
      const pending = await createPendingRequest(instructor);
      await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      const response = await request(app)
        .get('/api/requests?status=APPROVED')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].status).toBe('APPROVED');
    });

    it('debe filtrar por solicitante', async () => {
      await createPendingRequest(instructor);
      await createPendingRequest(otherInstructor);

      const response = await request(app)
        .get(`/api/requests?requesterId=${instructor.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].requesterId).toBe(instructor.id);
    });

    it('debe buscar por código', async () => {
      const created = await createPendingRequest(instructor);

      const response = await request(app)
        .get(`/api/requests?search=${created.code}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].code).toBe(created.code);
    });
  });

  describe('GET /api/requests/:id', () => {
    async function createPendingRequest(user) {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(user))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      return response.body.data.request;
    }

    it('debe permitir a un instructor ver su propia solicitud', async () => {
      const created = await createPendingRequest(instructor);

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(200);
      expect(response.body.data.request.id).toBe(created.id);
    });

    it('debe permitir a un administrador ver cualquier solicitud', async () => {
      const created = await createPendingRequest(instructor);

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.request.id).toBe(created.id);
    });

    it('debe prohibir a un instructor ver solicitudes ajenas', async () => {
      const created = await createPendingRequest(otherInstructor);

      const response = await request(app)
        .get(`/api/requests/${created.id}`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('debe devolver 404 si la solicitud no existe', async () => {
      const response = await request(app)
        .get('/api/requests/99999')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/requests/:id/approve', () => {
    async function createPendingRequest() {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 2 }] });
      return response.body.data.request;
    }

    it('debe aprobar una solicitud pendiente', async () => {
      const pending = await createPendingRequest();

      const response = await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('APPROVED');
      expect(response.body.data.request.approvedById).toBe(admin.id);
      expect(response.body.data.request.approvedAt).not.toBeNull();
      expect(response.body.data.request.requestItems[0].approvedQty).toBe(2);
    });

    it('debe prohibir aprobar a un instructor', async () => {
      const pending = await createPendingRequest();

      const response = await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar aprobar una solicitud no pendiente', async () => {
      const pending = await createPendingRequest();
      await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      const response = await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/requests/:id/reject', () => {
    async function createPendingRequest() {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      return response.body.data.request;
    }

    it('debe rechazar una solicitud pendiente con motivo', async () => {
      const pending = await createPendingRequest();

      const response = await request(app)
        .put(`/api/requests/${pending.id}/reject`)
        .set('Authorization', authHeader(admin))
        .send({ rejectionReason: 'No hay disponibilidad' });

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('REJECTED');
      expect(response.body.data.request.rejectionReason).toBe('No hay disponibilidad');
      expect(response.body.data.request.rejectedById).toBe(admin.id);
    });

    it('debe rechazar rechazo sin motivo', async () => {
      const pending = await createPendingRequest();

      const response = await request(app)
        .put(`/api/requests/${pending.id}/reject`)
        .set('Authorization', authHeader(admin))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar rechazar una solicitud no pendiente', async () => {
      const pending = await createPendingRequest();
      await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      const response = await request(app)
        .put(`/api/requests/${pending.id}/reject`)
        .set('Authorization', authHeader(admin))
        .send({ rejectionReason: 'No aplica' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/requests/:id/pack', () => {
    async function createApprovedRequest() {
      await seedUnits(item.id, 3);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = response.body.data.request.id;

      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));

      return requestRepository.findByIdRaw(requestId);
    }

    it('debe empacar una solicitud aprobada', async () => {
      const approved = await createApprovedRequest();

      const response = await request(app)
        .put(`/api/requests/${approved.id}/pack`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('PACKED');
      expect(response.body.data.request.packedById).toBe(admin.id);

      const assignedUnits = response.body.data.request.requestItems[0].assignedUnits;
      expect(assignedUnits).toHaveLength(2);
      expect(assignedUnits.every((u) => u.inventoryUnit.status === 'RESERVED')).toBe(true);
    });

    it('debe rechazar empacar una solicitud no aprobada', async () => {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      const pending = response.body.data.request;

      const packResponse = await request(app)
        .put(`/api/requests/${pending.id}/pack`)
        .set('Authorization', authHeader(admin));

      expect(packResponse.status).toBe(409);
      expect(packResponse.body.success).toBe(false);
    });
  });

  describe('PUT /api/requests/:id/deliver', () => {
    async function createPackedRequest() {
      await seedUnits(item.id, 3);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = response.body.data.request.id;

      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));

      return requestId;
    }

    it('debe entregar una solicitud empacada', async () => {
      const requestId = await createPackedRequest();

      const response = await request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('DELIVERED');
      expect(response.body.data.request.deliveredById).toBe(admin.id);

      const assignedUnits = response.body.data.request.requestItems[0].assignedUnits;
      expect(assignedUnits.every((u) => u.inventoryUnit.status === 'LOANED')).toBe(true);

      // RN-MOV-01: la creación deja movimientos RESERVATION y la entrega deja un LOAN por
      // unidad. Este caso verifica la entrega: exactamente dos movimientos de tipo LOAN.
      const movements = await prismaTest.movement.findMany({
        where: { requestId, type: 'LOAN' },
      });
      expect(movements).toHaveLength(2);
      expect(movements.every((m) => m.quantity === 1)).toBe(true);
    });

    it('debe rechazar entregar una solicitud no empacada', async () => {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      const approved = response.body.data.request;
      await request(app)
        .put(`/api/requests/${approved.id}/approve`)
        .set('Authorization', authHeader(admin));

      const deliverResponse = await request(app)
        .put(`/api/requests/${approved.id}/deliver`)
        .set('Authorization', authHeader(admin));

      expect(deliverResponse.status).toBe(409);
      expect(deliverResponse.body.success).toBe(false);
    });
  });

  describe('PUT /api/requests/:id/complete', () => {
    async function createDeliveredRequest() {
      await seedUnits(item.id, 3);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = response.body.data.request.id;

      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', authHeader(admin));

      return requestId;
    }

    it('debe completar una solicitud entregada y devolver el inventario', async () => {
      const requestId = await createDeliveredRequest();

      const response = await request(app)
        .put(`/api/requests/${requestId}/complete`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('COMPLETED');
      expect(response.body.data.request.completedAt).not.toBeNull();

      const assignedUnits = response.body.data.request.requestItems[0].assignedUnits;
      expect(assignedUnits.every((u) => u.inventoryUnit.status === 'AVAILABLE')).toBe(true);
      expect(assignedUnits.every((u) => u.inventoryUnit.physicalState === 'OPERATIVO')).toBe(true);

      const movements = await prismaTest.movement.findMany({ where: { requestId } });
      const returns = movements.filter((m) => m.type === 'RETURN');
      expect(returns).toHaveLength(2);
      expect(returns.every((m) => m.quantity === 1)).toBe(true);
    });

    it('debe rechazar completar una solicitud no entregada', async () => {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      const approved = response.body.data.request;
      await request(app)
        .put(`/api/requests/${approved.id}/approve`)
        .set('Authorization', authHeader(admin));

      const completeResponse = await request(app)
        .put(`/api/requests/${approved.id}/complete`)
        .set('Authorization', authHeader(admin));

      expect(completeResponse.status).toBe(409);
      expect(completeResponse.body.success).toBe(false);
    });
  });

  describe('DELETE /api/requests/:id', () => {
    async function createPendingRequest(user) {
      await seedUnits(item.id, 2);
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(user))
        .send({ items: [{ itemId: item.id, requestedQty: 1 }] });
      return response.body.data.request;
    }

    it('debe permitir a un instructor cancelar su solicitud pendiente', async () => {
      const pending = await createPendingRequest(instructor);

      const response = await request(app)
        .delete(`/api/requests/${pending.id}`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('CANCELLED');
    });

    it('debe prohibir cancelar una solicitud de otro instructor', async () => {
      const pending = await createPendingRequest(otherInstructor);

      const response = await request(app)
        .delete(`/api/requests/${pending.id}`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar cancelar una solicitud no pendiente', async () => {
      const pending = await createPendingRequest(instructor);
      await request(app)
        .put(`/api/requests/${pending.id}/approve`)
        .set('Authorization', authHeader(admin));

      const response = await request(app)
        .delete(`/api/requests/${pending.id}`)
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });
  // ---------------------------------------------------------------------------------
  // US-SOL-01 — Crear una solicitud (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-SOL-01 — Crear solicitud', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayOffset = (offset) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      return new Date(date.getTime() + offset * DAY_MS);
    };
    const dayString = (date) => new Date(date).toISOString().slice(0, 10);

    const postRequest = (payload, token = instructor) =>
      request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(token))
        .send(payload);

    const assignmentsOf = (itemId) =>
      prismaTest.requestItemUnit.count({
        where: { requestItem: { itemId } },
      });

    it('AC-SOL-01-1 — Crear una solicitud reserva las unidades para el rango de fechas', async () => {
      await seedUnits(item.id, 3);
      const pickupDate = dayOffset(1);
      const estimatedDate = dayOffset(3);

      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 2 }],
        pickupDate,
        estimatedDate,
      });

      expect(response.status).toBe(201);
      expect(response.body.data.request.status).toBe('PENDING');
      expect(dayString(response.body.data.request.pickupDate)).toBe(dayString(pickupDate));
      expect(dayString(response.body.data.request.estimatedDate)).toBe(dayString(estimatedDate));
      expect(await assignmentsOf(item.id)).toBe(2);
      const reserved = await prismaTest.inventoryUnit.count({
        where: { itemId: item.id, status: 'RESERVED' },
      });
      expect(reserved).toBe(2);
    });

    it('AC-SOL-01-2 — Sin disponibilidad suficiente se rechaza y no se reserva nada', async () => {
      await seedUnits(item.id, 3);

      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 5 }],
        pickupDate: dayOffset(1),
        estimatedDate: dayOffset(2),
      });

      expect(response.status).toBe(409);
      expect(await prismaTest.request.count()).toBe(0);
      expect(await assignmentsOf(item.id)).toBe(0);
      expect(
        await prismaTest.inventoryUnit.count({
          where: { itemId: item.id, status: 'RESERVED' },
        })
      ).toBe(0);
    });

    it('AC-SOL-01-3 — Dos solicitudes con rangos que no se solapan se aceptan ambas', async () => {
      await seedUnits(item.id, 1);

      const first = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(1),
        estimatedDate: dayOffset(2),
      });
      expect(first.status).toBe(201);

      const second = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(5),
        estimatedDate: dayOffset(6),
      });
      expect(second.status).toBe(201);

      expect(await prismaTest.request.count()).toBe(2);
      expect(await assignmentsOf(item.id)).toBe(2);
    });

    it('AC-SOL-01-4 — Dos solicitudes con rangos que se solapan compiten por el mismo stock', async () => {
      await seedUnits(item.id, 1);

      const first = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(1),
        estimatedDate: dayOffset(4),
      });
      expect(first.status).toBe(201);

      const overlapping = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(3),
        estimatedDate: dayOffset(6),
      });
      expect(overlapping.status).toBe(409);
      expect(await prismaTest.request.count()).toBe(1);
    });

    it('AC-SOL-01-5 — El administrador no puede crear solicitudes', async () => {
      await seedUnits(item.id, 1);
      const response = await postRequest(
        { items: [{ itemId: item.id, requestedQty: 1 }] },
        admin
      );
      expect(response.status).toBe(403);
      expect(await prismaTest.request.count()).toBe(0);
    });

    it('AC-SOL-01-6 — El mismo elemento repetido en la misma solicitud se rechaza', async () => {
      await seedUnits(item.id, 3);
      const response = await postRequest({
        items: [
          { itemId: item.id, requestedQty: 1 },
          { itemId: item.id, requestedQty: 1 },
        ],
      });
      expect(response.status).toBe(400);
      expect(await prismaTest.request.count()).toBe(0);
    });

    it('AC-SOL-01-7 — Una unidad prestada no cuenta como disponible para ningún rango', async () => {
      await seedUnits(item.id, 1, 'LOANED');
      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(1),
        estimatedDate: dayOffset(2),
      });
      expect(response.status).toBe(409);
      expect(await assignmentsOf(item.id)).toBe(0);
    });

    it('AC-SOL-01-8 — Una cantidad decimal de un consumible se rechaza', async () => {
      const consumable = await prismaTest.item.create({
        data: {
          code: 'CON-SOL',
          name: 'Consumible',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'LITRO',
          stock: 10,
        },
      });
      const response = await postRequest({
        items: [{ itemId: consumable.id, requestedQty: 1.5 }],
      });
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toMatch(/entero|integer/);
      expect((await prismaTest.item.findUnique({ where: { id: consumable.id } })).stock).toBe(10);
    });

    it('AC-SOL-01-9 — Una fecha de retiro anterior a hoy se rechaza y nada se reserva', async () => {
      await seedUnits(item.id, 1);
      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(-1),
        estimatedDate: dayOffset(1),
      });
      expect(response.status).toBe(400);
      expect(await prismaTest.request.count()).toBe(0);
      expect(await assignmentsOf(item.id)).toBe(0);
    });

    it('AC-SOL-01-10 — Una fecha estimada anterior a la de retiro se rechaza', async () => {
      await seedUnits(item.id, 1);
      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
        pickupDate: dayOffset(2),
        estimatedDate: dayOffset(1),
      });
      expect(response.status).toBe(400);
      expect(await prismaTest.request.count()).toBe(0);
    });

    it('AC-SOL-01-11 — La fecha de retiro por defecto es el día siguiente', async () => {
      await seedUnits(item.id, 1);
      const response = await postRequest({
        items: [{ itemId: item.id, requestedQty: 1 }],
      });
      expect(response.status).toBe(201);
      expect(dayString(response.body.data.request.pickupDate)).toBe(dayString(dayOffset(1)));
      expect(await assignmentsOf(item.id)).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-SOL-02 / US-SOL-03 — Aprobar y rechazar (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-SOL-02/03 — Aprobar y rechazar', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayOffset = (offset) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      return new Date(date.getTime() + offset * DAY_MS);
    };
    let secondItem;

    const createSecondItem = async () => {
      secondItem = await prismaTest.item.create({
        data: {
          code: 'CARGADOR-001',
          name: 'Cargador',
          categoryId: category.id,
          minStock: 1,
          unit: 'UNIDAD',
        },
      });
      return secondItem;
    };

    const createRequestWith = async ({ lines, user = instructor, pickupOffset = 1, estOffset = 3 }) => {
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(user))
        .send({
          items: lines,
          pickupDate: dayOffset(pickupOffset),
          estimatedDate: dayOffset(estOffset),
        });
      return response;
    };

    const approve = (requestId, body, token = admin) =>
      request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(token))
        .send(body || {});

    const reject = (requestId, body, token = admin) =>
      request(app)
        .put(`/api/requests/${requestId}/reject`)
        .set('Authorization', authHeader(token))
        .send(body || {});

    const approvedQtyOf = async (requestId) => {
      const items = await prismaTest.requestItem.findMany({ where: { requestId } });
      return items.map((item) => item.approvedQty);
    };

    it('AC-SOL-02-1 — Aprobar sin cambios deja la solicitud APPROVED con la cantidad', async () => {
      await seedUnits(item.id, 3);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;

      const response = await approve(requestId);
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('APPROVED');
      expect(response.body.data.request.requestItems[0].approvedQty).toBe(2);
      expect(await approvedQtyOf(requestId)).toEqual([2]);

      const reserved = await prismaTest.inventoryUnit.count({
        where: { itemId: item.id, status: 'RESERVED' },
      });
      expect(reserved).toBe(2);
      expect(
        await prismaTest.requestItemUnit.count({
          where: { requestItem: { requestId } },
        })
      ).toBe(2);
    });

    it('AC-SOL-02-2 — Al aprobar se puede reducir la cantidad y queda registrada', async () => {
      await seedUnits(item.id, 4);
      const oneLine = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 3 }] });
      const oneLineId = oneLine.body.data.request.id;

      const reduced = await approve(oneLineId, {
        items: [{ itemId: item.id, approvedQty: 2 }],
        note: 'Solo hay dos operativas',
      });
      expect(reduced.status).toBe(200);
      expect(reduced.body.data.request.status).toBe('APPROVED');
      expect(reduced.body.data.request.requestItems[0].requestedQty).toBe(3);
      expect(reduced.body.data.request.requestItems[0].approvedQty).toBe(2);
      expect(reduced.body.data.request.approvalNote).toBe('Solo hay dos operativas');

      const second = await createSecondItem();
      await seedUnits(item.id, 3);
      await seedUnits(second.id, 2);
      const twoLines = await createRequestWith({
        lines: [
          { itemId: item.id, requestedQty: 3 },
          { itemId: second.id, requestedQty: 2 },
        ],
      });
      const twoLinesId = twoLines.body.data.request.id;
      const twoLinesApproved = await approve(twoLinesId, {
        items: [
          { itemId: item.id, approvedQty: 3 },
          { itemId: second.id, approvedQty: 1 },
        ],
        note: 'Del cargador solo queda uno',
      });
      expect(twoLinesApproved.status).toBe(200);
      const totalRequested = twoLinesApproved.body.data.request.requestItems.reduce(
        (sum, row) => sum + row.requestedQty,
        0
      );
      const totalApproved = twoLinesApproved.body.data.request.requestItems.reduce(
        (sum, row) => sum + row.approvedQty,
        0
      );
      expect(totalRequested).toBe(5);
      expect(totalApproved).toBe(4);
    });

    it('AC-SOL-02-3 — No se puede aprobar una cantidad mayor a la solicitada', async () => {
      await seedUnits(item.id, 3);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;

      const response = await approve(requestId, {
        items: [{ itemId: item.id, approvedQty: 3 }],
        note: 'Intento',
      });
      expect(response.status).toBe(400);
      const stored = await prismaTest.request.findUnique({ where: { id: requestId } });
      expect(stored.status).toBe('PENDING');
      expect(await approvedQtyOf(requestId)).toEqual([null]);
      expect(
        await prismaTest.requestItemUnit.count({ where: { requestItem: { requestId } } })
      ).toBe(2);
    });

    it('AC-SOL-02-4 — La nota es obligatoria al reducir el total y opcional al aprobar lo pedido', async () => {
      await seedUnits(item.id, 20);
      // Reducción sin nota.
      const reducedWithoutNote = await createRequestWith({
        lines: [{ itemId: item.id, requestedQty: 3 }],
      });
      const reducedId = reducedWithoutNote.body.data.request.id;
      const rejected = await approve(reducedId, {
        items: [{ itemId: item.id, approvedQty: 2 }],
      });
      expect(rejected.status).toBe(400);
      expect(JSON.stringify(rejected.body).toLowerCase()).toContain('nota');
      expect((await prismaTest.request.findUnique({ where: { id: reducedId } })).status).toBe(
        'PENDING'
      );
      expect(await approvedQtyOf(reducedId)).toEqual([null]);

      // Aprobación exacta sin nota.
      const exact = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      expect((await approve(exact.body.data.request.id)).status).toBe(200);

      // Dos líneas con totales iguales sin nota.
      const second = await createSecondItem();
      await seedUnits(item.id, 3);
      await seedUnits(second.id, 2);
      const equalTotals = await createRequestWith({
        lines: [
          { itemId: item.id, requestedQty: 3 },
          { itemId: second.id, requestedQty: 2 },
        ],
      });
      expect((await approve(equalTotals.body.data.request.id)).status).toBe(200);

      // Dos líneas con total menor sin nota.
      await seedUnits(second.id, 5);
      const lowerTotal = await createRequestWith({
        lines: [
          { itemId: item.id, requestedQty: 3 },
          { itemId: second.id, requestedQty: 2 },
        ],
      });
      const lowerRejected = await approve(lowerTotal.body.data.request.id, {
        items: [
          { itemId: item.id, approvedQty: 3 },
          { itemId: second.id, approvedQty: 1 },
        ],
      });
      expect(lowerRejected.status).toBe(400);
      expect(JSON.stringify(lowerRejected.body).toLowerCase()).toContain('nota');
    });

    it('AC-SOL-02-5 — Solo el administrador aprueba', async () => {
      await seedUnits(item.id, 3);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;

      const response = await approve(requestId, {}, instructor);
      expect(response.status).toBe(403);
      expect((await prismaTest.request.findUnique({ where: { id: requestId } })).status).toBe(
        'PENDING'
      );
      expect(await approvedQtyOf(requestId)).toEqual([null]);
      expect(
        await prismaTest.requestItemUnit.count({ where: { requestItem: { requestId } } })
      ).toBe(2);
    });

    it('AC-SOL-02-6 — No se puede aprobar más de lo disponible para el rango', async () => {
      await seedUnits(item.id, 3);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 3 }] });
      const requestId = created.body.data.request.id;
      const units = await prismaTest.inventoryUnit.findMany({
        where: { itemId: item.id },
        take: 2,
      });
      await prismaTest.inventoryUnit.updateMany({
        where: { id: { in: units.map((unit) => unit.id) } },
        data: { status: 'LOANED' },
      });

      const rejected = await approve(requestId, {
        items: [{ itemId: item.id, approvedQty: 3 }],
        note: 'Aprobación completa',
      });
      expect(rejected.status).toBe(409);
      expect(rejected.body.code).toBe('INSUFFICIENT_STOCK');
      expect((await prismaTest.request.findUnique({ where: { id: requestId } })).status).toBe(
        'PENDING'
      );
      expect(await approvedQtyOf(requestId)).toEqual([null]);

      // Exactamente lo disponible.
      await seedUnits(item.id, 2);
      const exactCase = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const exactId = exactCase.body.data.request.id;
      const approved = await approve(exactId, {
        items: [{ itemId: item.id, approvedQty: 2 }],
      });
      expect(approved.status).toBe(200);
      expect(await approvedQtyOf(exactId)).toEqual([2]);
      expect(
        await prismaTest.requestItemUnit.count({ where: { requestItem: { requestId: exactId } } })
      ).toBe(2);
    });

    it('AC-SOL-03-1 — Rechazar exige motivo y registra quién, cuándo y por qué', async () => {
      await seedUnits(item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 1 }] });
      const requestId = created.body.data.request.id;

      const response = await reject(requestId, { rejectionReason: 'Equipo en mantenimiento' });
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('REJECTED');
      expect(response.body.data.request.rejectionReason).toBe('Equipo en mantenimiento');
      expect(response.body.data.request.rejectedById).toBe(admin.id);
      expect(response.body.data.request.rejectedAt).not.toBeNull();
    });

    it('AC-SOL-03-2 — Rechazar libera la reserva del rango', async () => {
      await seedUnits(item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;

      const response = await reject(requestId, { rejectionReason: 'No alcanza' });
      expect(response.status).toBe(200);
      expect(
        await prismaTest.inventoryUnit.count({
          where: { itemId: item.id, status: 'AVAILABLE' },
        })
      ).toBe(2);
      expect(
        await prismaTest.requestItemUnit.count({ where: { requestItem: { requestId } } })
      ).toBe(0);

      const again = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      expect(again.status).toBe(201);
    });

    it('AC-SOL-03-3 — Un rechazo sin motivo se rechaza y la solicitud sigue PENDING', async () => {
      await seedUnits(item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 1 }] });
      const requestId = created.body.data.request.id;

      const response = await reject(requestId, {});
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain('motivo');
      expect((await prismaTest.request.findUnique({ where: { id: requestId } })).status).toBe(
        'PENDING'
      );
      expect(
        await prismaTest.requestItemUnit.count({ where: { requestItem: { requestId } } })
      ).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-SOL-04 / US-SOL-05 — Modificar y empacar (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-SOL-04/05 — Modificar y empacar', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dayOffset = (offset) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      return new Date(date.getTime() + offset * DAY_MS);
    };
    const dayString = (date) => new Date(date).toISOString().slice(0, 10);

    const createRequestWith = async ({
      lines,
      user = instructor,
      pickupOffset = 1,
      estOffset = 3,
    }) =>
      request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(user))
        .send({
          items: lines,
          pickupDate: dayOffset(pickupOffset),
          estimatedDate: dayOffset(estOffset),
        });

    const modifyRequest = (requestId, body, user = instructor) =>
      request(app)
        .put(`/api/requests/${requestId}`)
        .set('Authorization', authHeader(user))
        .send(body);

    const approve = (requestId) =>
      request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));

    const pack = (requestId) =>
      request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));

    const deliver = async (requestId) => {
      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));
      return request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', authHeader(admin));
    };

    const requestStatus = async (requestId) =>
      (await prismaTest.request.findUnique({ where: { id: requestId } })).status;

    const assignmentsFor = (requestId) =>
      prismaTest.requestItemUnit.count({ where: { requestItem: { requestId } } });

    const createCompound = async ({ name, components }) => {
      const compound = await prismaTest.item.create({
        data: { code: `CMP-${Date.now()}-${Math.random()}`, name, categoryId: category.id },
      });
      for (const component of components) {
        await prismaTest.itemComponent.create({
          data: {
            parentItemId: compound.id,
            childItemId: component.item.id,
            isRequired: component.isRequired ?? true,
            quantity: component.quantity ?? 1,
          },
        });
      }
      return compound;
    };

    const createUnit = (targetItem, serial, overrides = {}) =>
      prismaTest.inventoryUnit.create({
        data: {
          itemId: targetItem.id,
          serialNumber: serial,
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
          ...overrides,
        },
      });

    it('AC-SOL-04-1 — El instructor modifica su pendiente y se ajusta la reserva', async () => {
      await seedUnits(item.id, 3);
      const created = await createRequestWith({
        lines: [{ itemId: item.id, requestedQty: 1 }],
        pickupOffset: 1,
        estOffset: 2,
      });
      const requestId = created.body.data.request.id;
      const newEstimate = dayOffset(5);

      const response = await modifyRequest(requestId, {
        items: [{ itemId: item.id, requestedQty: 2 }],
        estimatedDate: newEstimate,
      });
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('PENDING');
      expect(response.body.data.request.requestItems[0].requestedQty).toBe(2);
      expect(dayString(response.body.data.request.estimatedDate)).toBe(dayString(newEstimate));
      expect(await assignmentsFor(requestId)).toBe(2);
      expect(
        await prismaTest.inventoryUnit.count({
          where: { itemId: item.id, status: 'RESERVED' },
        })
      ).toBe(2);
    });

    it('AC-SOL-04-2 — Si la modificación no cabe, se rechaza y todo queda como estaba', async () => {
      await seedUnits(item.id, 2);
      const competing = await createRequestWith({
        lines: [{ itemId: item.id, requestedQty: 1 }],
        user: otherInstructor,
      });
      expect(competing.status).toBe(201);

      const created = await createRequestWith({
        lines: [{ itemId: item.id, requestedQty: 1 }],
      });
      const requestId = created.body.data.request.id;
      const before = await prismaTest.request.findUnique({ where: { id: requestId } });

      const response = await modifyRequest(requestId, {
        items: [{ itemId: item.id, requestedQty: 2 }],
      });
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
      const after = await prismaTest.request.findUnique({
        where: { id: requestId },
        include: { requestItems: true },
      });
      expect(after.requestItems[0].requestedQty).toBe(1);
      expect(after.pickupDate.getTime()).toBe(before.pickupDate.getTime());
      expect(after.estimatedDate.getTime()).toBe(before.estimatedDate.getTime());
      expect(await assignmentsFor(requestId)).toBe(1);
    });

    it('AC-SOL-05-1 — Empacar deja la solicitud PACKED con las unidades concretas', async () => {
      await seedUnits(item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;
      await approve(requestId);

      const response = await pack(requestId);
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('PACKED');
      const assigned = response.body.data.request.requestItems[0].assignedUnits;
      expect(assigned).toHaveLength(2);
      assigned.forEach((assignment) => {
        expect(assignment.inventoryUnit.serialNumber).toBeTruthy();
      });

      const competing = await createRequestWith({
        lines: [{ itemId: item.id, requestedQty: 1 }],
        user: otherInstructor,
      });
      expect(competing.status).toBe(409);
    });

    it('AC-SOL-05-2 — Un compuesto con obligatorio ausente no se empaca', async () => {
      const requiredPiece = await prismaTest.item.create({
        data: { code: 'CMP-REQ', name: 'Pieza obligatoria', categoryId: category.id },
      });
      const compound = await createCompound({
        name: 'Compuesto con obligatorio',
        components: [{ item: requiredPiece }],
      });
      const parentUnit = await createUnit(compound, 'CMP-REQ-P-001');
      const pieceUnit = await createUnit(requiredPiece, 'CMP-REQ-C-001');
      await prismaTest.inventoryUnit.update({
        where: { id: pieceUnit.id },
        data: { parentUnitId: parentUnit.id },
      });

      // La pieza obligatoria sale prestada por separado.
      const pieceRequest = await createRequestWith({
        lines: [{ itemId: requiredPiece.id, requestedQty: 1 }],
        user: otherInstructor,
      });
      expect(pieceRequest.status).toBe(201);
      expect((await deliver(pieceRequest.body.data.request.id)).status).toBe(200);

      const created = await createRequestWith({ lines: [{ itemId: compound.id, requestedQty: 1 }] });
      const requestId = created.body.data.request.id;
      await approve(requestId);
      const before = await assignmentsFor(requestId);

      const response = await pack(requestId);
      expect(response.status).toBe(409);
      expect(await requestStatus(requestId)).toBe('APPROVED');
      expect(await assignmentsFor(requestId)).toBe(before);
    });

    it('AC-SOL-05-3 — Si falta un opcional, se empaca y se documenta', async () => {
      const requiredPiece = await prismaTest.item.create({
        data: { code: 'CMP-RO', name: 'Pieza requerida', categoryId: category.id },
      });
      const optionalPiece = await prismaTest.item.create({
        data: { code: 'CMP-OP', name: 'Accesorio opcional', categoryId: category.id },
      });
      const compound = await createCompound({
        name: 'Compuesto con opcional',
        components: [
          { item: requiredPiece },
          { item: optionalPiece, isRequired: false },
        ],
      });
      const parentUnit = await createUnit(compound, 'CMP-RO-P-001');
      const requiredUnit = await createUnit(requiredPiece, 'CMP-RO-C-001');
      await prismaTest.inventoryUnit.update({
        where: { id: requiredUnit.id },
        data: { parentUnitId: parentUnit.id },
      });

      const created = await createRequestWith({ lines: [{ itemId: compound.id, requestedQty: 1 }] });
      const requestId = created.body.data.request.id;
      await approve(requestId);

      const response = await pack(requestId);
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('PACKED');
      expect(response.body.data.request.packingNotes).toContain('Accesorio opcional');
    });

    it('AC-SOL-05-4 — Si ya no hay stock para el rango, empacar falla sin avanzar', async () => {
      await seedUnits(item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;
      await approve(requestId);
      const units = await prismaTest.inventoryUnit.findMany({ where: { itemId: item.id } });
      await prismaTest.inventoryUnit.update({
        where: { id: units[0].id },
        data: { status: 'LOANED' },
      });
      const before = await assignmentsFor(requestId);

      const response = await pack(requestId);
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
      expect(await requestStatus(requestId)).toBe('APPROVED');
      expect(await assignmentsFor(requestId)).toBe(before);
    });

    it('AC-SOL-05-5 — Empacar no descuenta stock de consumibles', async () => {
      const consumable = await prismaTest.item.create({
        data: {
          code: 'CON-EMP',
          name: 'Consumible para empacar',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'LITRO',
          stock: 10,
        },
      });
      const created = await createRequestWith({
        lines: [{ itemId: consumable.id, requestedQty: 2 }],
      });
      const requestId = created.body.data.request.id;
      await approve(requestId);

      const response = await pack(requestId);
      expect(response.status).toBe(200);
      expect(response.body.data.request.status).toBe('PACKED');
      const stored = await prismaTest.item.findUnique({ where: { id: consumable.id } });
      expect(stored.stock).toBe(10);
    });

    it('AC-SOL-05-6 — Empacar deja exactamente un aviso de listo para retirar; aprobar no', async () => {
      await seedUnits(this ? item.id : item.id, 2);
      const created = await createRequestWith({ lines: [{ itemId: item.id, requestedQty: 2 }] });
      const requestId = created.body.data.request.id;
      await approve(requestId);

      // Aprobar deja aviso de aprobación, no de retiro.
      const approvalNotices = await prismaTest.notification.findMany({
        where: { requestId },
      });
      expect(approvalNotices.some((notice) => notice.type === 'REQUEST_APPROVED')).toBe(true);
      expect(approvalNotices.some((notice) => notice.type === 'PICKUP_READY')).toBe(false);

      await pack(requestId);
      const pickupNotices = await prismaTest.notification.findMany({
        where: { requestId, type: 'PICKUP_READY' },
      });
      expect(pickupNotices).toHaveLength(1);

      const list = await request(app)
        .get('/api/notifications')
        .set('Authorization', authHeader(instructor));
      expect(list.status).toBe(200);
      expect(
        list.body.data.data.some(
          (notice) => notice.requestId === requestId && notice.type === 'PICKUP_READY'
        )
      ).toBe(true);
    });
  });
});

const requestRepository = {
  async findByIdRaw(id) {
    return prismaTest.request.findUnique({
      where: { id },
      include: {
        requestItems: {
          include: {
            assignedUnits: {
              include: {
                inventoryUnit: true,
              },
            },
          },
        },
      },
    
});
  },
};
