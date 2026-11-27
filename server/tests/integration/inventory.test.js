import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import inventoryRoutes from '../../src/routes/inventory.routes.js';
import requestRoutes from '../../src/routes/request.routes.js';
import itemRoutes from '../../src/routes/item.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { generateTokens } from '../../src/utils/jwt.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/items', itemRoutes);
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
});
