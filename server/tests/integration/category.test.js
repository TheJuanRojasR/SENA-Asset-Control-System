import request from 'supertest';
import { createTestApp } from '../helpers/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';
import { createAdminUser, createInstructorUser, generateAccessToken } from '../helpers/auth.js';

/**
 * Tests de verificación del Módulo 10 — Categorías del catálogo.
 * Cada `it` lleva el id del criterio en el nombre (`.ai/reparto.md` §3).
 */

const app = createTestApp();

const authHeader = (user) => `Bearer ${generateAccessToken(user)}`;

async function createAdminToken() {
  const admin = await createAdminUser({ email: 'admin@sena.edu.co', fullName: 'Admin Test' });
  return { admin, token: authHeader(admin) };
}

async function createInstructorToken(overrides = {}) {
  const instructor = await createInstructorUser({
    email: 'cmendoza@sena.edu.co',
    fullName: 'Carlos Mendoza',
    ...overrides,
  });
  return { instructor, token: authHeader(instructor) };
}

const countCategories = () => prismaTest.category.count();

describe('Módulo 10 — Categorías del catálogo', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-CATEG-01 — Registrar una categoría
  // ---------------------------------------------------------------------------------
  describe('US-CATEG-01 — Registrar una categoría', () => {
    it('AC-CATEG-01-1 — Una categoría con nombre único queda en el catálogo y es elegible para clasificar elementos', async () => {
      const { token } = await createAdminToken();

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', token)
        .send({ name: 'Herramientas de taller' });

      expect(response.status).toBe(201);
      expect(response.body.data.category.name).toBe('Herramientas de taller');

      const listResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', token);
      const names = listResponse.body.data.data.map((category) => category.name);
      expect(names).toContain('Herramientas de taller');

      // Elegible: un elemento nuevo puede clasificarse con esa categoría (US-ITE-01).
      const itemResponse = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send({
          code: 'TAL-001',
          name: 'Taladro',
          categoryId: response.body.data.category.id,
        });
      expect(itemResponse.status).toBe(201);
      expect(itemResponse.body.data.item.categoryId).toBe(response.body.data.category.id);
    });

    it('AC-CATEG-01-2 — Un nombre duplicado se rechaza sin crear nada', async () => {
      const { token } = await createAdminToken();
      const original = await prismaTest.category.create({
        data: { name: 'Herramientas de taller' },
      });

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', token)
        .send({ name: 'Herramientas de taller' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);

      expect(await countCategories()).toBe(1);
      const stored = await prismaTest.category.findUnique({ where: { id: original.id } });
      expect(stored.name).toBe('Herramientas de taller');
    });

    it('AC-CATEG-01-3 — El instructor no puede registrar categorías (403 sin efectos)', async () => {
      const { token } = await createInstructorToken();
      const before = await countCategories();

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', token)
        .send({ name: 'Redes' });

      expect(response.status).toBe(403);
      expect(await countCategories()).toBe(before);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-CATEG-02 — Consultar y editar categorías
  // ---------------------------------------------------------------------------------
  describe('US-CATEG-02 — Consultar y editar categorías', () => {
    it('AC-CATEG-02-1 — La consulta devuelve las categorías registradas y son las elegibles', async () => {
      const { token } = await createAdminToken();
      const { token: instructorToken } = await createInstructorToken();
      await prismaTest.category.createMany({
        data: [
          { name: 'Herramientas de taller' },
          { name: 'Equipos de cómputo' },
        ],
      });

      for (const authToken of [token, instructorToken]) {
        const response = await request(app)
          .get('/api/categories')
          .set('Authorization', authToken);

        expect(response.status).toBe(200);
        const names = response.body.data.data.map((category) => category.name).sort();
        expect(names).toEqual(['Equipos de cómputo', 'Herramientas de taller']);
      }

      // Catálogo vacío: la consulta responde lista vacía con total 0, no error.
      await prismaTest.category.deleteMany();
      const emptyResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', token);
      expect(emptyResponse.status).toBe(200);
      expect(emptyResponse.body.data.data).toHaveLength(0);
      expect(emptyResponse.body.data.meta.total).toBe(0);
    });

    it('AC-CATEG-02-2 — El administrador edita el nombre y los elementos no se pierden', async () => {
      const { token } = await createAdminToken();
      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });
      const firstItem = await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });
      const secondItem = await prismaTest.item.create({
        data: { code: 'LLA-001', name: 'Llave', categoryId: category.id },
      });

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', token)
        .send({ name: 'Herramientas de taller' });

      expect(response.status).toBe(200);
      expect(response.body.data.category.name).toBe('Herramientas de taller');

      const itemsAfter = await prismaTest.item.findMany({
        where: { id: { in: [firstItem.id, secondItem.id] } },
      });
      expect(itemsAfter).toHaveLength(2);
      itemsAfter.forEach((item) => {
        expect(item.categoryId).toBe(category.id);
      });
      const firstAfter = itemsAfter.find((item) => item.id === firstItem.id);
      expect(firstAfter.name).toBe('Taladro');

      // Renombrar al mismo nombre que ya tiene no es un duplicado de otra categoría:
      // debe aceptarse sin efectos (comparación literal, RN-CATEG-02).
      const sameNameResponse = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', token)
        .send({ name: 'Herramientas de taller' });
      expect(sameNameResponse.status).toBe(200);
    });

    it('AC-CATEG-02-3 — El instructor consulta las categorías y no las modifica', async () => {
      const { token } = await createInstructorToken();
      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });

      const readResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', token);
      expect(readResponse.status).toBe(200);
      expect(readResponse.body.data.data).toHaveLength(1);

      const renameResponse = await request(app)
        .put(`/api/categories/${category.id}`)
        .set('Authorization', token)
        .send({ name: 'Otra cosa' });
      expect(renameResponse.status).toBe(403);

      const deleteResponse = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', token);
      expect(deleteResponse.status).toBe(403);

      const stored = await prismaTest.category.findUnique({ where: { id: category.id } });
      expect(stored.name).toBe('Herramientas');
      expect(stored.isDeleted).toBe(false);
    });

    it('AC-CATEG-02-4 — Renombrar a un nombre ya usado se rechaza y nada cambia', async () => {
      const { token } = await createAdminToken();
      const first = await prismaTest.category.create({
        data: { name: 'Herramientas de taller' },
      });
      const second = await prismaTest.category.create({ data: { name: 'Equipos de cómputo' } });

      const response = await request(app)
        .put(`/api/categories/${second.id}`)
        .set('Authorization', token)
        .send({ name: 'Herramientas de taller' });

      expect(response.status).toBe(409);
      const firstAfter = await prismaTest.category.findUnique({ where: { id: first.id } });
      const secondAfter = await prismaTest.category.findUnique({ where: { id: second.id } });
      expect(firstAfter.name).toBe('Herramientas de taller');
      expect(secondAfter.name).toBe('Equipos de cómputo');
    });

    it('AC-CATEG-02-5 — El listado de categorías es paginado y devuelve el total', async () => {
      const { token } = await createAdminToken();
      await prismaTest.category.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({ name: `Categoría ${index + 1}` })),
      });

      const response = await request(app)
        .get('/api/categories?page=1&limit=10')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(10);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(3);
      expect(response.body.data.meta.page).toBe(1);

      // La paginación no repite ni omite filas entre páginas (orden por nombre).
      const page3 = await request(app)
        .get('/api/categories?page=3&limit=10')
        .set('Authorization', token);
      expect(page3.status).toBe(200);
      expect(page3.body.data.data).toHaveLength(5);
      expect(page3.body.data.meta.page).toBe(3);
      const page1Names = response.body.data.data.map((row) => row.name);
      const page3Names = page3.body.data.data.map((row) => row.name);
      expect(page3Names.some((name) => page1Names.includes(name))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-CATEG-03 — Eliminar una categoría
  // ---------------------------------------------------------------------------------
  describe('US-CATEG-03 — Eliminar una categoría', () => {
    it('AC-CATEG-03-1 — Se elimina una categoría sin elementos y las demás no se tocan', async () => {
      const { token } = await createAdminToken();
      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });
      const other = await prismaTest.category.create({ data: { name: 'Equipos de cómputo' } });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', token);

      expect(response.status).toBe(200);

      // La baja puede ser física o lógica; el efecto exigido es que no se pueda listar.
      const listResponse = await request(app)
        .get('/api/categories')
        .set('Authorization', token);
      const names = listResponse.body.data.data.map((row) => row.name);
      expect(names).not.toContain('Herramientas');
      expect(names).toContain('Equipos de cómputo');

      const otherAfter = await prismaTest.category.findUnique({ where: { id: other.id } });
      expect(otherAfter).not.toBeNull();
      expect(otherAfter.isDeleted).toBe(false);
    });

    it('AC-CATEG-03-2 — Se rechaza eliminar una categoría con elementos y ningún elemento cambia de categoría', async () => {
      const { token } = await createAdminToken();
      const category = await prismaTest.category.create({ data: { name: 'Herramientas' } });
      const item = await prismaTest.item.create({
        data: { code: 'TAL-001', name: 'Taladro', categoryId: category.id },
      });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .set('Authorization', token);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);

      const categoryAfter = await prismaTest.category.findUnique({
        where: { id: category.id },
      });
      expect(categoryAfter).not.toBeNull();
      expect(categoryAfter.isDeleted).toBe(false);

      const itemAfter = await prismaTest.item.findUnique({ where: { id: item.id } });
      expect(itemAfter.categoryId).toBe(category.id);
    });
  });
});
