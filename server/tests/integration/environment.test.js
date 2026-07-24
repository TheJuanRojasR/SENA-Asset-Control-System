import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

async function createAdminAndLogin() {
  const admin = await prismaTest.user.create({
    data: {
      email: 'admin@sena.edu.co',
      passwordHash: await bcrypt.hash('AdminSENA2024', 10),
      fullName: 'Admin Test',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const login = await request(app).post('/api/auth/login').send({
    email: 'admin@sena.edu.co',
    password: 'AdminSENA2024',
  });

  return { admin, token: login.body.data.accessToken };
}

async function createEnvironment(overrides = {}) {
  return prismaTest.environment.create({
    data: {
      code: 'AMB-001',
      name: 'Ambiente Principal',
      location: 'Edificio A',
      isActive: true,
      isDeleted: false,
      ...overrides,
    },
  });
}

async function createInventoryUnitForEnvironment(environmentId) {
  const category = await prismaTest.category.create({
    data: { name: 'Categoría Test' },
  });

  const item = await prismaTest.item.create({
    data: {
      code: 'ITEM-001',
      name: 'Item Test',
      categoryId: category.id,
      minStock: 0,
      unit: 'UNIDAD',
      isConsumable: false,
      isActive: true,
      isDeleted: false,
    },
  });

  return prismaTest.inventoryUnit.create({
    data: {
      itemId: item.id,
      serialNumber: 'SN-001',
      environmentId,
      status: 'AVAILABLE',
      physicalState: 'GOOD',
    },
  });
}

describe('Environment endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('POST /api/environments', () => {
    it('debe crear un ambiente con datos válidos', async () => {
      const { token } = await createAdminAndLogin();

      const response = await request(app)
        .post('/api/environments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'AMB-001',
          name: 'Ambiente Principal',
          location: 'Edificio A',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.environment.code).toBe('AMB-001');
      expect(response.body.data.environment.name).toBe('Ambiente Principal');
    });

    it('debe rechazar código duplicado entre ambientes no eliminados', async () => {
      const { token } = await createAdminAndLogin();
      await createEnvironment({ code: 'AMB-001' });

      const response = await request(app)
        .post('/api/environments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'AMB-001',
          name: 'Otro ambiente',
          location: 'Edificio B',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CODE_EXISTS');
    });

    it('debe rechazar peticiones sin token', async () => {
      const response = await request(app).post('/api/environments').send({
        code: 'AMB-001',
        name: 'Ambiente Principal',
      });

      expect(response.status).toBe(401);
    });

    it('debe rechazar peticiones de instructores', async () => {
      await prismaTest.user.create({
        data: {
          email: 'instructor@sena.edu.co',
          passwordHash: await bcrypt.hash('InstructorSENA2024', 10),
          fullName: 'Instructor Test',
          role: 'INSTRUCTOR',
          isActive: true,
        },
      });

      const login = await request(app).post('/api/auth/login').send({
        email: 'instructor@sena.edu.co',
        password: 'InstructorSENA2024',
      });

      const response = await request(app)
        .post('/api/environments')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .send({
          code: 'AMB-001',
          name: 'Ambiente Principal',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/environments', () => {
    it('debe listar ambientes activos con paginación', async () => {
      const { token } = await createAdminAndLogin();
      await createEnvironment({ code: 'AMB-001' });
      await createEnvironment({ code: 'AMB-002', name: 'Segundo Ambiente' });

      const response = await request(app)
        .get('/api/environments')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBe(2);
      expect(response.body.data.meta.total).toBe(2);
    });

    it('debe filtrar ambientes por búsqueda', async () => {
      const { token } = await createAdminAndLogin();
      await createEnvironment({ code: 'AMB-001', name: 'Laboratorio' });
      await createEnvironment({ code: 'AMB-002', name: 'Taller' });

      const response = await request(app)
        .get('/api/environments?search=Laboratorio')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBe(1);
      expect(response.body.data.data[0].name).toBe('Laboratorio');
    });
  });

  describe('GET /api/environments/:id', () => {
    it('debe obtener un ambiente por ID', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironment();

      const response = await request(app)
        .get(`/api/environments/${environment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.environment.id).toBe(environment.id);
    });

    it('debe devolver 404 para un ambiente inexistente', async () => {
      const { token } = await createAdminAndLogin();

      const response = await request(app)
        .get('/api/environments/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/environments/:id', () => {
    it('debe actualizar un ambiente', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironment();

      const response = await request(app)
        .put(`/api/environments/${environment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Ambiente Actualizado',
          location: 'Edificio C',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.environment.name).toBe('Ambiente Actualizado');
      expect(response.body.data.environment.location).toBe('Edificio C');
    });

    it('debe rechazar actualización con código duplicado', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironment({ code: 'AMB-001' });
      await createEnvironment({ code: 'AMB-002' });

      const response = await request(app)
        .put(`/api/environments/${environment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'AMB-002' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('CODE_EXISTS');
    });
  });

  describe('DELETE /api/environments/:id', () => {
    it('debe eliminar un ambiente sin unidades asociadas', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironment();

      const response = await request(app)
        .delete(`/api/environments/${environment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deleted = await prismaTest.environment.findUnique({
        where: { id: environment.id },
      });
      expect(deleted.isDeleted).toBe(true);
    });

    it('debe rechazar eliminar un ambiente con unidades de inventario asociadas', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironment();
      await createInventoryUnitForEnvironment(environment.id);

      const response = await request(app)
        .delete(`/api/environments/${environment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ENVIRONMENT_HAS_UNITS');
    });
  });
});
