import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
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

describe('Inventory endpoints', () => {
  let app;
  let admin;
  let instructor;
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

    category = await prismaTest.category.create({
      data: { name: 'Electrónica' },
    });

    item = await prismaTest.item.create({
      data: {
        code: 'LAPTOP-001',
        name: 'Portátil',
        categoryId: category.id,
        minStock: 2,
        unit: 'UNIDAD',
      },
    });

    environment = await prismaTest.environment.create({
      data: { code: 'AULA-101', name: 'Aula 101' },
    });
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('GET /api/inventory', () => {
    it('debe rechazar peticiones sin autenticación', async () => {
      const response = await request(app).get('/api/inventory');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('debe permitir lectura a un administrador', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toEqual([]);
    });

    it('debe permitir lectura a un instructor', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(instructor));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('debe filtrar por itemId', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .get(`/api/inventory?itemId=${item.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].serialNumber).toBe('LAPTOP-001-001');
    });

    it('debe buscar por serial o nombre de ítem', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const bySerial = await request(app)
        .get('/api/inventory?search=LAPTOP-001-001')
        .set('Authorization', authHeader(admin));

      expect(bySerial.status).toBe(200);
      expect(bySerial.body.data.data).toHaveLength(1);

      const byName = await request(app)
        .get(`/api/inventory?search=${encodeURIComponent('Portátil')}`)
        .set('Authorization', authHeader(admin));

      expect(byName.status).toBe(200);
      expect(byName.body.data.data).toHaveLength(1);
    });
  });

  describe('POST /api/inventory', () => {
    it('debe crear una unidad con serial automático', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.unit.serialNumber).toBe('LAPTOP-001-001');
      expect(response.body.data.unit.status).toBe('AVAILABLE');
    });

    it('debe generar el siguiente serial consecutivo', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-005',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id });

      expect(response.status).toBe(201);
      expect(response.body.data.unit.serialNumber).toBe('LAPTOP-001-006');
    });

    it('debe crear una unidad con serial manual', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: 'SERIAL-CUSTOM-01' });

      expect(response.status).toBe(201);
      expect(response.body.data.unit.serialNumber).toBe('SERIAL-CUSTOM-01');
    });

    it('debe rechazar serial duplicado', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'DUPLICADO',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: 'DUPLICADO' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar crear unidad si el ítem no existe', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: 99999 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar crear unidad si el ambiente no existe', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, environmentId: 99999 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('debe prohibir crear unidad a un instructor', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(instructor))
        .send({ itemId: item.id });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inventory/:id', () => {
    it('debe devolver el detalle de una unidad', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .get(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.unit.id).toBe(unit.id);
      expect(response.body.data.unit.item.code).toBe('LAPTOP-001');
    });

    it('debe devolver 404 si la unidad no existe', async () => {
      const response = await request(app)
        .get('/api/inventory/99999')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/inventory/:id', () => {
    it('debe actualizar environmentId, status, physicalState y notes', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .put(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin))
        .send({
          environmentId: environment.id,
          status: 'MAINTENANCE',
          physicalState: 'DAMAGED',
          notes: 'Requiere reparación',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.unit.environmentId).toBe(environment.id);
      expect(response.body.data.unit.status).toBe('MAINTENANCE');
      expect(response.body.data.unit.physicalState).toBe('DAMAGED');
      expect(response.body.data.unit.notes).toBe('Requiere reparación');
    });

    it('debe prohibir actualizar a un instructor', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .put(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(instructor))
        .send({ status: 'MAINTENANCE' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('debe marcar la unidad como DISPOSED sin eliminarla', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .delete(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.unit.status).toBe('DISPOSED');

      const stillExists = await prismaTest.inventoryUnit.findUnique({
        where: { id: unit.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists.status).toBe('DISPOSED');
    });

    it('debe eliminar permanentemente una unidad como admin', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-002',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
          movements: {
            create: [{ type: 'ADJUSTMENT', quantity: 1 }],
          },
        },
      });

      const child = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-003',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
          parentUnitId: unit.id,
        },
      });

      const response = await request(app)
        .delete(`/api/inventory/${unit.id}/hard`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);

      const deleted = await prismaTest.inventoryUnit.findUnique({
        where: { id: unit.id },
      });
      const detachedChild = await prismaTest.inventoryUnit.findUnique({
        where: { id: child.id },
      });
      const movements = await prismaTest.movement.findMany({
        where: { inventoryUnitId: unit.id },
      });

      expect(deleted).toBeNull();
      expect(detachedChild.parentUnitId).toBeNull();
      expect(movements).toHaveLength(0);
    });

    it('debe rechazar dar de baja una unidad ya dada de baja', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'DISPOSED',
          physicalState: 'DISPOSED',
        },
      });

      const response = await request(app)
        .delete(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('debe listar ítems con stock disponible menor o igual al mínimo', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const otherItem = await prismaTest.item.create({
        data: {
          code: 'MOUSE-001',
          name: 'Mouse',
          categoryId: category.id,
          minStock: 0,
          unit: 'UNIDAD',
        },
      });

      await prismaTest.inventoryUnit.create({
        data: {
          itemId: otherItem.id,
          serialNumber: 'MOUSE-001-001',
          status: 'AVAILABLE',
          physicalState: 'GOOD',
        },
      });

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].code).toBe('LAPTOP-001');
      expect(response.body.data.data[0].availableStock).toBe(1);
    });
  });
});
