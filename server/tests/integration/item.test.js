import request from 'supertest';
import express from 'express';
import itemRoutes from '../../src/routes/item.routes.js';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import requestRoutes from '../../src/routes/request.routes.js';
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
  app.use('/api/requests', requestRoutes);
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

let serialSequence = 0;
async function createUnit(itemId, overrides = {}) {
  serialSequence += 1;
  return prismaTest.inventoryUnit.create({
    data: {
      itemId,
      serialNumber: `SN-${Date.now()}-${serialSequence}`,
      status: 'AVAILABLE',
      ...overrides,
    },
  });
}


async function createItemRecord(overrides = {}) {
  const category = await prismaTest.category.create({
    data: { name: `Categoría ${overrides.code || Date.now()}` },
  });
  return prismaTest.item.create({
    data: {
      code: `BASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: 'Elemento base',
      categoryId: category.id,
      ...overrides,
    },
  });
}

const createItemApi = (token, payload) =>
  request(app).post('/api/items').set('Authorization', token).send(payload);

const getItemApi = (token, id) =>
  request(app).get(`/api/items/${id}`).set('Authorization', token);


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

  // ---------------------------------------------------------------------------------
  // US-ITE-03 — Definir la composición de un elemento compuesto
  // ---------------------------------------------------------------------------------
  describe('US-ITE-03 — Definir la composición', () => {
    it('AC-ITE-03-1 — Un compuesto se registra declarando sus componentes en el alta', async () => {
      const { token } = await createAdminToken();
      const first = await createItemRecord();
      const second = await createItemRecord();

      const response = await createItemApi(token, {
        code: 'KIT-001',
        name: 'Kit de taller',
        categoryId: first.categoryId,
        components: [{ childItemId: first.id }, { childItemId: second.id }],
      });

      expect(response.status).toBe(201);
      const itemId = response.body.data.item.id;

      const composition = await getItemApi(token, itemId);
      expect(composition.status).toBe(200);
      const childIds = composition.body.data.item.components
        .map((component) => component.childItemId)
        .sort();
      expect(childIds).toEqual([first.id, second.id].sort());
    });

    it('AC-ITE-03-2 — Un componente puede repetirse en la composición', async () => {
      const { token } = await createAdminToken();
      const child = await createItemRecord();

      const response = await createItemApi(token, {
        code: 'KIT-REP',
        name: 'Kit repetido',
        categoryId: child.categoryId,
        components: [{ childItemId: child.id }, { childItemId: child.id }],
      });

      expect(response.status).toBe(201);
      const composition = await getItemApi(token, response.body.data.item.id);
      const component = composition.body.data.item.components.find(
        (row) => row.childItemId === child.id
      );
      expect(component).toBeDefined();
      // Repetición representada como cantidad (RN-INV-23 admite cantidad o filas).
      expect(component.quantity).toBe(2);
    });

    it('AC-ITE-03-3 — Un elemento no puede ser componente de sí mismo', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      const compound = await createItemApi(token, {
        code: 'KIT-SELF',
        name: 'Kit autorreferente',
        categoryId: category.id,
      });
      const itemId = compound.body.data.item.id;

      // La creación no puede expresar autorreferencia (el id aún no existe): el invariante
      // se verifica al editar la composición del mismo elemento.
      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', token)
        .send({ components: [{ childItemId: itemId }] });

      expect(response.status).toBe(400);
      const composition = await getItemApi(token, itemId);
      expect(composition.body.data.item.components).toHaveLength(0);
    });

    it('AC-ITE-03-4 — Un componente que no está en el catálogo se rechaza sin crear el compuesto', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      const response = await createItemApi(token, {
        code: 'KIT-INEXISTENTE',
        name: 'Kit imposible',
        categoryId: category.id,
        components: [{ childItemId: 999999 }],
      });

      expect(response.status).toBe(404);
      expect(await prismaTest.item.count({ where: { code: 'KIT-INEXISTENTE' } })).toBe(0);
    });

    it('AC-ITE-03-5 — Un consumible puede ser componente de un compuesto', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();
      const consumable = await createItemApi(token, {
        code: 'CON-COMP',
        name: 'Limpiador',
        categoryId: category.id,
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'FRASCO',
        initialQty: 5,
      });
      expect(consumable.status).toBe(201);

      const response = await createItemApi(token, {
        code: 'KIT-CON',
        name: 'Kit con consumible',
        categoryId: category.id,
        components: [{ childItemId: consumable.body.data.item.id }],
      });
      expect(response.status).toBe(201);

      const composition = await getItemApi(token, response.body.data.item.id);
      const component = composition.body.data.item.components.find(
        (row) => row.childItemId === consumable.body.data.item.id
      );
      expect(component).toBeDefined();
      expect(component.childItem.isConsumable).toBe(true);
    });

    it('AC-ITE-03-6 — Un componente puede quedar marcado como opcional', async () => {
      const { token } = await createAdminToken();
      const first = await createItemRecord();
      const second = await createItemRecord();
      const optional = await createItemRecord();

      const response = await createItemApi(token, {
        code: 'KIT-OPT',
        name: 'Kit con opcional',
        categoryId: first.categoryId,
        components: [
          { childItemId: first.id },
          { childItemId: second.id },
          { childItemId: optional.id, isRequired: false },
        ],
      });
      expect(response.status).toBe(201);

      const composition = await getItemApi(token, response.body.data.item.id);
      const rows = composition.body.data.item.components;
      expect(rows.find((row) => row.childItemId === optional.id).isOptional).toBe(true);
      expect(rows.find((row) => row.childItemId === first.id).isOptional).toBe(false);
      expect(rows.find((row) => row.childItemId === second.id).isOptional).toBe(false);
    });

    it('AC-ITE-03-7 — Un compuesto puede ser componente de otro compuesto', async () => {
      const { token } = await createAdminToken();
      const innerChild = await createItemRecord();

      const inner = await createItemApi(token, {
        code: 'KIT-INNER',
        name: 'Conjunto interno',
        categoryId: innerChild.categoryId,
        components: [{ childItemId: innerChild.id }],
      });
      expect(inner.status).toBe(201);

      const outer = await createItemApi(token, {
        code: 'KIT-OUTER',
        name: 'Conjunto externo',
        categoryId: innerChild.categoryId,
        components: [{ childItemId: inner.body.data.item.id }],
      });
      expect(outer.status).toBe(201);

      const composition = await getItemApi(token, outer.body.data.item.id);
      const component = composition.body.data.item.components.find(
        (row) => row.childItemId === inner.body.data.item.id
      );
      expect(component).toBeDefined();
    });

    it('AC-ITE-03-8 — Una composición que cerraría un ciclo indirecto se rechaza', async () => {
      const { token } = await createAdminToken();
      const child = await createItemRecord();

      // B contiene a A; agregar B como componente de A cerraría A → B → A.
      const a = await createItemApi(token, {
        code: 'KIT-A',
        name: 'Compuesto A',
        categoryId: child.categoryId,
      });
      const aId = a.body.data.item.id;

      const b = await createItemApi(token, {
        code: 'KIT-B',
        name: 'Compuesto B',
        categoryId: child.categoryId,
        components: [{ childItemId: aId }],
      });
      expect(b.status).toBe(201);
      const bId = b.body.data.item.id;

      const response = await request(app)
        .put(`/api/items/${aId}`)
        .set('Authorization', token)
        .send({ components: [{ childItemId: bId }] });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);

      const composition = await getItemApi(token, aId);
      expect(composition.body.data.item.components).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-ITE-04 — Consultar la composición
  // ---------------------------------------------------------------------------------
  describe('US-ITE-04 — Consultar la composición', () => {
    it('AC-ITE-04-1 — La consulta devuelve todos los componentes y su opcionalidad', async () => {
      const { token } = await createAdminToken();
      const first = await createItemRecord();
      const second = await createItemRecord();
      const optional = await createItemRecord();

      const compound = await createItemApi(token, {
        code: 'KIT-COMP-1',
        name: 'Kit completo',
        categoryId: first.categoryId,
        components: [
          { childItemId: first.id },
          { childItemId: second.id },
          { childItemId: optional.id, isRequired: false },
        ],
      });
      expect(compound.status).toBe(201);

      const composition = await getItemApi(token, compound.body.data.item.id);
      const rows = composition.body.data.item.components;
      expect(rows).toHaveLength(3);
      rows.forEach((row) => expect(typeof row.isOptional).toBe('boolean'));
      expect(rows.filter((row) => row.isOptional)).toHaveLength(1);
    });

    it('AC-ITE-04-2 — La consulta distingue el consumible del componente serializado', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();
      const serialized = await createItemRecord({ categoryId: category.id });
      const consumable = await createItemApi(token, {
        code: 'CON-DIST',
        name: 'Cinta',
        categoryId: category.id,
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'ROLLO',
        initialQty: 10,
      });
      expect(consumable.status).toBe(201);

      const compound = await createItemApi(token, {
        code: 'KIT-MIX',
        name: 'Kit mixto',
        categoryId: category.id,
        components: [
          { childItemId: serialized.id },
          { childItemId: consumable.body.data.item.id },
        ],
      });
      expect(compound.status).toBe(201);

      const composition = await getItemApi(token, compound.body.data.item.id);
      const rows = composition.body.data.item.components;
      const consumableRow = rows.find(
        (row) => row.childItemId === consumable.body.data.item.id
      );
      const serializedRow = rows.find((row) => row.childItemId === serialized.id);
      expect(consumableRow.childItem.isConsumable).toBe(true);
      expect(serializedRow.childItem.isConsumable).toBe(false);
    });

    it('AC-ITE-04-3 — Un componente presente pero agotado figura como presente', async () => {
      const { token } = await createAdminToken();
      const exhausted = await createItemRecord({ stock: 0 });
      const compound = await createItemApi(token, {
        code: 'KIT-AGOTADO',
        name: 'Kit con componente agotado',
        categoryId: exhausted.categoryId,
        components: [{ childItemId: exhausted.id }],
      });
      expect(compound.status).toBe(201);

      const composition = await getItemApi(token, compound.body.data.item.id);
      const row = composition.body.data.item.components.find(
        (component) => component.childItemId === exhausted.id
      );
      expect(row).toBeDefined();
      // Presencia ≠ funcionamiento: agotado no es faltante.
      expect(row.missing).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------------
  // US-ITE-05 — Editar la composición
  // ---------------------------------------------------------------------------------
  describe('US-ITE-05 — Editar la composición', () => {
    it('AC-ITE-05-1 — El administrador agrega un componente a una composición existente', async () => {
      const { token } = await createAdminToken();
      const existing = await createItemRecord();
      const added = await createItemRecord();

      const compound = await createItemApi(token, {
        code: 'KIT-EDIT',
        name: 'Kit editable',
        categoryId: existing.categoryId,
        components: [{ childItemId: existing.id }],
      });
      expect(compound.status).toBe(201);
      const itemId = compound.body.data.item.id;

      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', token)
        .send({
          components: [{ childItemId: existing.id }, { childItemId: added.id }],
        });
      expect(response.status).toBe(200);

      const composition = await getItemApi(token, itemId);
      const childIds = composition.body.data.item.components.map(
        (component) => component.childItemId
      );
      expect(childIds.sort()).toEqual([existing.id, added.id].sort());
    });

    it('AC-ITE-05-3 — Quitar un componente con unidades ensambladas se rechaza', async () => {
      const { token } = await createAdminToken();
      const component = await createItemRecord();

      const compound = await createItemApi(token, {
        code: 'KIT-ENSAMBLADO',
        name: 'Kit ensamblado',
        categoryId: component.categoryId,
        components: [{ childItemId: component.id }],
      });
      expect(compound.status).toBe(201);
      const itemId = compound.body.data.item.id;

      const parentUnit = await prismaTest.inventoryUnit.create({
        data: { itemId, serialNumber: 'KIT-U-001', status: 'AVAILABLE' },
      });
      const childUnit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: component.id,
          serialNumber: 'KIT-C-001',
          status: 'AVAILABLE',
          parentUnitId: parentUnit.id,
        },
      });

      const response = await request(app)
        .put(`/api/items/${itemId}`)
        .set('Authorization', token)
        .send({ components: [] });

      expect(response.status).toBe(409);

      const composition = await getItemApi(token, itemId);
      expect(
        composition.body.data.item.components.some(
          (row) => row.childItemId === component.id
        )
      ).toBe(true);

      const childAfter = await prismaTest.inventoryUnit.findUnique({
        where: { id: childUnit.id },
      });
      expect(childAfter.parentUnitId).toBe(parentUnit.id);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-ITE-06 — Dar de baja un elemento del catálogo
  // ---------------------------------------------------------------------------------
  describe('US-ITE-06 — Baja del elemento', () => {
    it('AC-ITE-06-1 — Se da de baja un elemento sin unidades comprometidas y no desaparece del catálogo', async () => {
      const { token } = await createAdminToken();
      const { token: instructorToken } = await createInstructorToken();
      const category = await createCategory();

      const created = await createItemApi(token, {
        code: 'BAJA-1',
        name: 'Elemento a dar de baja',
        categoryId: category.id,
      });
      expect(created.status).toBe(201);
      const itemId = created.body.data.item.id;
      const unit = await createUnit(itemId);

      const response = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', token);
      expect(response.status).toBe(200);

      // Sigue en el catálogo con su estado y cuenta en el total (RN-INV-45).
      const listResponse = await request(app)
        .get('/api/items')
        .set('Authorization', token);
      const listed = listResponse.body.data.data.find((item) => item.id === itemId);
      expect(listed).toBeDefined();
      expect(listed.isActive).toBe(false);
      expect(listResponse.body.data.meta.total).toBeGreaterThanOrEqual(1);

      // Sus unidades siguen figurando en inventario (RN-INV-16).
      const inventoryResponse = await request(app)
        .get('/api/inventory')
        .set('Authorization', token);
      const unitListed = inventoryResponse.body.data.data.find(
        (row) => row.id === unit.id
      );
      expect(unitListed).toBeDefined();

      // Deja de ofrecerse: una solicitud nueva con el elemento se rechaza.
      const requestResponse = await request(app)
        .post('/api/requests')
        .set('Authorization', instructorToken)
        .send({ items: [{ itemId, requestedQty: 1 }] });
      expect(requestResponse.status).toBeGreaterThanOrEqual(400);
      expect(requestResponse.status).toBeLessThan(500);
      expect(await prismaTest.request.count()).toBe(0);
    });

    it('AC-ITE-06-2 — La baja se rechaza con unidades comprometidas y se acepta con la unidad declarada perdida', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      // Escenario 1: unidad prestada.
      const loaned = await createItemApi(token, {
        code: 'BAJA-LOANED',
        name: 'Con unidad prestada',
        categoryId: category.id,
      });
      const loanedUnit = await createUnit(loaned.body.data.item.id, { status: 'LOANED' });
      const loanedResponse = await request(app)
        .delete(`/api/items/${loaned.body.data.item.id}`)
        .set('Authorization', token);
      expect(loanedResponse.status).toBe(409);
      const loanedAfter = await getItemApi(token, loaned.body.data.item.id);
      expect(loanedAfter.body.data.item.isActive).toBe(true);
      expect((await prismaTest.inventoryUnit.findUnique({ where: { id: loanedUnit.id } })).status)
        .toBe('LOANED');

      // Escenario 2: unidad reservada.
      const reserved = await createItemApi(token, {
        code: 'BAJA-RESERVED',
        name: 'Con unidad reservada',
        categoryId: category.id,
      });
      const reservedUnit = await createUnit(reserved.body.data.item.id, { status: 'RESERVED' });
      const reservedResponse = await request(app)
        .delete(`/api/items/${reserved.body.data.item.id}`)
        .set('Authorization', token);
      expect(reservedResponse.status).toBe(409);
      expect((await prismaTest.inventoryUnit.findUnique({ where: { id: reservedUnit.id } })).status)
        .toBe('RESERVED');

      // Escenario 3: la única unidad fue declarada perdida (sale del inventario activo,
      // RN-PRE-15) → no está comprometida y la baja se acepta.
      const lost = await createItemApi(token, {
        code: 'BAJA-VOLUNTARIA',
        name: 'Con unidad declarada perdida',
        categoryId: category.id,
      });
      const lostUnit = await createUnit(lost.body.data.item.id);
      await prismaTest.inventoryUnit.update({
        where: { id: lostUnit.id },
        data: { status: 'DISPOSED', physicalState: 'DADO_DE_BAJA' },
      });
      const lostResponse = await request(app)
        .delete(`/api/items/${lost.body.data.item.id}`)
        .set('Authorization', token);
      expect(lostResponse.status).toBe(200);
      const lostAfter = await getItemApi(token, lost.body.data.item.id);
      expect(lostAfter.body.data.item.isActive).toBe(false);

      // Mezcla: una unidad perdida no anula el bloqueo de otra prestada.
      const mixed = await createItemApi(token, {
        code: 'BAJA-MIXTA',
        name: 'Con una perdida y una prestada',
        categoryId: category.id,
      });
      const mixedLost = await createUnit(mixed.body.data.item.id);
      await prismaTest.inventoryUnit.update({
        where: { id: mixedLost.id },
        data: { status: 'DISPOSED', physicalState: 'DADO_DE_BAJA' },
      });
      await createUnit(mixed.body.data.item.id, { status: 'LOANED' });
      const mixedResponse = await request(app)
        .delete(`/api/items/${mixed.body.data.item.id}`)
        .set('Authorization', token);
      expect(mixedResponse.status).toBe(409);
    });

    it('AC-ITE-06-3 — Un elemento dado de baja sigue siendo consultable', async () => {
      const { token } = await createAdminToken();
      const category = await createCategory();

      const created = await createItemApi(token, {
        code: 'BAJA-CONSULTA',
        name: 'Consultable tras baja',
        categoryId: category.id,
      });
      const itemId = created.body.data.item.id;

      const baja = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', token);
      expect(baja.status).toBe(200);

      const response = await getItemApi(token, itemId);
      expect(response.status).toBe(200);
      expect(response.body.data.item.code).toBe('BAJA-CONSULTA');
      expect(response.body.data.item.isActive).toBe(false);

      // Reintentar la baja es idempotente: no duplica ni borra el registro.
      const secondBaja = await request(app)
        .delete(`/api/items/${itemId}`)
        .set('Authorization', token);
      expect(secondBaja.status).toBe(200);

      // No existe borrado físico del elemento (RN-INV-45).
      const hardResponse = await request(app)
        .delete(`/api/items/${itemId}/hard`)
        .set('Authorization', token);
      expect(hardResponse.status).toBe(404);
      expect(await prismaTest.item.count({ where: { id: itemId } })).toBe(1);
    });
  });
});
