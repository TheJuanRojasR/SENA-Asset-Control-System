import request from 'supertest';
import express from 'express';
import itemRoutes from '../../src/routes/item.routes.js';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';
import {
  createAdminUser,
  createInstructorUser,
  generateAccessToken,
} from '../helpers/auth.js';

/**
 * Tests de verificación del Módulo 04 — Ítems y componentes.
 * Cada `it` lleva el id del criterio en el nombre (`reparto.md` §3).
 *
 * Este archivo cubre US-ITE-01 y US-ITE-02 (registro de serializables y consumibles).
 * US-ITE-03…06 se agregan en el siguiente encadenado del módulo.
 */

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use(errorHandler);
  return app;
}

const app = buildApp();

const auth = (user) => `Bearer ${generateAccessToken(user)}`;

async function createAdminToken() {
  const admin = await createAdminUser({ email: 'admin@sena.edu.co', fullName: 'Admin Test' });
  return { admin, token: auth(admin) };
}

async function createInstructorToken() {
  const instructor = await createInstructorUser({
    email: 'cmendoza@sena.edu.co',
    fullName: 'Carlos Mendoza',
  });
  return { instructor, token: auth(instructor) };
}

const createCategory = (name = 'Herramientas de taller') =>
  prismaTest.category.create({ data: { name } });

const countItems = () => prismaTest.item.count();

const serializablePayload = (categoryId, overrides = {}) => ({
  code: 'TAL-001',
  name: 'Taladro',
  categoryId,
  ...overrides,
});

const consumablePayload = (categoryId, overrides = {}) => ({
  code: 'PINT-001',
  name: 'Pintura',
  categoryId,
  isConsumable: true,
  unit: 'LITRO',
  ownership: 'DONATED',
  initialQty: 100,
  ...overrides,
});

describe('Módulo 04 — Ítems (US-ITE-01 y US-ITE-02)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-ITE-01 — Registrar un elemento serializable
  // ---------------------------------------------------------------------------------
  describe('US-ITE-01 — Registrar un elemento serializable', () => {
    it('AC-ITE-01-1 — Un serializable con nombre y categoría queda en el catálogo con stock 0', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(serializablePayload(category.id));

      expect(response.status).toBe(201);
      expect(response.body.data.item.code).toBe('TAL-001');
      expect(response.body.data.item.stock).toBe(0);

      const listResponse = await request(app)
        .get('/api/items')
        .set('Authorization', token);
      const stored = listResponse.body.data.data.find((item) => item.code === 'TAL-001');
      expect(stored).toBeDefined();
      expect(stored.stock).toBe(0);
      expect(stored.category.id).toBe(category.id);
    });

    it('AC-ITE-01-2 — Un elemento con categoría inexistente se rechaza sin crear nada', async () => {
      const { token } = await createAdminToken();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send({ code: 'TAL-404', name: 'Taladro fantasma', categoryId: 999999 });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(await prismaTest.item.count({ where: { code: 'TAL-404' } })).toBe(0);
    });

    it('AC-ITE-01-3 — Un serializable recién creado no tiene unidades ni seriales', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      // Aunque el cliente mande initialQty, RN-INV-40 prohíbe autogenerar seriales.
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(serializablePayload(category.id, { initialQty: 3 }));

      expect(response.status).toBe(201);
      expect(response.body.data.item.inventoryUnits).toHaveLength(0);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId: response.body.data.item.id } }))
        .toBe(0);
    });

    it('AC-ITE-01-4 — El instructor no puede registrar elementos (403 sin efectos)', async () => {
      const { token } = await createInstructorToken();
      const category = await createCategory();
      const before = await countItems();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(serializablePayload(category.id));

      expect(response.status).toBe(403);
      expect(await countItems()).toBe(before);
    });

    it('AC-ITE-01-5 — El listado de elementos es paginado y devuelve el total', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();
      await prismaTest.item.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          code: `ITEM-${index + 1}`,
          name: `Elemento ${index + 1}`,
          categoryId: category.id,
        })),
      });

      const response = await request(app)
        .get('/api/items?page=1&limit=10')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(10);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-ITE-02 — Registrar un elemento consumible
  // ---------------------------------------------------------------------------------
  describe('US-ITE-02 — Registrar un elemento consumible', () => {
    it('AC-ITE-02-1 — Un consumible con unidad y cantidad inicial queda con ese stock y cero unidades', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(consumablePayload(category.id));

      expect(response.status).toBe(201);
      const item = response.body.data.item;
      expect(item.isConsumable).toBe(true);
      expect(item.unit).toBe('LITRO');
      expect(item.stock).toBe(100);
      expect(item.inventoryUnits).toHaveLength(0);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId: item.id } })).toBe(0);
    });

    it('AC-ITE-02-2 — Un consumible sin unidad de medida se rechaza y la respuesta lo indica', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();
      const before = await countItems();

      const payload = consumablePayload(category.id);
      delete payload.unit;

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(payload);

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain('unidad de medida');
      expect(await countItems()).toBe(before);
    });

    it('AC-ITE-02-3 — El instructor no puede registrar consumibles (403 sin efectos)', async () => {
      const { token } = await createInstructorToken();
      const category = await createCategory();
      const before = await countItems();

      const response = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(consumablePayload(category.id));

      expect(response.status).toBe(403);
      expect(await countItems()).toBe(before);
    });

    it('AC-ITE-02-4 — Solo un elemento donado se registra como consumible', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      // Tenencia SENA: se rechaza y no queda consumible creado.
      const senaResponse = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(consumablePayload(category.id, { code: 'PINT-SENA', ownership: 'SENA' }));
      expect(senaResponse.status).toBeGreaterThanOrEqual(400);
      expect(senaResponse.status).toBeLessThan(500);
      expect(await prismaTest.item.count({ where: { code: 'PINT-SENA' } })).toBe(0);

      // Tenencia donada: se acepta como consumible.
      const donatedResponse = await request(app)
        .post('/api/items')
        .set('Authorization', token)
        .send(consumablePayload(category.id, { code: 'PINT-DON', ownership: 'DONATED' }));
      expect(donatedResponse.status).toBe(201);
      expect(donatedResponse.body.data.item.isConsumable).toBe(true);
      expect(donatedResponse.body.data.item.ownership).toBe('DONATED');
      expect(donatedResponse.body.data.item.stock).toBe(100);
      expect(donatedResponse.body.data.item.inventoryUnits).toHaveLength(0);
    });

    it('AC-ITE-02-5 — Cada consumible declara su propio umbral y sin umbral no alerta', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();
      await prismaTest.item.createMany({
        data: [
          // Umbral 5 con 3 disponibles: alerta.
          {
            code: 'CON-ALERTA',
            name: 'Limpiador',
            categoryId: category.id,
            isConsumable: true,
            ownership: 'DONATED',
            unit: 'FRASCO',
            stock: 3,
            minStock: 5,
          },
          // Umbral 10 con 20 disponibles: no alerta.
          {
            code: 'CON-OK',
            name: 'Cinta',
            categoryId: category.id,
            isConsumable: true,
            ownership: 'DONATED',
            unit: 'ROLLO',
            stock: 20,
            minStock: 10,
          },
          // Sin umbral y con stock 0: no alerta ni recibe valor por defecto.
          {
            code: 'CON-SIN-UMBRAL',
            name: 'Estaño',
            categoryId: category.id,
            isConsumable: true,
            ownership: 'DONATED',
            unit: 'METRO',
            stock: 0,
            minStock: null,
          },
        ],
      });

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      const codes = response.body.data.data.map((item) => item.code);
      expect(codes).toContain('CON-ALERTA');
      expect(codes).not.toContain('CON-OK');
      expect(codes).not.toContain('CON-SIN-UMBRAL');

      const alertItem = response.body.data.data.find((item) => item.code === 'CON-ALERTA');
      expect(alertItem.availableStock).toBe(3);
      expect(alertItem.minStock).toBe(5);
    });
  });
});
