import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import requestRoutes from '../../src/routes/request.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/requests', requestRoutes);
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
      physicalState: 'GOOD',
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
          estimatedDate: '2026-07-10',
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

      const movements = await prismaTest.movement.findMany({ where: { requestId } });
      expect(movements).toHaveLength(2);
      expect(movements.every((m) => m.type === 'LOAN' && m.quantity === 1)).toBe(true);
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
      expect(assignedUnits.every((u) => u.inventoryUnit.physicalState === 'GOOD')).toBe(true);

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
