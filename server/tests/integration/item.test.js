import request from 'supertest';
import { createTestApp } from '../helpers/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';
import { createAdminUser, createInstructorUser, generateAccessToken } from '../helpers/auth.js';

const app = createTestApp();

describe('Item endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  async function createCategory() {
    return prismaTest.category.create({
      data: { name: 'Herramientas' },
    });
  }

  describe('GET /api/items', () => {
    it('debe listar ítems activos con stock y categoría para un instructor', async () => {
      const instructor = await createInstructorUser();
      const token = generateAccessToken(instructor);
      const category = await createCategory();

      await prismaTest.item.create({
        data: {
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: category.id,
          inventoryUnits: {
            create: [{ serialNumber: 'TAL-001-001' }],
          },
        },
      });

      const response = await request(app).get('/api/items').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].category.name).toBe('Herramientas');
      expect(response.body.data.data[0].stock).toBe(1);
    });

    it('debe filtrar por categoría y término de búsqueda', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });
      await prismaTest.item.create({
        data: { code: 'LIJ-001', name: 'Lijadora', categoryId: category.id },
      });

      const response = await request(app)
        .get(`/api/items?categoryId=${category.id}&search=tal`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Taladro');
    });
  });

  describe('GET /api/items/:id', () => {
    it('debe obtener un ítem con sus unidades', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const item = await prismaTest.item.create({
        data: {
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: category.id,
          inventoryUnits: {
            create: [{ serialNumber: 'TAL-001-001' }],
          },
        },
      });

      const response = await request(app)
        .get(`/api/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.item.inventoryUnits).toHaveLength(1);
      expect(response.body.data.item.inventoryUnits[0].serialNumber).toBe('TAL-001-001');
    });

    it('debe devolver 404 si el ítem no existe', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const response = await request(app)
        .get('/api/items/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/items', () => {
    it('debe crear un ítem no consumible con unidades seriadas', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: category.id,
          initialQty: 3,
          isConsumable: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.item.inventoryUnits).toHaveLength(3);
      expect(response.body.data.item.inventoryUnits[0].serialNumber).toBe('TAL-001-001');
      expect(response.body.data.item.inventoryUnits[2].serialNumber).toBe('TAL-001-003');
      expect(response.body.data.item.stock).toBe(3);
    });

    it('debe crear un ítem consumible con stock inicial', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'PINT-001',
          name: 'Pintura',
          categoryId: category.id,
          initialQty: 50,
          isConsumable: true,
          unit: 'LITRO',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.item.inventoryUnits).toHaveLength(50);
      expect(response.body.data.item.inventoryUnits[0].serialNumber).toBe('PINT-001-001');
      expect(response.body.data.item.stock).toBe(50);
    });

    it('debe rechazar crear un ítem como instructor', async () => {
      const instructor = await createInstructorUser();
      const token = generateAccessToken(instructor);
      const category = await createCategory();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TAL-001', name: 'Taladro', categoryId: category.id });

      expect(response.status).toBe(403);
    });

    it('debe rechazar códigos duplicados', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TAL-001', name: 'Otro taladro', categoryId: category.id });

      expect(response.status).toBe(409);
    });

    it('debe rechazar una categoría inexistente', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'TAL-001', name: 'Taladro', categoryId: 9999 });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/items/:id', () => {
    it('debe actualizar un ítem como admin', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const item = await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });

      const response = await request(app)
        .put(`/api/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Taladro percutor' });

      expect(response.status).toBe(200);
      expect(response.body.data.item.name).toBe('Taladro percutor');
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('debe eliminar un ítem sin unidades en préstamo como admin', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const item = await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });

      const response = await request(app)
        .delete(`/api/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const deleted = await prismaTest.item.findUnique({ where: { id: item.id } });
      expect(deleted.isDeleted).toBe(true);
    });

    it('debe rechazar eliminar un ítem con unidades en préstamo', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);
      const category = await createCategory();

      const item = await prismaTest.item.create({
        data: {
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: category.id,
          inventoryUnits: {
            create: [{ serialNumber: 'TAL-001-001', status: 'LOANED' }],
          },
        },
      });

      const response = await request(app)
        .delete(`/api/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(409);
    });
  });
});
