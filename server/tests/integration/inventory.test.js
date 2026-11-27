import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import requestRoutes from '../../src/routes/request.routes.js';
import itemRoutes from '../../src/routes/item.routes.js';
import catalogRoutes from '../../src/routes/catalog.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/items', itemRoutes);
  app.use('/api/catalog', catalogRoutes);
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
          physicalState: 'OPERATIVO',
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
          physicalState: 'OPERATIVO',
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
    it('debe rechazar el alta sin serial: el sistema no autogenera seriales', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain('serial');
    });

    it('debe rechazar un serial formado solo por espacios', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: '   ' });

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain('serial');
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
          physicalState: 'OPERATIVO',
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
        .send({ itemId: 99999, serialNumber: 'SER-ITEM-INEXISTENTE' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('debe rechazar crear unidad si el ambiente no existe', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, environmentId: 99999, serialNumber: 'SER-AMB-INEXISTENTE' });

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
          physicalState: 'OPERATIVO',
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
          physicalState: 'OPERATIVO',
        },
      });

      const response = await request(app)
        .put(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin))
        .send({
          environmentId: environment.id,
          status: 'MAINTENANCE',
          physicalState: 'AVERIADO',
          notes: 'Requiere reparación',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.unit.environmentId).toBe(environment.id);
      expect(response.body.data.unit.status).toBe('MAINTENANCE');
      expect(response.body.data.unit.physicalState).toBe('AVERIADO');
      expect(response.body.data.unit.notes).toBe('Requiere reparación');
    });

    it('debe prohibir actualizar a un instructor', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-001',
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
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
          physicalState: 'OPERATIVO',
          ownership: 'DONATED',
        },
      });

      const response = await request(app)
        .delete(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Baja directa de donada' });

      expect(response.status).toBe(200);
      expect(response.body.data.unit.status).toBe('DISPOSED');

      const stillExists = await prismaTest.inventoryUnit.findUnique({
        where: { id: unit.id },
      });
      expect(stillExists).not.toBeNull();
      expect(stillExists.status).toBe('DISPOSED');
    });

    it('debe restablecer una unidad dada de baja', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-004',
          status: 'DISPOSED',
          physicalState: 'DADO_DE_BAJA',
        },
      });

      const response = await request(app)
        .post(`/api/inventory/${unit.id}/restore`)
        .set('Authorization', authHeader(admin));

      expect(response.status).toBe(200);
      expect(response.body.data.unit.status).toBe('AVAILABLE');
      expect(response.body.data.unit.physicalState).toBe('OPERATIVO');
    });

    it('debe eliminar permanentemente una unidad como admin', async () => {
      const unit = await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'LAPTOP-001-002',
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
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
          physicalState: 'OPERATIVO',
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
          physicalState: 'DADO_DE_BAJA',
        },
      });

      const response = await request(app)
        .delete(`/api/inventory/${unit.id}`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Intento repetido' });

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
          physicalState: 'OPERATIVO',
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
          physicalState: 'OPERATIVO',
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

  // ---------------------------------------------------------------------------------
  // US-INV-01 — Registrar una unidad serializada (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-01 — Registrar una unidad serializada', () => {
    const countUnits = (itemId) =>
      prismaTest.inventoryUnit.count({ where: itemId ? { itemId } : {} });

    it('AC-INV-01-1 — Una unidad con serial nuevo queda en el inventario del elemento', async () => {
      const before = await countUnits(item.id);

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: 'SER-NUEVO-1' });

      expect(response.status).toBe(201);
      const unit = response.body.data.unit;
      expect(unit.itemId).toBe(item.id);
      expect(unit.serialNumber).toBe('SER-NUEVO-1');
      expect(unit.physicalState).toBe('OPERATIVO');
      expect(await countUnits(item.id)).toBe(before + 1);

      const list = await request(app)
        .get('/api/inventory')
        .query({ itemId: item.id })
        .set('Authorization', authHeader(admin));
      expect(list.status).toBe(200);
      expect(list.body.data.data.some((row) => row.serialNumber === 'SER-NUEVO-1')).toBe(true);
    });

    it('AC-INV-01-2 — Un serial ya registrado se rechaza sin crear una segunda unidad', async () => {
      await prismaTest.inventoryUnit.create({
        data: {
          itemId: item.id,
          serialNumber: 'SER-DUPLICADO',
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
        },
      });
      const before = await countUnits();

      const sameItem = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: 'SER-DUPLICADO' });
      expect(sameItem.status).toBe(409);
      expect(JSON.stringify(sameItem.body).toLowerCase()).toContain('serial');

      const otherItem = await prismaTest.item.create({
        data: { code: 'OTRO-001', name: 'Otro elemento', categoryId: category.id },
      });
      const otherResponse = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: otherItem.id, serialNumber: 'SER-DUPLICADO' });
      expect(otherResponse.status).toBe(409);

      expect(await countUnits()).toBe(before);
    });

    it('AC-INV-01-3 — Un serial vacío o de solo espacios se rechaza', async () => {
      const before = await countUnits(item.id);

      for (const serialNumber of ['', '   ']) {
        const response = await request(app)
          .post('/api/inventory')
          .set('Authorization', authHeader(admin))
          .send({ itemId: item.id, serialNumber });
        expect(response.status).toBe(400);
        expect(JSON.stringify(response.body).toLowerCase()).toContain('serial');
      }

      expect(await countUnits(item.id)).toBe(before);
    });

    it('AC-INV-01-4 — Un elemento inexistente se rechaza', async () => {
      const before = await countUnits();

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: 999999, serialNumber: 'SER-HUERFANO' });

      expect(response.status).toBe(404);
      expect(await countUnits()).toBe(before);
      expect(await prismaTest.item.count({ where: { code: 'SER-HUERFANO' } })).toBe(0);
    });

    it('AC-INV-01-5 — El instructor no puede registrar unidades', async () => {
      const before = await countUnits(item.id);

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(instructor))
        .send({ itemId: item.id, serialNumber: 'SER-INSTRUCTOR' });

      expect(response.status).toBe(403);
      expect(await countUnits(item.id)).toBe(before);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-02 — Ensamblar un equipo compuesto (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-02 — Ensamblaje de compuestos', () => {
    const createCompound = async (name, components) => {
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

    const createUnitFor = (targetItem, serial) =>
      prismaTest.inventoryUnit.create({
        data: {
          itemId: targetItem.id,
          serialNumber: serial,
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
        },
      });

    const assemble = (parentId, childUnitIds) =>
      request(app)
        .post(`/api/inventory/${parentId}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds });

    const detail = (unitId) =>
      request(app).get(`/api/inventory/${unitId}/detail`).set('Authorization', authHeader(admin));

    it('AC-INV-02-1 — El ensamblaje de todos los obligatorios deja la unidad completa', async () => {
      const first = await prismaTest.item.create({
        data: { code: 'C1', name: 'Componente 1', categoryId: category.id },
      });
      const second = await prismaTest.item.create({
        data: { code: 'C2', name: 'Componente 2', categoryId: category.id },
      });
      const compound = await createCompound('Compuesto completo', [
        { item: first },
        { item: second },
      ]);
      const parentUnit = await createUnitFor(compound, 'CMP-U-001');
      const childOne = await createUnitFor(first, 'CMP-C-001');
      const childTwo = await createUnitFor(second, 'CMP-C-002');

      const response = await assemble(parentUnit.id, [childOne.id, childTwo.id]);
      expect(response.status).toBe(200);

      const children = await prismaTest.inventoryUnit.findMany({
        where: { parentUnitId: parentUnit.id },
      });
      expect(children).toHaveLength(2);
      const detailResponse = await detail(parentUnit.id);
      expect(detailResponse.body.data.unit.isComplete).toBe(true);
    });

    it('AC-INV-02-2 — El ensamblaje parcial se acepta y deja la unidad incompleta', async () => {
      const first = await prismaTest.item.create({
        data: { code: 'P1', name: 'Pieza 1', categoryId: category.id },
      });
      const second = await prismaTest.item.create({
        data: { code: 'P2', name: 'Pieza 2', categoryId: category.id },
      });
      const missing = await prismaTest.item.create({
        data: { code: 'P3', name: 'Pieza 3', categoryId: category.id },
      });
      const compound = await createCompound('Compuesto parcial', [
        { item: first },
        { item: second },
        { item: missing },
      ]);
      const parentUnit = await createUnitFor(compound, 'PAR-U-001');
      const childOne = await createUnitFor(first, 'PAR-C-001');
      const childTwo = await createUnitFor(second, 'PAR-C-002');

      const response = await assemble(parentUnit.id, [childOne.id, childTwo.id]);
      expect(response.status).toBe(200);

      const detailResponse = await detail(parentUnit.id);
      expect(detailResponse.body.data.unit.isComplete).toBe(false);
      const missingIds = detailResponse.body.data.unit.missingComponents.map(
        (component) => component.childItemId
      );
      expect(missingIds).toContain(missing.id);
    });

    it('AC-INV-02-3 — Un componente que no pertenece al compuesto se rechaza sin ensamblar', async () => {
      const valid = await prismaTest.item.create({
        data: { code: 'V1', name: 'Válido', categoryId: category.id },
      });
      const invalid = await prismaTest.item.create({
        data: { code: 'I1', name: 'Ajeno', categoryId: category.id },
      });
      const compound = await createCompound('Compuesto atómico', [{ item: valid }]);
      const parentUnit = await createUnitFor(compound, 'ATO-U-001');
      const validUnit = await createUnitFor(valid, 'ATO-C-001');
      const invalidUnit = await createUnitFor(invalid, 'ATO-C-002');

      const response = await assemble(parentUnit.id, [validUnit.id, invalidUnit.id]);
      expect(response.status).toBe(400);

      const units = await prismaTest.inventoryUnit.findMany({
        where: { id: { in: [validUnit.id, invalidUnit.id] } },
      });
      units.forEach((unit) => expect(unit.parentUnitId).toBeNull());
    });

    it('AC-INV-02-4 — Un componente que ya está dentro de otro equipo se rechaza', async () => {
      const componentItem = await prismaTest.item.create({
        data: { code: 'D1', name: 'Componente compartido', categoryId: category.id },
      });
      const secondCompound = await createCompound('Otro compuesto', [
        { item: componentItem },
      ]);
      const firstCompound = await createCompound('Compuesto destino', [
        { item: componentItem },
      ]);
      const otherParent = await createUnitFor(secondCompound, 'OTRO-P-001');
      const componentUnit = await createUnitFor(componentItem, 'OTRO-C-001');
      await prismaTest.inventoryUnit.update({
        where: { id: componentUnit.id },
        data: { parentUnitId: otherParent.id },
      });
      const targetParent = await createUnitFor(firstCompound, 'DEST-P-001');

      const response = await assemble(targetParent.id, [componentUnit.id]);
      expect(response.status).toBe(409);

      const stored = await prismaTest.inventoryUnit.findUnique({
        where: { id: componentUnit.id },
      });
      expect(stored.parentUnitId).toBe(otherParent.id);
    });

    it('AC-INV-02-5 — Un componente prestado se rechaza sin tocar el préstamo', async () => {
      const componentItem = await prismaTest.item.create({
        data: { code: 'L1', name: 'Componente prestado', categoryId: category.id },
      });
      const compound = await createCompound('Compuesto con prestado', [
        { item: componentItem },
      ]);
      const parentUnit = await createUnitFor(compound, 'PRE-P-001');
      const componentUnit = await createUnitFor(componentItem, 'PRE-C-001');
      await prismaTest.inventoryUnit.update({
        where: { id: componentUnit.id },
        data: { status: 'LOANED' },
      });

      const response = await assemble(parentUnit.id, [componentUnit.id]);
      expect(response.status).toBe(409);

      const stored = await prismaTest.inventoryUnit.findUnique({
        where: { id: componentUnit.id },
      });
      expect(stored.status).toBe('LOANED');
      expect(stored.parentUnitId).toBeNull();
    });

    it('AC-INV-02-6 — Los componentes de un conjunto comprometido no se ofrecen por separado', async () => {
      const first = await prismaTest.item.create({
        data: { code: 'K1', name: 'Pieza kit 1', categoryId: category.id },
      });
      const second = await prismaTest.item.create({
        data: { code: 'K2', name: 'Pieza kit 2', categoryId: category.id },
      });
      const compound = await createCompound('Kit comprometido', [
        { item: first },
        { item: second },
      ]);
      await createUnitFor(compound, 'KIT-U-001');
      const childOne = await createUnitFor(first, 'KIT-C-001');
      const childTwo = await createUnitFor(second, 'KIT-C-002');
      const parent = await prismaTest.inventoryUnit.findFirst({ where: { itemId: compound.id } });
      await assemble(parent.id, [childOne.id, childTwo.id]);

      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: compound.id, requestedQty: 1 }] });
      expect(created.status).toBe(201);

      const inventory = await request(app)
        .get('/api/inventory')
        .query({ itemId: first.id })
        .set('Authorization', authHeader(admin));
      const available = inventory.body.data.data.filter((row) => row.status === 'AVAILABLE');
      expect(available).toHaveLength(0);

      const stillAssembled = await prismaTest.inventoryUnit.findUnique({
        where: { id: childOne.id },
      });
      expect(stillAssembled.parentUnitId).toBe(parent.id);
    });

    it('AC-INV-02-7 — Un componente ensamblado no se cuenta dos veces', async () => {
      const first = await prismaTest.item.create({
        data: { code: 'N1', name: 'Pieza 1', categoryId: category.id },
      });
      const second = await prismaTest.item.create({
        data: { code: 'N2', name: 'Pieza 2', categoryId: category.id },
      });
      const compound = await createCompound('Compuesto solicitado', [
        { item: first },
        { item: second },
      ]);
      const parent = await createUnitFor(compound, 'SOL-U-001');
      const childOne = await createUnitFor(first, 'SOL-C-001');
      const childTwo = await createUnitFor(second, 'SOL-C-002');
      await assemble(parent.id, [childOne.id, childTwo.id]);

      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: compound.id, requestedQty: 1 }] });
      expect(created.status).toBe(201);
      const requestId = created.body.data.request.id;

      const assignments = await prismaTest.requestItemUnit.findMany({
        where: { requestItem: { requestId } },
      });
      const assignedIds = assignments.map((assignment) => assignment.inventoryUnitId).sort();
      expect(assignedIds).toEqual([parent.id, childOne.id, childTwo.id].sort());

      const units = await prismaTest.inventoryUnit.findMany({
        where: { id: { in: [childOne.id, childTwo.id] } },
      });
      units.forEach((unit) => expect(unit.status).toBe('RESERVED'));
    });

    it('AC-INV-02-8 — El aparato de un kit es un elemento independiente', async () => {
      const apparatus = await prismaTest.item.create({
        data: { code: 'APP-001', name: 'Aparato', categoryId: category.id },
      });
      const accessory = await prismaTest.item.create({
        data: { code: 'ACC-001', name: 'Accesorio', categoryId: category.id },
      });
      const kit = await createCompound('Kit con aparato', [
        { item: apparatus },
        { item: accessory },
      ]);
      const kitUnit = await createUnitFor(kit, 'KIT2-U-001');
      const apparatusUnit = await createUnitFor(apparatus, 'APP-U-001');
      const accessoryUnit = await createUnitFor(accessory, 'ACC-U-001');
      await assemble(kitUnit.id, [apparatusUnit.id, accessoryUnit.id]);

      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: apparatus.id, requestedQty: 1 }] });
      expect(created.status).toBe(201);

      const apparatusAfter = await prismaTest.inventoryUnit.findUnique({
        where: { id: apparatusUnit.id },
      });
      const accessoryAfter = await prismaTest.inventoryUnit.findUnique({
        where: { id: accessoryUnit.id },
      });
      expect(apparatusAfter.status).toBe('RESERVED');
      expect(accessoryAfter.status).toBe('AVAILABLE');
      expect(accessoryAfter.parentUnitId).toBe(kitUnit.id);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-03 — Desensamblar un componente (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-03 — Desensamblaje', () => {
    const setupAssembled = async () => {
      const first = await prismaTest.item.create({
        data: { code: `DA-${Date.now()}`, name: 'Pieza A', categoryId: category.id },
      });
      const second = await prismaTest.item.create({
        data: { code: `DB-${Date.now()}`, name: 'Pieza B', categoryId: category.id },
      });
      const compound = await prismaTest.item.create({
        data: { code: `DC-${Date.now()}`, name: 'Compuesto', categoryId: category.id },
      });
      await prismaTest.itemComponent.createMany({
        data: [
          { parentItemId: compound.id, childItemId: first.id },
          { parentItemId: compound.id, childItemId: second.id },
        ],
      });
      const parentUnit = await prismaTest.inventoryUnit.create({
        data: { itemId: compound.id, serialNumber: `DCP-${Date.now()}`, status: 'AVAILABLE' },
      });
      const childOne = await prismaTest.inventoryUnit.create({
        data: { itemId: first.id, serialNumber: `DAU-${Date.now()}`, status: 'AVAILABLE' },
      });
      const childTwo = await prismaTest.inventoryUnit.create({
        data: { itemId: second.id, serialNumber: `DBU-${Date.now()}`, status: 'AVAILABLE' },
      });
      await request(app)
        .post(`/api/inventory/${parentUnit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [childOne.id, childTwo.id] });
      return { compound, parentUnit, childOne, childTwo };
    };

    const disassemble = (parentId, childUnitIds) =>
      request(app)
        .post(`/api/inventory/${parentId}/disassemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds });

    it('AC-INV-03-1 — Desensamblar libera el componente y no arrastra al resto', async () => {
      const { parentUnit, childOne, childTwo } = await setupAssembled();

      const response = await disassemble(parentUnit.id, [childOne.id]);
      expect(response.status).toBe(200);

      const released = await prismaTest.inventoryUnit.findUnique({ where: { id: childOne.id } });
      const stillInside = await prismaTest.inventoryUnit.findUnique({ where: { id: childTwo.id } });
      expect(released.parentUnitId).toBeNull();
      expect(released.status).toBe('AVAILABLE');
      expect(stillInside.parentUnitId).toBe(parentUnit.id);
    });

    it('AC-INV-03-2 — No se puede desensamblar un equipo comprometido', async () => {
      // Reserva activa: la solicitud reserva el conjunto y sus piezas.
      const reservedSetup = await setupAssembled();
      const reserved = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: reservedSetup.compound.id, requestedQty: 1 }] });
      expect(reserved.status).toBe(201);

      const reservedAttempt = await disassemble(reservedSetup.parentUnit.id, [
        reservedSetup.childOne.id,
      ]);
      expect(reservedAttempt.status).toBe(409);
      const childAfterReservation = await prismaTest.inventoryUnit.findUnique({
        where: { id: reservedSetup.childOne.id },
      });
      expect(childAfterReservation.parentUnitId).toBe(reservedSetup.parentUnit.id);

      // Préstamo vigente: se entrega el conjunto y se intenta desensamblar.
      const loanSetup = await setupAssembled();
      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: loanSetup.compound.id, requestedQty: 1 }] });
      const loanRequestId = created.body.data.request.id;
      await request(app)
        .put(`/api/requests/${loanRequestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${loanRequestId}/pack`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${loanRequestId}/deliver`)
        .set('Authorization', authHeader(admin));

      const loanAttempt = await disassemble(loanSetup.parentUnit.id, [loanSetup.childOne.id]);
      expect(loanAttempt.status).toBe(409);
      const parentAfterLoan = await prismaTest.inventoryUnit.findUnique({
        where: { id: loanSetup.parentUnit.id },
      });
      expect(parentAfterLoan.status).toBe('LOANED');
    });

    it('AC-INV-03-3 — Desensamblar un obligatorio rompe la marca de completo', async () => {
      const { parentUnit, childOne } = await setupAssembled();

      const before = await request(app)
        .get(`/api/inventory/${parentUnit.id}/detail`)
        .set('Authorization', authHeader(admin));
      expect(before.body.data.unit.isComplete).toBe(true);

      const response = await disassemble(parentUnit.id, [childOne.id]);
      expect(response.status).toBe(200);

      const after = await request(app)
        .get(`/api/inventory/${parentUnit.id}/detail`)
        .set('Authorization', authHeader(admin));
      expect(after.body.data.unit.isComplete).toBe(false);
      const released = await prismaTest.inventoryUnit.findUnique({ where: { id: childOne.id } });
      expect(released.status).toBe('AVAILABLE');
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-04 — Controlar consumibles por cantidad (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-04 — Consumibles por cantidad', () => {
    const createConsumable = async (overrides = {}) => {
      const response = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader(admin))
        .send({
          code: `CON-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: 'Consumible',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'LITRO',
          initialQty: 100,
          ...overrides,
        });
      return response;
    };

    const getItem = (id) =>
      request(app).get(`/api/items/${id}`).set('Authorization', authHeader(admin));

    const adjustStock = (id, stock) =>
      request(app)
        .patch(`/api/items/${id}/stock`)
        .set('Authorization', authHeader(admin))
        .send({ stock });

    const createConsumableRequest = (itemId, requestedQty) =>
      request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId, requestedQty }] });

    it('AC-INV-04-1 — El stock parte de la cantidad inicial y sin unidades', async () => {
      const response = await createConsumable({ initialQty: 100 });
      expect(response.status).toBe(201);
      const itemId = response.body.data.item.id;

      const stored = await getItem(itemId);
      expect(stored.status).toBe(200);
      expect(stored.body.data.item.stock).toBe(100);
      expect(stored.body.data.item.unit).toBe('LITRO');
      expect(stored.body.data.item.isConsumable).toBe(true);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId } })).toBe(0);

      const list = await request(app)
        .get('/api/items')
        .set('Authorization', authHeader(admin));
      const consumables = list.body.data.data.filter((row) => row.isConsumable);
      expect(consumables.some((row) => row.id === itemId)).toBe(true);
    });

    it('AC-INV-04-2 — Un consumible no admite unidades serializadas', async () => {
      const created = await createConsumable({ initialQty: 100 });
      const itemId = created.body.data.item.id;

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId, serialNumber: 'NO-DEBE-EXISTIR' });

      expect(response.status).toBe(409);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId } })).toBe(0);
      const stored = await getItem(itemId);
      expect(stored.body.data.item.stock).toBe(100);
    });

    it('AC-INV-04-3 — El stock es la cantidad, no el conteo de unidades', async () => {
      const created = await createConsumable({ initialQty: 100 });
      const itemId = created.body.data.item.id;

      const stored = await getItem(itemId);
      expect(stored.body.data.item.stock).toBe(100);
      expect(stored.body.data.item.unit).toBe('LITRO');
      expect(stored.body.data.item.stock).not.toBe(0);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId } })).toBe(0);
    });

    it('AC-INV-04-4 — La entrega descuenta cantidad y empacar no descuenta', async () => {
      const created = await createConsumable({ initialQty: 100 });
      const itemId = created.body.data.item.id;

      const requestResponse = await createConsumableRequest(itemId, 2);
      expect(requestResponse.status).toBe(201);
      const requestId = requestResponse.body.data.request.id;

      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));
      const packed = await request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));
      expect(packed.status).toBe(200);
      expect((await getItem(itemId)).body.data.item.stock).toBe(100);

      // Un consumible no deja reserva por rango con fecha.
      expect(
        await prismaTest.requestItemUnit.count({
          where: { requestItem: { requestId } },
        })
      ).toBe(0);
      expect(
        await prismaTest.movement.count({ where: { requestId, type: 'RESERVATION' } })
      ).toBe(0);

      const delivered = await request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', authHeader(admin));
      expect(delivered.status).toBe(200);
      expect((await getItem(itemId)).body.data.item.stock).toBe(98);
      expect(await prismaTest.inventoryUnit.count({ where: { itemId } })).toBe(0);
    });

    it('AC-INV-04-5 — El stock no puede quedar negativo', async () => {
      const created = await createConsumable({ initialQty: 10 });
      const itemId = created.body.data.item.id;

      const response = await createConsumableRequest(itemId, 15);
      expect(response.status).toBe(409);
      expect((await getItem(itemId)).body.data.item.stock).toBe(10);

      const negative = await adjustStock(itemId, -1);
      expect(negative.status).toBe(400);
      expect((await getItem(itemId)).body.data.item.stock).toBe(10);
    });

    it('AC-INV-04-6 — Cada consumible conserva su propia unidad de medida', async () => {
      const liters = await createConsumable({ unit: 'LITRO', initialQty: 10 });
      const meters = await createConsumable({ unit: 'METRO', initialQty: 100 });

      const list = await request(app)
        .get('/api/items')
        .set('Authorization', authHeader(admin));
      const rows = list.body.data.data;
      const literRow = rows.find((row) => row.id === liters.body.data.item.id);
      const meterRow = rows.find((row) => row.id === meters.body.data.item.id);
      expect(literRow.unit).toBe('LITRO');
      expect(literRow.stock).toBe(10);
      expect(meterRow.unit).toBe('METRO');
      expect(meterRow.stock).toBe(100);
    });

    it('AC-INV-04-7 — Una cantidad decimal de consumible se rechaza', async () => {
      const created = await createConsumable({ initialQty: 100 });
      const itemId = created.body.data.item.id;

      const decimalRequest = await createConsumableRequest(itemId, 2.5);
      expect(decimalRequest.status).toBe(400);
      expect(JSON.stringify(decimalRequest.body).toLowerCase()).toMatch(/entero|integer/);
      expect((await getItem(itemId)).body.data.item.stock).toBe(100);

      const decimalStock = await adjustStock(itemId, 2.5);
      expect(decimalStock.status).toBe(400);
      expect((await getItem(itemId)).body.data.item.stock).toBe(100);
    });

    it('AC-INV-04-8 — La entrega se rechaza si la cantidad ya no existe', async () => {
      // Verificación al empacar: la cantidad bajó después de crear la solicitud.
      const packCase = await createConsumable({ initialQty: 5 });
      const packItemId = packCase.body.data.item.id;
      const packRequest = await createConsumableRequest(packItemId, 5);
      expect(packRequest.status).toBe(201);
      const packRequestId = packRequest.body.data.request.id;
      await adjustStock(packItemId, 2);
      await request(app)
        .put(`/api/requests/${packRequestId}/approve`)
        .set('Authorization', authHeader(admin));
      const packResponse = await request(app)
        .put(`/api/requests/${packRequestId}/pack`)
        .set('Authorization', authHeader(admin));
      expect(packResponse.status).toBe(409);
      expect((await getItem(packItemId)).body.data.item.stock).toBe(2);

      // Verificación al entregar: empaquetada con 5 y el stock baja antes de entregar.
      const deliverCase = await createConsumable({ initialQty: 5 });
      const deliverItemId = deliverCase.body.data.item.id;
      const deliverRequest = await createConsumableRequest(deliverItemId, 5);
      const deliverRequestId = deliverRequest.body.data.request.id;
      await request(app)
        .put(`/api/requests/${deliverRequestId}/approve`)
        .set('Authorization', authHeader(admin));
      expect(
        (
          await request(app)
            .put(`/api/requests/${deliverRequestId}/pack`)
            .set('Authorization', authHeader(admin))
        ).status
      ).toBe(200);
      await adjustStock(deliverItemId, 2);
      const deliverResponse = await request(app)
        .put(`/api/requests/${deliverRequestId}/deliver`)
        .set('Authorization', authHeader(admin));
      expect(deliverResponse.status).toBe(409);
      expect((await getItem(deliverItemId)).body.data.item.stock).toBe(2);
      const storedRequest = await prismaTest.request.findUnique({
        where: { id: deliverRequestId },
      });
      expect(storedRequest.status).not.toBe('DELIVERED');
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-05 — Integridad del conjunto (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-05 — Integridad del conjunto', () => {
    const createComposite = async (name, components) => {
      const compound = await prismaTest.item.create({
        data: { code: `INT-${Date.now()}-${Math.random()}`, name, categoryId: category.id },
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
    const unit = (targetItem, serial) =>
      prismaTest.inventoryUnit.create({
        data: { itemId: targetItem.id, serialNumber: serial, status: 'AVAILABLE', physicalState: 'OPERATIVO' },
      });
    const assemble = (parentId, childUnitIds) =>
      request(app)
        .post(`/api/inventory/${parentId}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds });
    const integrity = (unitId) =>
      request(app).get(`/api/inventory/${unitId}/detail`).set('Authorization', authHeader(admin));

    it('AC-INV-05-1 — Un conjunto completo se informa completo y un opcional ausente solo se documenta', async () => {
      const required = await prismaTest.item.create({
        data: { code: 'REQ-1', name: 'Obligatorio', categoryId: category.id },
      });
      const optional = await prismaTest.item.create({
        data: { code: 'OPT-1', name: 'Opcional', categoryId: category.id },
      });
      const compound = await createComposite('Con requerido y opcional', [
        { item: required },
        { item: optional, isRequired: false },
      ]);
      const parent = await unit(compound, 'INT-U-001');
      const requiredUnit = await unit(required, 'INT-R-001');
      await assemble(parent.id, [requiredUnit.id]);

      const response = await integrity(parent.id);
      expect(response.status).toBe(200);
      expect(response.body.data.unit.isComplete).toBe(true);
      expect(response.body.data.unit.missingComponents).toHaveLength(0);
      const optionalMissing = response.body.data.unit.optionalMissing;
      expect(optionalMissing.some((entry) => entry.childItemId === optional.id)).toBe(true);
    });

    it('AC-INV-05-2 — Una pieza prestada suelta se informa como faltante con su tenedor', async () => {
      const piece = await prismaTest.item.create({
        data: { code: 'PZA-1', name: 'Pieza', categoryId: category.id },
      });
      const compound = await createComposite('Con pieza extraíble', [{ item: piece }]);
      const parent = await unit(compound, 'INT-U-002');
      const pieceUnit = await unit(piece, 'INT-P-001');
      await assemble(parent.id, [pieceUnit.id]);

      const created = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: piece.id, requestedQty: 1 }] });
      expect(created.status).toBe(201);

      const response = await integrity(parent.id);
      expect(response.body.data.unit.isComplete).toBe(false);
      const missing = response.body.data.unit.missingComponents.find(
        (entry) => entry.childItemId === piece.id
      );
      expect(missing).toBeDefined();
      expect(missing.holder.id).toBe(instructor.id);
    });

    it('AC-INV-05-3 — Se listan solo los conjuntos funcionalmente incompletos', async () => {
      const piece = await prismaTest.item.create({
        data: { code: 'LST-1', name: 'Pieza lista', categoryId: category.id },
      });
      const compound = await createComposite('Conjunto listable', [{ item: piece }]);

      const completeParent = await unit(compound, 'LST-C-001');
      const completePiece = await unit(piece, 'LST-CP-001');
      await assemble(completeParent.id, [completePiece.id]);

      const incompleteParent = await unit(compound, 'LST-I-001');
      const unusedPiece = await unit(piece, 'LST-IP-001');
      expect(unusedPiece).toBeDefined();

      const response = await request(app)
        .get('/api/inventory/incomplete-assemblies')
        .set('Authorization', authHeader(admin));
      expect(response.status).toBe(200);
      const ids = response.body.data.data.map((row) => row.id);
      expect(ids).toContain(incompleteParent.id);
      expect(ids).not.toContain(completeParent.id);
      const incompleteRow = response.body.data.data.find((row) => row.id === incompleteParent.id);
      expect(incompleteRow.missingComponents.some((entry) => entry.childItemId === piece.id)).toBe(
        true
      );
    });

    it('AC-INV-05-4 — La completitud se evalúa de forma recursiva', async () => {
      const itemC = await prismaTest.item.create({
        data: { code: 'REC-C', name: 'Pieza C', categoryId: category.id },
      });
      const itemB = await prismaTest.item.create({
        data: { code: 'REC-B', name: 'Compuesto B', categoryId: category.id },
      });
      await prismaTest.itemComponent.create({
        data: { parentItemId: itemB.id, childItemId: itemC.id, isRequired: true },
      });
      const itemA = await prismaTest.item.create({
        data: { code: 'REC-A', name: 'Compuesto A', categoryId: category.id },
      });
      await prismaTest.itemComponent.create({
        data: { parentItemId: itemA.id, childItemId: itemB.id, isRequired: true },
      });

      const unitA = await unit(itemA, 'REC-A-001');
      const unitB = await unit(itemB, 'REC-B-001');
      await unit(itemC, 'REC-C-001');
      await assemble(unitA.id, [unitB.id]);

      const response = await integrity(unitA.id);
      expect(response.body.data.unit.isComplete).toBe(false);
      expect(
        response.body.data.unit.missingComponents.some((entry) => entry.childItemId === itemC.id)
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-07 — Listar todas las unidades (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-07 — Listado de unidades', () => {
    const createUnitRecord = (targetItem, serial, overrides = {}) =>
      prismaTest.inventoryUnit.create({
        data: {
          itemId: targetItem.id,
          serialNumber: serial,
          status: 'AVAILABLE',
          physicalState: 'OPERATIVO',
          ...overrides,
        },
      });

    it('AC-INV-07-1 — Los componentes de un conjunto aparecen en el listado', async () => {
      const piece = await prismaTest.item.create({
        data: { code: 'L7-1', name: 'Pieza listada', categoryId: category.id },
      });
      const compound = await prismaTest.item.create({
        data: { code: 'L7-C', name: 'Compuesto listado', categoryId: category.id },
      });
      await prismaTest.itemComponent.create({
        data: { parentItemId: compound.id, childItemId: piece.id, isRequired: true },
      });
      const parent = await createUnitRecord(compound, 'L7-P-001');
      const child = await createUnitRecord(piece, 'L7-C-001');
      await request(app)
        .post(`/api/inventory/${parent.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [child.id] });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      expect(response.status).toBe(200);
      expect(response.body.data.data.some((row) => row.id === child.id)).toBe(true);
    });

    it('AC-INV-07-2 — Equipos del SENA y donados en el mismo listado', async () => {
      const senaUnit = await createUnitRecord(item, 'TEN-SENA-001');
      const donated = await request(app)
        .post('/api/inventory')
        .set('Authorization', authHeader(admin))
        .send({ itemId: item.id, serialNumber: 'TEN-DON-001', ownership: 'DONATED' });
      expect(donated.status).toBe(201);

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      const rows = response.body.data.data;
      const senaRow = rows.find((row) => row.id === senaUnit.id);
      const donatedRow = rows.find((row) => row.serialNumber === 'TEN-DON-001');
      expect(senaRow.ownership).toBe('SENA');
      expect(donatedRow.ownership).toBe('DONATED');
    });

    it('AC-INV-07-3 — Cada unidad informa si está dentro de un conjunto', async () => {
      const piece = await prismaTest.item.create({
        data: { code: 'L7-3', name: 'Pieza interior', categoryId: category.id },
      });
      const compound = await prismaTest.item.create({
        data: { code: 'L7-C3', name: 'Compuesto interior', categoryId: category.id },
      });
      await prismaTest.itemComponent.create({
        data: { parentItemId: compound.id, childItemId: piece.id, isRequired: true },
      });
      const parent = await createUnitRecord(compound, 'L7-3-P');
      const child = await createUnitRecord(piece, 'L7-3-C');
      const loose = await createUnitRecord(item, 'L7-3-L');
      await request(app)
        .post(`/api/inventory/${parent.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [child.id] });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      const rows = response.body.data.data;
      const childRow = rows.find((row) => row.id === child.id);
      const looseRow = rows.find((row) => row.id === loose.id);
      expect(childRow.parentUnitId).toBe(parent.id);
      expect(childRow.parentUnit.id).toBe(parent.id);
      expect(looseRow.parentUnitId).toBeNull();
    });

    it('AC-INV-07-4 — Consumibles y serializados en listas separadas', async () => {
      const consumable = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader(admin))
        .send({
          code: 'L7-CONS',
          name: 'Consumible separado',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'LITRO',
          initialQty: 5,
        });
      expect(consumable.status).toBe(201);
      const unitRow = await createUnitRecord(item, 'L7-SER-001');

      const units = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      expect(units.body.data.data.some((row) => row.id === unitRow.id)).toBe(true);
      expect(units.body.data.data.some((row) => row.itemId === consumable.body.data.item.id)).toBe(
        false
      );

      const consumableList = await request(app)
        .get('/api/items')
        .query({ isConsumable: 'true' })
        .set('Authorization', authHeader(admin));
      expect(
        consumableList.body.data.data.every((row) => row.isConsumable === true)
      ).toBe(true);
      expect(
        consumableList.body.data.data.some(
          (row) => row.id === consumable.body.data.item.id
        )
      ).toBe(true);

      const serializedList = await request(app)
        .get('/api/items')
        .query({ isConsumable: 'false' })
        .set('Authorization', authHeader(admin));
      expect(serializedList.body.data.data.every((row) => row.isConsumable === false)).toBe(true);
    });

    it('AC-INV-07-5 — El listado de unidades es paginado y devuelve el total', async () => {
      for (let index = 0; index < 25; index += 1) {
        await createUnitRecord(item, `L7-PG-${String(index).padStart(3, '0')}`);
      }

      const response = await request(app)
        .get('/api/inventory')
        .query({ page: 1, limit: 20 })
        .set('Authorization', authHeader(admin));
      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(20);
      expect(response.body.data.meta.total).toBeGreaterThanOrEqual(25);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-08 — Dar de baja una unidad según su tenencia (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-08 — Baja según tenencia', () => {
    const createItemRecord = (code, name) =>
      prismaTest.item.create({ data: { code, name, categoryId: category.id } });
    const createUnitViaApi = (payload) =>
      request(app).post('/api/inventory').set('Authorization', authHeader(admin)).send(payload);
    const getUnit = (unitId) =>
      request(app).get(`/api/inventory/${unitId}`).set('Authorization', authHeader(admin));
    const disposeUnit = (unitId, reason) =>
      request(app)
        .delete(`/api/inventory/${unitId}`)
        .set('Authorization', authHeader(admin))
        .send(reason ? { reason } : {});
    const catalog = (params = {}) =>
      request(app).get('/api/catalog').query(params).set('Authorization', authHeader(admin));

    it('AC-INV-08-1 — La baja de una unidad donada averiada se acepta', async () => {
      const target = await createItemRecord('BAJA-1', 'Equipo donado averiado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-DON-001',
        ownership: 'DONATED',
        physicalState: 'AVERIADO',
      });
      expect(created.status).toBe(201);
      const unitId = created.body.data.unit.id;

      const response = await disposeUnit(unitId, 'Avería irreparable');
      expect(response.status).toBe(200);

      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.status).toBe('DISPOSED');
      expect(stored.body.data.unit.physicalState).toBe('DADO_DE_BAJA');
    });

    it('AC-INV-08-2 — Una unidad dada de baja no puede usarse', async () => {
      const target = await createItemRecord('BAJA-2', 'Equipo dado de baja');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-USO-001',
        ownership: 'DONATED',
      });
      const unitId = created.body.data.unit.id;
      await disposeUnit(unitId, 'Baja para prueba');

      // No se puede asignar a una solicitud.
      const requestResponse = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: target.id, requestedQty: 1 }] });
      expect(requestResponse.status).toBe(409);
      expect(await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: unitId } })).toBe(
        0
      );

      // No se puede ensamblar dentro de un compuesto.
      const compound = await createItemRecord('BAJA-CMP', 'Compuesto');
      await prismaTest.itemComponent.create({
        data: { parentItemId: compound.id, childItemId: target.id, isRequired: true },
      });
      const parentUnit = await createUnitViaApi({
        itemId: compound.id,
        serialNumber: 'BAJA-CMP-001',
        ownership: 'SENA',
      });
      const assembled = await request(app)
        .post(`/api/inventory/${parentUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [unitId] });
      expect(assembled.status).toBe(409);
      const after = await getUnit(unitId);
      expect(after.body.data.unit.parentUnitId).toBeNull();
    });

    it('AC-INV-08-3 — La baja no borra el registro', async () => {
      const target = await createItemRecord('BAJA-3', 'Registro conservado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-REG-001',
        ownership: 'DONATED',
      });
      const unitId = created.body.data.unit.id;
      await disposeUnit(unitId, 'Motivo de baja');

      const response = await getUnit(unitId);
      expect(response.status).toBe(200);
      expect(response.body.data.unit.serialNumber).toBe('BAJA-REG-001');
      expect(response.body.data.unit.status).toBe('DISPOSED');

      const availability = await catalog({ from: '2026-12-01', to: '2026-12-02' });
      const row = availability.body.data.data.find((entry) => entry.id === target.id);
      expect(row.availableQty).toBe(0);
    });

    it('AC-INV-08-4 — La baja exige motivo y deja registrado al actor', async () => {
      const target = await createItemRecord('BAJA-4', 'Baja con motivo');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-MOT-001',
        ownership: 'DONATED',
      });
      const unitId = created.body.data.unit.id;

      const withoutReason = await disposeUnit(unitId);
      expect(withoutReason.status).toBe(400);
      expect((await getUnit(unitId)).body.data.unit.status).toBe('AVAILABLE');

      const withReason = await disposeUnit(unitId, 'Daño por caída');
      expect(withReason.status).toBe(200);
      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.disposalReason).toBe('Daño por caída');
      expect(stored.body.data.unit.disposalConfirmedById).toBe(admin.id);
      const movement = await prismaTest.movement.findFirst({
        where: { inventoryUnitId: unitId, type: 'DISPOSAL' },
      });
      expect(movement.responsibleId).toBe(admin.id);
      expect(movement.notes).toBe('Daño por caída');
    });

    it('AC-INV-08-5 — La pérdida de una unidad fuera de un préstamo queda registrada', async () => {
      // Pérdida de una unidad en el depósito.
      const target = await createItemRecord('BAJA-5', 'Unidad perdida');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-LOSS-001',
        ownership: 'DONATED',
      });
      const unitId = created.body.data.unit.id;
      const loss = await request(app)
        .post(`/api/inventory/${unitId}/loss`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Desapareció del depósito' });
      expect(loss.status).toBe(200);
      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.declaredLost).toBe(true);
      const lossMovement = await prismaTest.movement.findFirst({
        where: { inventoryUnitId: unitId, type: 'DISPOSAL' },
      });
      expect(lossMovement.notes).toContain('Desapareció del depósito');
      expect(lossMovement.responsibleId).toBe(admin.id);
      const availability = await catalog({ from: '2026-12-01', to: '2026-12-02' });
      expect(availability.body.data.data.find((row) => row.id === target.id).availableQty).toBe(0);

      // Unidad del SENA con piezas y trámite abierto: sus piezas siguen prestables.
      const kitItem = await createItemRecord('BAJA-KIT', 'Kit SENA');
      const pieceItem = await createItemRecord('BAJA-PZA', 'Pieza del kit');
      await prismaTest.itemComponent.create({
        data: { parentItemId: kitItem.id, childItemId: pieceItem.id, isRequired: true },
      });
      const kitUnit = await createUnitViaApi({
        itemId: kitItem.id,
        serialNumber: 'BAJA-KIT-001',
        ownership: 'SENA',
      });
      const pieceUnit = await createUnitViaApi({
        itemId: pieceItem.id,
        serialNumber: 'BAJA-PZA-001',
        ownership: 'SENA',
      });
      await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [pieceUnit.body.data.unit.id] });
      const start = await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/disposal/start`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Avería del equipo' });
      expect(start.status).toBe(200);
      const lostKit = await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/loss`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Pérdida durante el trámite' });
      expect(lostKit.status).toBe(200);

      const pieceRequest = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: pieceItem.id, requestedQty: 1 }] });
      expect(pieceRequest.status).toBe(201);
      const pieceRequestId = pieceRequest.body.data.request.id;
      await request(app)
        .put(`/api/requests/${pieceRequestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${pieceRequestId}/pack`)
        .set('Authorization', authHeader(admin));
      const pieceDelivery = await request(app)
        .put(`/api/requests/${pieceRequestId}/deliver`)
        .set('Authorization', authHeader(admin));
      expect(pieceDelivery.status).toBe(200);
      const kitAfter = await getUnit(kitUnit.body.data.unit.id);
      expect(kitAfter.body.data.unit.disposalInProgress).toBe(true);
    });

    it('AC-INV-08-6 — Una unidad del SENA no se da de baja por el camino inmediato', async () => {
      const target = await createItemRecord('BAJA-6', 'Equipo SENA');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-SENA-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;

      const response = await disposeUnit(unitId, 'Intento inmediato');
      expect(response.status).toBe(409);
      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.status).toBe('AVAILABLE');
      expect(stored.body.data.unit.ownership).toBe('SENA');
    });

    it('AC-INV-08-7 — Dos unidades del mismo elemento con tenencia distinta', async () => {
      const target = await createItemRecord('BAJA-7', 'Elemento mixto');
      const sena = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-7-SENA',
        ownership: 'SENA',
      });
      const donated = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-7-DON',
        ownership: 'DONATED',
      });

      const response = await disposeUnit(donated.body.data.unit.id, 'Baja de donada');
      expect(response.status).toBe(200);
      expect((await getUnit(donated.body.data.unit.id)).body.data.unit.status).toBe('DISPOSED');
      const senaAfter = await getUnit(sena.body.data.unit.id);
      expect(senaAfter.body.data.unit.status).toBe('AVAILABLE');
      expect(senaAfter.body.data.unit.ownership).toBe('SENA');
    });

    it('AC-INV-08-8 — Una unidad del SENA que deja de funcionar no desaparece', async () => {
      const target = await createItemRecord('BAJA-8', 'Equipo con falla');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'BAJA-8-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;

      const update = await request(app)
        .put(`/api/inventory/${unitId}`)
        .set('Authorization', authHeader(admin))
        .send({ physicalState: 'CON_FALLA' });
      expect(update.status).toBe(200);

      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.serialNumber).toBe('BAJA-8-001');
      expect(stored.body.data.unit.ownership).toBe('SENA');
      expect(stored.body.data.unit.physicalState).toBe('CON_FALLA');

      const audit = await request(app)
        .get('/api/inventory')
        .query({ itemId: target.id })
        .set('Authorization', authHeader(admin));
      expect(audit.body.data.data.some((row) => row.id === unitId)).toBe(true);

      const availability = await catalog({ from: '2026-12-01', to: '2026-12-02' });
      expect(availability.body.data.data.find((row) => row.id === target.id).availableQty).toBe(0);
    });

    it('AC-INV-08-9 — Un elemento del SENA nunca se informa como consumible', async () => {
      const senaItem = await createItemRecord('BAJA-9', 'Equipo SENA serializado');
      await createUnitViaApi({
        itemId: senaItem.id,
        serialNumber: 'BAJA-9-001',
        ownership: 'SENA',
      });

      const consumables = await request(app)
        .get('/api/items')
        .query({ isConsumable: 'true' })
        .set('Authorization', authHeader(admin));
      expect(consumables.body.data.data.some((row) => row.id === senaItem.id)).toBe(false);

      const units = await request(app)
        .get('/api/inventory')
        .query({ itemId: senaItem.id })
        .set('Authorization', authHeader(admin));
      expect(units.body.data.data.some((row) => row.itemId === senaItem.id)).toBe(true);

      const donatedConsumable = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader(admin))
        .send({
          code: 'BAJA-9-CON',
          name: 'Consumible donado',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'LITRO',
          initialQty: 7,
        });
      expect(donatedConsumable.status).toBe(201);
      const consumablesAfter = await request(app)
        .get('/api/items')
        .query({ isConsumable: 'true' })
        .set('Authorization', authHeader(admin));
      const row = consumablesAfter.body.data.data.find(
        (entry) => entry.id === donatedConsumable.body.data.item.id
      );
      expect(row).toBeDefined();
      expect(row.stock).toBe(7);
      expect(row.unit).toBe('LITRO');
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-09 — Tramitar la baja de un equipo del SENA (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-09 — Trámite de baja SENA', () => {
    const createItemRecord = (code, name) =>
      prismaTest.item.create({ data: { code, name, categoryId: category.id } });
    const createUnitViaApi = (payload) =>
      request(app).post('/api/inventory').set('Authorization', authHeader(admin)).send(payload);
    const getUnit = (unitId) =>
      request(app).get(`/api/inventory/${unitId}`).set('Authorization', authHeader(admin));
    const startProcess = (unitId, reason) =>
      request(app)
        .post(`/api/inventory/${unitId}/disposal/start`)
        .set('Authorization', authHeader(admin))
        .send(reason ? { reason } : {});
    const confirmProcess = (unitId, token = admin) =>
      request(app)
        .post(`/api/inventory/${unitId}/disposal/confirm`)
        .set('Authorization', authHeader(token));
    const catalog = (params = {}) =>
      request(app).get('/api/catalog').query(params).set('Authorization', authHeader(admin));

    it('AC-INV-09-1 — Iniciar el trámite no da de baja la unidad', async () => {
      const target = await createItemRecord('TRAM-1', 'Equipo SENA en trámite');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-1-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;

      const response = await startProcess(unitId, 'Avería no reparable');
      expect(response.status).toBe(200);

      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.disposalInProgress).toBe(true);
      expect(stored.body.data.unit.status).toBe('AVAILABLE');
      expect(stored.body.data.unit.status).not.toBe('DISPOSED');
    });

    it('AC-INV-09-2 — La unidad en trámite sigue en el inventario', async () => {
      const target = await createItemRecord('TRAM-2', 'Equipo SENA visible');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-2-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;
      await startProcess(unitId, 'Trámite abierto');

      const list = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      expect(list.body.data.data.some((row) => row.id === unitId)).toBe(true);

      const detail = await getUnit(unitId);
      expect(detail.status).toBe(200);
      expect(detail.body.data.unit.serialNumber).toBe('TRAM-2-001');
    });

    it('AC-INV-09-3 — La baja solo se efectiviza con la confirmación', async () => {
      const target = await createItemRecord('TRAM-3', 'Equipo SENA a confirmar');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-3-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;
      await startProcess(unitId, 'Motivo del trámite');

      const before = await getUnit(unitId);
      expect(before.body.data.unit.disposalInProgress).toBe(true);
      expect(before.body.data.unit.disposalConfirmedAt).toBeNull();
      expect(before.body.data.unit.status).not.toBe('DISPOSED');

      const confirmed = await confirmProcess(unitId);
      expect(confirmed.status).toBe(200);
      const after = await getUnit(unitId);
      expect(after.body.data.unit.status).toBe('DISPOSED');
      expect(after.body.data.unit.disposalInProgress).toBe(false);
      expect(after.body.data.unit.disposalConfirmedAt).not.toBeNull();

      const availability = await catalog({ from: '2026-12-01', to: '2026-12-02' });
      expect(availability.body.data.data.find((row) => row.id === target.id).availableQty).toBe(0);
    });

    it('AC-INV-09-4 — El trámite registra motivo y actor, y la confirmación registra quién la otorga', async () => {
      const target = await createItemRecord('TRAM-4', 'Equipo SENA con motivo');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-4-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;

      const withoutReason = await startProcess(unitId);
      expect(withoutReason.status).toBe(400);
      const untouched = await getUnit(unitId);
      expect(untouched.body.data.unit.disposalInProgress).toBe(false);
      expect(untouched.body.data.unit.disposalStartedAt).toBeNull();

      const started = await startProcess(unitId, 'Baja institucional');
      expect(started.status).toBe(200);
      const inProcess = await getUnit(unitId);
      expect(inProcess.body.data.unit.disposalReason).toBe('Baja institucional');
      expect(inProcess.body.data.unit.disposalStartedById).toBe(admin.id);

      await confirmProcess(unitId);
      const confirmed = await getUnit(unitId);
      expect(confirmed.body.data.unit.disposalConfirmedById).toBe(admin.id);
    });

    it('AC-INV-09-5 — Solo el administrador registra la confirmación', async () => {
      const target = await createItemRecord('TRAM-5', 'Equipo SENA confirmación');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-5-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;
      await startProcess(unitId, 'Motivo');

      const forbidden = await confirmProcess(unitId, instructor);
      expect(forbidden.status).toBe(403);
      const stillOpen = await getUnit(unitId);
      expect(stillOpen.body.data.unit.disposalInProgress).toBe(true);
      expect(stillOpen.body.data.unit.disposalConfirmedAt).toBeNull();

      const confirmed = await confirmProcess(unitId);
      expect(confirmed.status).toBe(200);
    });

    it('AC-INV-09-6 — Una unidad en trámite no se presta, ni por piezas', async () => {
      // Unidad como unidad: OPERATIVO en trámite.
      const target = await createItemRecord('TRAM-6', 'Equipo SENA operativo');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-6-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;
      await startProcess(unitId, 'Trámite');

      const requestUnit = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: target.id, requestedQty: 1 }] });
      expect(requestUnit.status).toBe(409);
      expect(
        await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: unitId } })
      ).toBe(0);

      // Pieza suelta de una unidad averiada en trámite.
      const kitItem = await createItemRecord('TRAM-6-KIT', 'Conjunto averiado');
      const pieceItem = await createItemRecord('TRAM-6-PZA', 'Pieza suelta');
      await prismaTest.itemComponent.create({
        data: { parentItemId: kitItem.id, childItemId: pieceItem.id, isRequired: true },
      });
      const kitUnit = await createUnitViaApi({
        itemId: kitItem.id,
        serialNumber: 'TRAM-6-KIT-001',
        ownership: 'SENA',
        physicalState: 'AVERIADO',
      });
      const pieceUnit = await createUnitViaApi({
        itemId: pieceItem.id,
        serialNumber: 'TRAM-6-PZA-001',
        ownership: 'SENA',
      });
      await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [pieceUnit.body.data.unit.id] });
      await startProcess(kitUnit.body.data.unit.id, 'Avería en trámite');

      const requestPiece = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: pieceItem.id, requestedQty: 1 }] });
      expect(requestPiece.status).toBe(409);
      expect(
        await prismaTest.requestItemUnit.count({
          where: { inventoryUnitId: pieceUnit.body.data.unit.id },
        })
      ).toBe(0);

      const inventory = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      const ids = inventory.body.data.data.map((row) => row.id);
      expect(ids).toContain(unitId);
      expect(ids).toContain(kitUnit.body.data.unit.id);
      expect(ids).toContain(pieceUnit.body.data.unit.id);
    });

    it('AC-INV-09-7 — Una unidad declarada perdida no bloquea nada y sus piezas siguen prestables', async () => {
      // Unidad perdida durante el trámite: sale del inventario activo, trámite abierto.
      const target = await createItemRecord('TRAM-7', 'Equipo perdido');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'TRAM-7-001',
        ownership: 'SENA',
      });
      const unitId = created.body.data.unit.id;
      await startProcess(unitId, 'Trámite por pérdida');
      const loss = await request(app)
        .post(`/api/inventory/${unitId}/loss`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Pérdida durante el trámite' });
      expect(loss.status).toBe(200);

      const stored = await getUnit(unitId);
      expect(stored.body.data.unit.declaredLost).toBe(true);
      expect(stored.body.data.unit.disposalInProgress).toBe(true);

      const list = await request(app)
        .get('/api/inventory')
        .set('Authorization', authHeader(admin));
      expect(list.body.data.data.some((row) => row.id === unitId)).toBe(false);

      // Piezas del conjunto perdido: siguen prestables pese al trámite abierto.
      const kitItem = await createItemRecord('TRAM-7-KIT', 'Conjunto perdido');
      const pieceItem = await createItemRecord('TRAM-7-PZA', 'Pieza prestable');
      await prismaTest.itemComponent.create({
        data: { parentItemId: kitItem.id, childItemId: pieceItem.id, isRequired: true },
      });
      const kitUnit = await createUnitViaApi({
        itemId: kitItem.id,
        serialNumber: 'TRAM-7-KIT-001',
        ownership: 'SENA',
      });
      const pieceUnit = await createUnitViaApi({
        itemId: pieceItem.id,
        serialNumber: 'TRAM-7-PZA-001',
        ownership: 'SENA',
      });
      await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [pieceUnit.body.data.unit.id] });
      await startProcess(kitUnit.body.data.unit.id, 'Trámite del conjunto');
      await request(app)
        .post(`/api/inventory/${kitUnit.body.data.unit.id}/loss`)
        .set('Authorization', authHeader(admin))
        .send({ reason: 'Conjunto perdido' });

      const pieceRequest = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId: pieceItem.id, requestedQty: 1 }] });
      expect(pieceRequest.status).toBe(201);
      const pieceRequestId = pieceRequest.body.data.request.id;
      await request(app)
        .put(`/api/requests/${pieceRequestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${pieceRequestId}/pack`)
        .set('Authorization', authHeader(admin));
      const delivered = await request(app)
        .put(`/api/requests/${pieceRequestId}/deliver`)
        .set('Authorization', authHeader(admin));
      expect(delivered.status).toBe(200);
      const kitAfter = await getUnit(kitUnit.body.data.unit.id);
      expect(kitAfter.body.data.unit.disposalInProgress).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-10 — Estados físicos y préstamo por piezas (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-10 — Estado físico y préstamo', () => {
    const createItemRecord = (code, name) =>
      prismaTest.item.create({ data: { code, name, categoryId: category.id } });
    const createUnitViaApi = (payload) =>
      request(app).post('/api/inventory').set('Authorization', authHeader(admin)).send(payload);
    const requestUnit = (itemId) =>
      request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId, requestedQty: 1 }] });
    const deliverRequest = async (requestId) => {
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
    const createParentWithPiece = async ({ parentCode, pieceCode, parentState }) => {
      const parentItem = await createItemRecord(parentCode, `Conjunto ${parentCode}`);
      const pieceItem = await createItemRecord(pieceCode, `Pieza ${pieceCode}`);
      await prismaTest.itemComponent.create({
        data: { parentItemId: parentItem.id, childItemId: pieceItem.id, isRequired: true },
      });
      const parentUnit = await createUnitViaApi({
        itemId: parentItem.id,
        serialNumber: `${parentCode}-U-001`,
        ownership: 'SENA',
        ...(parentState ? { physicalState: parentState } : {}),
      });
      const pieceUnit = await createUnitViaApi({
        itemId: pieceItem.id,
        serialNumber: `${pieceCode}-U-001`,
        ownership: 'SENA',
      });
      await request(app)
        .post(`/api/inventory/${parentUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [pieceUnit.body.data.unit.id] });
      return {
        parentItem,
        pieceItem,
        parentUnitId: parentUnit.body.data.unit.id,
        pieceUnitId: pieceUnit.body.data.unit.id,
      };
    };

    it('AC-INV-10-1 — Una unidad operativa se presta como unidad y conserva su estado', async () => {
      const target = await createItemRecord('EST-1', 'Equipo operativo');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-1-001',
        ownership: 'SENA',
        physicalState: 'OPERATIVO',
      });
      const unitId = created.body.data.unit.id;

      const requestResponse = await requestUnit(target.id);
      expect(requestResponse.status).toBe(201);
      const requestId = requestResponse.body.data.request.id;
      const delivered = await deliverRequest(requestId);
      expect(delivered.status).toBe(200);

      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unitId } });
      expect(stored.status).toBe('LOANED');
      expect(stored.physicalState).toBe('OPERATIVO');
      const assignment = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: unitId },
      });
      expect(assignment.loanedAt).not.toBeNull();
    });

    it('AC-INV-10-2 — Una unidad descargada/agotada no se presta ni por piezas', async () => {
      const target = await createItemRecord('EST-2', 'Equipo agotado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-2-001',
        ownership: 'SENA',
        physicalState: 'DESCARGADO_AGOTADO',
      });
      const unitId = created.body.data.unit.id;

      const response = await requestUnit(target.id);
      expect(response.status).toBe(409);
      expect(await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: unitId } })).toBe(
        0
      );

      const assembly = await createParentWithPiece({
        parentCode: 'EST-2-KIT',
        pieceCode: 'EST-2-PZA',
        parentState: 'DESCARGADO_AGOTADO',
      });
      const pieceRequest = await requestUnit(assembly.pieceItem.id);
      expect(pieceRequest.status).toBe(409);
      expect(
        await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: assembly.pieceUnitId } })
      ).toBe(0);
      const pieceStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: assembly.pieceUnitId },
      });
      expect(pieceStored).not.toBeNull();
    });

    it('AC-INV-10-3 — Con falla no se presta la unidad, pero sí sus piezas sueltas', async () => {
      const target = await createItemRecord('EST-3', 'Equipo con falla');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-3-001',
        ownership: 'SENA',
        physicalState: 'CON_FALLA',
      });
      expect((await requestUnit(target.id)).status).toBe(409);

      const assembly = await createParentWithPiece({
        parentCode: 'EST-3-KIT',
        pieceCode: 'EST-3-PZA',
        parentState: 'CON_FALLA',
      });
      const pieceRequest = await requestUnit(assembly.pieceItem.id);
      expect(pieceRequest.status).toBe(201);
      const delivered = await deliverRequest(pieceRequest.body.data.request.id);
      expect(delivered.status).toBe(200);

      const assignment = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: assembly.pieceUnitId },
      });
      expect(assignment.loanedAt).not.toBeNull();
      expect(assignment.returnedAt).toBeNull();
      const parentStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: assembly.parentUnitId },
      });
      expect(parentStored.physicalState).toBe('CON_FALLA');
      expect(created.body.data.unit.id).toBeDefined();
    });

    it('AC-INV-10-4 — En mantenimiento no se presta nada', async () => {
      const target = await createItemRecord('EST-4', 'Equipo en mantenimiento');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-4-001',
        ownership: 'SENA',
        physicalState: 'EN_MANTENIMIENTO',
      });

      const response = await requestUnit(target.id);
      expect(response.status).toBe(409);
      expect(await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: created.body.data.unit.id } })).toBe(0);

      const assembly = await createParentWithPiece({
        parentCode: 'EST-4-KIT',
        pieceCode: 'EST-4-PZA',
        parentState: 'EN_MANTENIMIENTO',
      });
      const pieceRequest = await requestUnit(assembly.pieceItem.id);
      expect(pieceRequest.status).toBe(409);
      expect(
        await prismaTest.requestItemUnit.count({ where: { inventoryUnitId: assembly.pieceUnitId } })
      ).toBe(0);
    });

    it('AC-INV-10-5 — Averiada no se presta como unidad, pero sí sus piezas sueltas', async () => {
      const target = await createItemRecord('EST-5', 'Equipo averiado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-5-001',
        ownership: 'SENA',
        physicalState: 'AVERIADO',
      });
      expect((await requestUnit(target.id)).status).toBe(409);

      const assembly = await createParentWithPiece({
        parentCode: 'EST-5-KIT',
        pieceCode: 'EST-5-PZA',
        parentState: 'AVERIADO',
      });
      const pieceRequest = await requestUnit(assembly.pieceItem.id);
      expect(pieceRequest.status).toBe(201);
      const delivered = await deliverRequest(pieceRequest.body.data.request.id);
      expect(delivered.status).toBe(200);
      const parentStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: assembly.parentUnitId },
      });
      expect(parentStored.physicalState).toBe('AVERIADO');
      expect(created.body.data.unit.id).toBeDefined();
    });

    it('AC-INV-10-6 — Un estado físico fuera de la lista cerrada se rechaza', async () => {
      const target = await createItemRecord('EST-6', 'Estado inválido');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-6-001',
        ownership: 'SENA',
        physicalState: 'OPERATIVO',
      });
      const unitId = created.body.data.unit.id;

      const response = await request(app)
        .put(`/api/inventory/${unitId}`)
        .set('Authorization', authHeader(admin))
        .send({ physicalState: 'INVENTADO' });
      expect(response.status).toBe(400);
      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unitId } });
      expect(stored.physicalState).toBe('OPERATIVO');
    });

    it('AC-INV-10-7 — El instructor no puede cambiar el estado físico', async () => {
      const target = await createItemRecord('EST-7', 'Cambio no autorizado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'EST-7-001',
        ownership: 'SENA',
        physicalState: 'OPERATIVO',
      });
      const unitId = created.body.data.unit.id;

      const response = await request(app)
        .put(`/api/inventory/${unitId}`)
        .set('Authorization', authHeader(instructor))
        .send({ physicalState: 'AVERIADO' });
      expect(response.status).toBe(403);
      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unitId } });
      expect(stored.physicalState).toBe('OPERATIVO');
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-13 — Alertas de stock bajo (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-13 — Alertas de stock bajo', () => {
    const createConsumableRecord = (code, stock, minStock) =>
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

    it('AC-INV-13-1 — Se listan los elementos en su umbral mínimo o por debajo', async () => {
      const atThreshold = await createConsumableRecord('ALERTA-5', 5, 5);
      const below = await createConsumableRecord('ALERTA-2', 2, 5);

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', authHeader(admin));
      expect(response.status).toBe(200);
      const rows = response.body.data.data;
      const atRow = rows.find((row) => row.id === atThreshold.id);
      const belowRow = rows.find((row) => row.id === below.id);
      expect(atRow).toBeDefined();
      expect(belowRow).toBeDefined();
      expect(atRow.availableStock).toBe(5);
      expect(atRow.minStock).toBe(5);
      expect(belowRow.availableStock).toBe(2);
    });

    it('AC-INV-13-2 — Un elemento por encima de su umbral no aparece', async () => {
      const above = await createConsumableRecord('ALERTA-6', 6, 5);
      const withoutThreshold = await createConsumableRecord('ALERTA-NULL', 0, null);

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', authHeader(admin));
      const rows = response.body.data.data;
      expect(rows.some((row) => row.id === above.id)).toBe(false);
      expect(rows.some((row) => row.id === withoutThreshold.id)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-11 — Ubicación de la unidad (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-11 — Ubicación', () => {
    const createEnvironmentRecord = (code, name) =>
      prismaTest.environment.create({ data: { code, name } });
    const createItemRecord = (code, name) =>
      prismaTest.item.create({ data: { code, name, categoryId: category.id } });
    const createUnitViaApi = (payload) =>
      request(app).post('/api/inventory').set('Authorization', authHeader(admin)).send(payload);
    const getUnit = (unitId) =>
      request(app).get(`/api/inventory/${unitId}`).set('Authorization', authHeader(admin));

    it('AC-INV-11-1 — Toda unidad nace en el Ambiente 104', async () => {
      const base = await createEnvironmentRecord('104', 'Ambiente 104');
      const target = await createItemRecord('UBI-1', 'Equipo con ubicación');

      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-1-001',
        ownership: 'SENA',
      });
      expect(created.status).toBe(201);
      const stored = await getUnit(created.body.data.unit.id);
      expect(stored.body.data.unit.environmentId).toBe(base.id);
      expect(stored.body.data.unit.environment.name).toBe('Ambiente 104');
    });

    it('AC-INV-11-2 — El administrador cambia la ubicación de la unidad', async () => {
      await createEnvironmentRecord('104', 'Ambiente 104');
      const destination = await createEnvironmentRecord('205', 'Ambiente 205');
      const target = await createItemRecord('UBI-2', 'Equipo a trasladar');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-2-001',
        ownership: 'SENA',
      });

      const response = await request(app)
        .put(`/api/inventory/${created.body.data.unit.id}`)
        .set('Authorization', authHeader(admin))
        .send({ environmentId: destination.id });
      expect(response.status).toBe(200);
      const stored = await getUnit(created.body.data.unit.id);
      expect(stored.body.data.unit.environment.id).toBe(destination.id);
    });

    it('AC-INV-11-3 — La consulta informa ubicación y estado físico juntos', async () => {
      const base = await createEnvironmentRecord('104', 'Ambiente 104');
      const target = await createItemRecord('UBI-3', 'Equipo consultable');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-3-001',
        ownership: 'SENA',
        physicalState: 'OPERATIVO',
      });

      const response = await getUnit(created.body.data.unit.id);
      expect(response.body.data.unit.environment.id).toBe(base.id);
      expect(response.body.data.unit.physicalState).toBe('OPERATIVO');
    });

    it('AC-INV-11-4 — Se consulta qué unidades están en un ambiente', async () => {
      await createEnvironmentRecord('104', 'Ambiente 104');
      const destination = await createEnvironmentRecord('205', 'Ambiente 205');
      const target = await createItemRecord('UBI-4', 'Equipo doble ubicación');
      const inBase = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-4-104',
        ownership: 'SENA',
      });
      const inDestination = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-4-205',
        ownership: 'SENA',
        environmentId: destination.id,
      });

      const response = await request(app)
        .get('/api/inventory')
        .query({ environmentId: destination.id, limit: 100 })
        .set('Authorization', authHeader(admin));
      const ids = response.body.data.data.map((row) => row.id);
      expect(ids).toContain(inDestination.body.data.unit.id);
      expect(ids).not.toContain(inBase.body.data.unit.id);
    });

    it('AC-INV-11-5 — Una unidad prestada informa el ambiente de destino', async () => {
      await createEnvironmentRecord('104', 'Ambiente 104');
      const destination = await createEnvironmentRecord('205', 'Ambiente 205');
      const target = await createItemRecord('UBI-5', 'Equipo prestado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'UBI-5-001',
        ownership: 'SENA',
      });

      const requestResponse = await request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ environmentId: destination.id, items: [{ itemId: target.id, requestedQty: 1 }] });
      expect(requestResponse.status).toBe(201);
      const requestId = requestResponse.body.data.request.id;
      await request(app)
        .put(`/api/requests/${requestId}/approve`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/pack`)
        .set('Authorization', authHeader(admin));
      await request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', authHeader(admin));

      const stored = await getUnit(created.body.data.unit.id);
      expect(stored.body.data.unit.environment.id).toBe(destination.id);
      expect(stored.body.data.unit.environment.name).toBe('Ambiente 205');
    });
  });

  // ---------------------------------------------------------------------------------
  // US-INV-12 — Mantenimiento (verificación)
  // ---------------------------------------------------------------------------------
  describe('US-INV-12 — Mantenimiento', () => {
    const createItemRecord = (code, name) =>
      prismaTest.item.create({ data: { code, name, categoryId: category.id } });
    const createUnitViaApi = (payload) =>
      request(app).post('/api/inventory').set('Authorization', authHeader(admin)).send(payload);
    const setState = (unitId, physicalState, token = admin) =>
      request(app)
        .put(`/api/inventory/${unitId}`)
        .set('Authorization', authHeader(token))
        .send({ physicalState });
    const requestUnit = (itemId) =>
      request(app)
        .post('/api/requests')
        .set('Authorization', authHeader(instructor))
        .send({ items: [{ itemId, requestedQty: 1 }] });
    const deliverRequest = async (requestId) => {
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
    const createParentWithPiece = async ({ parentCode, pieceCode, parentState }) => {
      const parentItem = await createItemRecord(parentCode, `Conjunto ${parentCode}`);
      const pieceItem = await createItemRecord(pieceCode, `Pieza ${pieceCode}`);
      await prismaTest.itemComponent.create({
        data: { parentItemId: parentItem.id, childItemId: pieceItem.id, isRequired: true },
      });
      const parentUnit = await createUnitViaApi({
        itemId: parentItem.id,
        serialNumber: `${parentCode}-U-001`,
        ownership: 'SENA',
        physicalState: parentState,
      });
      const pieceUnit = await createUnitViaApi({
        itemId: pieceItem.id,
        serialNumber: `${pieceCode}-U-001`,
        ownership: 'SENA',
      });
      await request(app)
        .post(`/api/inventory/${parentUnit.body.data.unit.id}/assemble`)
        .set('Authorization', authHeader(admin))
        .send({ childUnitIds: [pieceUnit.body.data.unit.id] });
      return { parentItem, pieceItem, parentUnitId: parentUnit.body.data.unit.id, pieceUnitId: pieceUnit.body.data.unit.id };
    };

    it('AC-INV-12-1 — El administrador envía a mantenimiento un equipo con falla', async () => {
      const target = await createItemRecord('MANT-1', 'Equipo con falla reparable');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'MANT-1-001',
        ownership: 'SENA',
        physicalState: 'CON_FALLA',
      });
      const unitId = created.body.data.unit.id;

      // Sus piezas sueltas sí se prestaban en CON_FALLA.
      const assembly = await createParentWithPiece({
        parentCode: 'MANT-1-KIT',
        pieceCode: 'MANT-1-PZA',
        parentState: 'CON_FALLA',
      });
      expect((await requestUnit(assembly.pieceItem.id)).status).toBe(201);

      // Segundo conjunto con falla: pasa a mantenimiento y sus piezas dejan de prestarse.
      const second = await createParentWithPiece({
        parentCode: 'MANT-1B-KIT',
        pieceCode: 'MANT-1B-PZA',
        parentState: 'CON_FALLA',
      });
      const response = await setState(second.parentUnitId, 'EN_MANTENIMIENTO');
      expect(response.status).toBe(200);
      expect((await requestUnit(second.pieceItem.id)).status).toBe(409);

      expect(unitId).toBeDefined();
    });

    it('AC-INV-12-2 — Al volver del mantenimiento el administrador decide el estado', async () => {
      const target = await createItemRecord('MANT-2', 'Equipo en mantenimiento');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'MANT-2-001',
        ownership: 'SENA',
        physicalState: 'CON_FALLA',
      });
      const unitId = created.body.data.unit.id;
      await setState(unitId, 'EN_MANTENIMIENTO');

      // Vuelve OPERATIVO: se presta como unidad.
      const backToOperative = await setState(unitId, 'OPERATIVO');
      expect(backToOperative.status).toBe(200);
      const requestOperative = await requestUnit(target.id);
      expect(requestOperative.status).toBe(201);

      // Vuelve AVERIADO: no se presta como unidad, pero sus piezas sí.
      const veto = await createItemRecord('MANT-2B', 'Equipo que vuelve averiado');
      const vetoUnit = await createUnitViaApi({
        itemId: veto.id,
        serialNumber: 'MANT-2B-001',
        ownership: 'SENA',
        physicalState: 'CON_FALLA',
      });
      await setState(vetoUnit.body.data.unit.id, 'EN_MANTENIMIENTO');
      const backToDamaged = await setState(vetoUnit.body.data.unit.id, 'AVERIADO');
      expect(backToDamaged.status).toBe(200);
      expect((await requestUnit(veto.id)).status).toBe(409);

      const assembly = await createParentWithPiece({
        parentCode: 'MANT-2C-KIT',
        pieceCode: 'MANT-2C-PZA',
        parentState: 'AVERIADO',
      });
      const pieceRequest = await requestUnit(assembly.pieceItem.id);
      expect(pieceRequest.status).toBe(201);
      expect((await deliverRequest(pieceRequest.body.data.request.id)).status).toBe(200);
    });

    it('AC-INV-12-3 — Un equipo averiado no se envía a mantenimiento', async () => {
      const target = await createItemRecord('MANT-3', 'Equipo averiado');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'MANT-3-001',
        ownership: 'SENA',
        physicalState: 'AVERIADO',
      });
      const unitId = created.body.data.unit.id;

      const response = await setState(unitId, 'EN_MANTENIMIENTO');
      expect(response.status).toBe(409);
      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unitId } });
      expect(stored.physicalState).toBe('AVERIADO');
    });

    it('AC-INV-12-4 — Solo el administrador cambia el estado físico', async () => {
      const target = await createItemRecord('MANT-4', 'Equipo protegido');
      const created = await createUnitViaApi({
        itemId: target.id,
        serialNumber: 'MANT-4-001',
        ownership: 'SENA',
        physicalState: 'CON_FALLA',
      });
      const unitId = created.body.data.unit.id;

      const response = await setState(unitId, 'EN_MANTENIMIENTO', instructor);
      expect(response.status).toBe(403);
      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unitId } });
      expect(stored.physicalState).toBe('CON_FALLA');
    });
  });
});
