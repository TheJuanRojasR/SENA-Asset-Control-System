import request from 'supertest';
import { createTestApp } from '../helpers/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';
import { createAdminUser, createInstructorUser, generateAccessToken } from '../helpers/auth.js';

const app = createTestApp();

describe('Category endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('GET /api/categories', () => {
    it('debe listar categorías activas para un instructor', async () => {
      const instructor = await createInstructorUser();
      const token = generateAccessToken(instructor);

      await prismaTest.category.create({
        data: { name: 'Herramientas', description: 'Herramientas manuales' },
      });

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Herramientas');
    });

    it('debe filtrar categorías por término de búsqueda', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      await prismaTest.category.create({ data: { name: 'Herramientas' } });
      await prismaTest.category.create({ data: { name: 'Electrónicos' } });

      const response = await request(app)
        .get('/api/categories?search=herr')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].name).toBe('Herramientas');
    });

    it('debe rechazar peticiones sin token', async () => {
      const response = await request(app).get('/api/categories');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('debe obtener una categoría por id', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });

      const response = await request(app)
        .get(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.category.name).toBe('Herramientas');
    });

    it('debe devolver 404 si la categoría no existe', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const response = await request(app)
        .get('/api/categories/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/categories', () => {
    it('debe crear una categoría como admin', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Herramientas', description: 'Herramientas manuales' });

      expect(response.status).toBe(201);
      expect(response.body.data.category.name).toBe('Herramientas');
    });

    it('debe rechazar crear una categoría como instructor', async () => {
      const instructor = await createInstructorUser();
      const token = generateAccessToken(instructor);

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Herramientas' });

      expect(response.status).toBe(403);
    });

    it('debe rechazar nombres duplicados', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      await prismaTest.category.create({ data: { name: 'Herramientas' } });

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Herramientas' });

      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('debe actualizar una categoría como admin', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Herramientas eléctricas' });

      expect(response.status).toBe(200);
      expect(response.body.data.category.name).toBe('Herramientas eléctricas');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('debe eliminar una categoría sin ítems como admin', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const deleted = await prismaTest.category.findUnique({ where: { id: category.id } });
      expect(deleted.isDeleted).toBe(true);
    });

    it('debe rechazar eliminar una categoría con ítems asociados', async () => {
      const admin = await createAdminUser();
      const token = generateAccessToken(admin);

      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });
      await prismaTest.item.create({
        data: {
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(409);
    });
  });
});
