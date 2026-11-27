import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Tests de verificación del Módulo 11 — Movimientos del inventario.
 * Cada `it` lleva el id del criterio en el nombre (`reparto.md` §3).
 */

const PASSWORD = 'Password123';
let serialSequence = 0;

async function loginAs({ email, fullName, role, shift }) {
  await prismaTest.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      fullName,
      role,
      shift,
      isActive: true,
    },
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: `Bearer ${login.body.data.accessToken}`, user: login.body.data.user };
}

const createAdmin = () =>
  loginAs({ email: 'admin@sena.edu.co', fullName: 'Admin Test', role: 'ADMIN' });

const createInstructor = () =>
  loginAs({
    email: 'cmendoza@sena.edu.co',
    fullName: 'Carlos Mendoza',
    role: 'INSTRUCTOR',
    shift: 'MORNING',
  });

async function createCategory() {
  return prismaTest.category.create({
    data: { name: `MovCat-${Date.now()}-${Math.random()}` },
  });
}

async function createItem(categoryId, overrides = {}) {
  return prismaTest.item.create({
    data: {
      code: `MOV-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: 'Elemento de movimientos',
      categoryId,
      ...overrides,
    },
  });
}

async function createUnit(itemId, overrides = {}) {
  serialSequence += 1;
  return prismaTest.inventoryUnit.create({
    data: {
      itemId,
      serialNumber: `SN-MOV-${serialSequence}`,
      status: 'AVAILABLE',
      physicalState: 'OPERATIVO',
      ...overrides,
    },
  });
}

const countMovements = (where = {}) => prismaTest.movement.count({ where });

const getMovements = (token, params = {}) =>
  request(app).get('/api/movements').query(params).set('Authorization', token);

const getRequestMovements = (requestId, type) =>
  prismaTest.movement.findMany({ where: { requestId, ...(type ? { type } : {}) } });

async function createRequestViaApi(instructorToken, items) {
  return request(app)
    .post('/api/requests')
    .set('Authorization', instructorToken)
    .send({ items });
}

async function takeThroughDelivery(adminToken, requestId) {
  await request(app).put(`/api/requests/${requestId}/approve`).set('Authorization', adminToken);
  await request(app).put(`/api/requests/${requestId}/pack`).set('Authorization', adminToken);
  return request(app)
    .put(`/api/requests/${requestId}/deliver`)
    .set('Authorization', adminToken);
}

describe('Módulo 11 — Movimientos del inventario', () => {
  let admin;
  let instructor;
  let category;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
    instructor = await createInstructor();
    category = await createCategory();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-MOV-01 — Registrar los movimientos
  // ---------------------------------------------------------------------------------
  describe('US-MOV-01 — Eventos que dejan movimiento', () => {
    it('AC-MOV-01-1 — El alta de una unidad deja un movimiento con su actor y su fecha', async () => {
      const item = await createItem(category.id);
      const before = await countMovements();

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', admin.token)
        .send({ itemId: item.id, serialNumber: 'SER-MOV-ALTA' });
      expect(response.status).toBe(201);
      const unitId = response.body.data.unit.id;

      expect(await countMovements()).toBe(before + 1);
      const movement = await prismaTest.movement.findFirst({
        where: { inventoryUnitId: unitId },
      });
      expect(movement.type).toBe('ENTRY');
      expect(movement.responsibleId).toBe(admin.user.id);
      expect(movement.createdAt).toBeInstanceOf(Date);
      expect(movement.itemId).toBe(item.id);
    });

    it('AC-MOV-01-2 — El ensamblaje y el desensamblaje dejan un movimiento cada uno', async () => {
      const childItem = await createItem(category.id, { name: 'Componente' });
      const compound = await createItem(category.id, { name: 'Compuesto' });
      await prismaTest.itemComponent.create({
        data: { parentItemId: compound.id, childItemId: childItem.id, isRequired: true },
      });
      const parentUnit = await createUnit(compound.id);
      const childUnit = await createUnit(childItem.id);
      const before = await countMovements();

      const assembled = await request(app)
        .post(`/api/inventory/${parentUnit.id}/assemble`)
        .set('Authorization', admin.token)
        .send({ childUnitIds: [childUnit.id] });
      expect(assembled.status).toBe(200);
      expect(await countMovements()).toBe(before + 1);

      const assemblyMovement = await prismaTest.movement.findFirst({
        where: { type: 'ASSEMBLY' },
      });
      expect(assemblyMovement.inventoryUnitId).toBe(parentUnit.id);
      expect(assemblyMovement.itemId).toBe(compound.id);
      expect(assemblyMovement.responsibleId).toBe(admin.user.id);

      const disassembled = await request(app)
        .post(`/api/inventory/${parentUnit.id}/disassemble`)
        .set('Authorization', admin.token)
        .send({ childUnitIds: [childUnit.id] });
      expect(disassembled.status).toBe(200);
      expect(await countMovements()).toBe(before + 2);

      const disassemblyMovement = await prismaTest.movement.findFirst({
        where: { type: 'DISASSEMBLY' },
      });
      expect(disassemblyMovement.inventoryUnitId).toBe(parentUnit.id);
      expect(disassemblyMovement.responsibleId).toBe(admin.user.id);
    });

    it('AC-MOV-01-3 — La entrega y la devolución dejan un movimiento cada uno con la solicitud', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      const created = await createRequestViaApi(instructor.token, [
        { itemId: item.id, requestedQty: 2 },
      ]);
      expect(created.status).toBe(201);
      const requestId = created.body.data.request.id;

      const delivered = await takeThroughDelivery(admin.token, requestId);
      expect(delivered.status).toBe(200);

      const loanMovements = await getRequestMovements(requestId, 'LOAN');
      expect(loanMovements).toHaveLength(2);
      const loanedSerials = loanMovements.map((movement) => movement.inventoryUnitId).sort();
      expect(loanedSerials).toEqual(units.map((unit) => unit.id).sort());
      loanMovements.forEach((movement) => {
        expect(movement.responsibleId).toBe(admin.user.id);
        expect(movement.requestId).toBe(requestId);
      });

      const returned = await request(app)
        .post('/api/loans/return')
        .set('Authorization', admin.token)
        .send({
          returns: [
            { serialNumber: units[0].serialNumber, functioning: 'FUNCIONA', damageState: 'SIN_DANO' },
          ],
        });
      expect(returned.status).toBe(200);

      const returnMovements = await getRequestMovements(requestId, 'RETURN');
      expect(returnMovements).toHaveLength(1);
      expect(returnMovements[0].inventoryUnitId).toBe(units[0].id);
      expect(returnMovements[0].requestId).toBe(requestId);
    });

    it('AC-MOV-01-4 — La baja y la pérdida dejan un movimiento de baja con su motivo', async () => {
      // Baja directa de una unidad.
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      const before = await countMovements();
      const disposal = await request(app)
        .delete(`/api/inventory/${unit.id}`)
        .set('Authorization', admin.token)
        .send({ reason: 'Daño irreparable' });
      expect(disposal.status).toBe(200);
      expect(await countMovements()).toBe(before + 1);

      const disposalMovement = await prismaTest.movement.findFirst({
        where: { inventoryUnitId: unit.id, type: 'DISPOSAL' },
      });
      expect(disposalMovement).toBeDefined();
      expect(disposalMovement.notes).toBe('Daño irreparable');
      expect(disposalMovement.responsibleId).toBe(admin.user.id);

      // Pérdida de una unidad entregada.
      const loanItem = await createItem(category.id, { name: 'Prestable' });
      const loanUnit = await createUnit(loanItem.id);
      const created = await createRequestViaApi(instructor.token, [
        { itemId: loanItem.id, requestedQty: 1 },
      ]);
      const requestId = created.body.data.request.id;
      await takeThroughDelivery(admin.token, requestId);

      const beforeLoss = await countMovements();
      const loss = await request(app)
        .post('/api/loans/loss')
        .set('Authorization', admin.token)
        .send({ serialNumber: loanUnit.serialNumber, reason: 'Pérdida' });
      expect(loss.status).toBe(200);
      expect(await countMovements()).toBe(beforeLoss + 1);

      const lossMovement = await prismaTest.movement.findFirst({
        where: { inventoryUnitId: loanUnit.id, type: 'DISPOSAL' },
      });
      expect(lossMovement.notes).toBe('Pérdida');
      expect(lossMovement.requestId).toBe(requestId);
      expect(lossMovement.responsibleId).toBe(admin.user.id);
    });

    it('AC-MOV-01-5 — Crear una solicitud deja un movimiento de reserva por unidad reservada', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];

      const created = await createRequestViaApi(instructor.token, [
        { itemId: item.id, requestedQty: 2 },
      ]);
      expect(created.status).toBe(201);
      const requestId = created.body.data.request.id;

      const reservations = await getRequestMovements(requestId, 'RESERVATION');
      expect(reservations).toHaveLength(2);
      const reservedUnitIds = reservations.map((movement) => movement.inventoryUnitId).sort();
      expect(reservedUnitIds).toEqual(units.map((unit) => unit.id).sort());
      reservations.forEach((movement) => {
        expect(movement.responsibleId).toBe(instructor.user.id);
        expect(movement.itemId).toBe(item.id);
        expect(movement.requestId).toBe(requestId);
      });
    });

    it('AC-MOV-01-6 — El ajuste de cantidad de un consumible deja un movimiento solo si cambia', async () => {
      const consumable = await createItem(category.id, {
        name: 'Consumible',
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'FRASCO',
        stock: 10,
      });
      const before = await countMovements();

      const adjusted = await request(app)
        .patch(`/api/items/${consumable.id}/stock`)
        .set('Authorization', admin.token)
        .send({ stock: 12 });
      expect(adjusted.status).toBe(200);
      expect(await countMovements()).toBe(before + 1);

      const movement = await prismaTest.movement.findFirst({
        where: { itemId: consumable.id, type: 'ADJUSTMENT' },
      });
      expect(movement).toBeDefined();
      expect(movement.inventoryUnitId).toBeNull();
      expect(movement.responsibleId).toBe(admin.user.id);

      // Mismo valor: no hay movimiento ni cambio de cantidad.
      const same = await request(app)
        .patch(`/api/items/${consumable.id}/stock`)
        .set('Authorization', admin.token)
        .send({ stock: 12 });
      expect(same.status).toBe(200);
      expect(await countMovements()).toBe(before + 1);
      const stored = await prismaTest.item.findUnique({ where: { id: consumable.id } });
      expect(stored.stock).toBe(12);
    });

    it('AC-MOV-01-7 — La entrega de un consumible deja un movimiento de entrega y ninguno de reserva', async () => {
      const consumable = await createItem(category.id, {
        name: 'Cable consumible',
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'METRO',
        stock: 10,
      });

      const created = await createRequestViaApi(instructor.token, [
        { itemId: consumable.id, requestedQty: 2 },
      ]);
      expect(created.status).toBe(201);
      const requestId = created.body.data.request.id;

      // Ni reserva ni cambio de stock al crear/empacar.
      expect((await getRequestMovements(requestId, 'RESERVATION')).length).toBe(0);
      await request(app).put(`/api/requests/${requestId}/approve`).set('Authorization', admin.token);
      await request(app).put(`/api/requests/${requestId}/pack`).set('Authorization', admin.token);
      const afterPacked = await prismaTest.item.findUnique({ where: { id: consumable.id } });
      expect(afterPacked.stock).toBe(10);

      const delivered = await request(app)
        .put(`/api/requests/${requestId}/deliver`)
        .set('Authorization', admin.token);
      expect(delivered.status).toBe(200);

      const loans = await getRequestMovements(requestId, 'LOAN');
      expect(loans).toHaveLength(1);
      expect(loans[0].itemId).toBe(consumable.id);
      expect(loans[0].inventoryUnitId).toBeNull();
      expect(loans[0].quantity).toBe(2);
      expect(loans[0].responsibleId).toBe(admin.user.id);

      const stored = await prismaTest.item.findUnique({ where: { id: consumable.id } });
      expect(stored.stock).toBe(8);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-MOV-02 — Consultar el historial
  // ---------------------------------------------------------------------------------
  describe('US-MOV-02 — Historial de movimientos', () => {
    it('AC-MOV-02-1 — La consulta devuelve tipo, sujeto, actor y fecha', async () => {
      const item = await createItem(category.id);
      const unitResponse = await request(app)
        .post('/api/inventory')
        .set('Authorization', admin.token)
        .send({ itemId: item.id, serialNumber: 'SER-MOV-HIST' });
      const unitId = unitResponse.body.data.unit.id;
      const unitSerial = unitResponse.body.data.unit.serialNumber;

      const created = await createRequestViaApi(instructor.token, [
        { itemId: item.id, requestedQty: 1 },
      ]);
      const requestId = created.body.data.request.id;
      await takeThroughDelivery(admin.token, requestId);

      const response = await getMovements(admin.token, { limit: 100 });
      expect(response.status).toBe(200);
      const rows = response.body.data.data;

      const entry = rows.find((row) => row.type === 'ENTRY' && row.unit?.id === unitId);
      const delivery = rows.find((row) => row.type === 'LOAN' && row.unit?.id === unitId);
      expect(entry).toBeDefined();
      expect(delivery).toBeDefined();
      [entry, delivery].forEach((row) => {
        expect(row.type).toBeTruthy();
        expect(row.unit.serialNumber).toBe(unitSerial);
        expect(row.actor.id).toBe(admin.user.id);
        expect(row.date).toBeTruthy();
      });
    });

    it('AC-MOV-02-2 — Se filtra por unidad, elemento, tipo y rango de fechas', async () => {
      const itemA = await createItem(category.id, { name: 'Elemento A' });
      const itemB = await createItem(category.id, { name: 'Elemento B' });
      const unitA = await createUnit(itemA.id);
      const unitB = await createUnit(itemB.id);

      await prismaTest.movement.createMany({
        data: [
          {
            type: 'ENTRY',
            itemId: itemA.id,
            inventoryUnitId: unitA.id,
            quantity: 1,
            responsibleId: admin.user.id,
            createdAt: new Date('2026-03-01T10:00:00Z'),
          },
          {
            type: 'DISPOSAL',
            itemId: itemA.id,
            inventoryUnitId: unitA.id,
            quantity: 1,
            responsibleId: admin.user.id,
            notes: 'Baja',
            createdAt: new Date('2026-03-02T10:00:00Z'),
          },
          {
            type: 'ENTRY',
            itemId: itemB.id,
            inventoryUnitId: unitB.id,
            quantity: 1,
            responsibleId: admin.user.id,
            createdAt: new Date('2026-03-03T10:00:00Z'),
          },
          {
            type: 'LOAN',
            itemId: itemB.id,
            inventoryUnitId: unitB.id,
            quantity: 1,
            responsibleId: admin.user.id,
            createdAt: new Date('2026-03-05T10:00:00Z'),
          },
        ],
      });

      const byUnit = await getMovements(admin.token, { inventoryUnitId: unitA.id });
      expect(byUnit.body.data.data).toHaveLength(2);
      byUnit.body.data.data.forEach((row) => expect(row.unit.id).toBe(unitA.id));
      expect(byUnit.body.data.data.some((row) => row.unit.id === unitB.id)).toBe(false);

      const byItem = await getMovements(admin.token, { itemId: itemB.id });
      expect(byItem.body.data.data.every((row) => row.item.id === itemB.id)).toBe(true);
      expect(byItem.body.data.data.some((row) => row.item.id === itemA.id)).toBe(false);

      const byType = await getMovements(admin.token, { type: 'ENTRY' });
      expect(byType.body.data.data).toHaveLength(2);
      expect(byType.body.data.data.every((row) => row.type === 'ENTRY')).toBe(true);
      expect(byType.body.data.data.some((row) => row.type === 'DISPOSAL')).toBe(false);

      const byRange = await getMovements(admin.token, {
        from: '2026-03-01',
        to: '2026-03-03',
      });
      expect(byRange.body.data.data).toHaveLength(3); // los dos bordes entran
      expect(
        byRange.body.data.data.some(
          (row) => new Date(row.date).toISOString().slice(0, 10) === '2026-03-05'
        )
      ).toBe(false);
    });

    it('AC-MOV-02-3 — El instructor no accede al historial de movimientos', async () => {
      const item = await createItem(category.id);
      await prismaTest.movement.create({
        data: { type: 'ENTRY', itemId: item.id, quantity: 1, responsibleId: admin.user.id },
      });

      const response = await getMovements(instructor.token);
      expect(response.status).toBe(403);
      expect(response.body.data).toBeUndefined();
    });

    it('AC-MOV-02-4 — La consulta del historial es paginada, con total y sin solapamiento', async () => {
      const item = await createItem(category.id);
      await prismaTest.movement.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          type: 'ENTRY',
          itemId: item.id,
          quantity: 1,
          responsibleId: admin.user.id,
          createdAt: new Date(Date.now() - index * 60000),
        })),
      });

      const firstPage = await getMovements(admin.token, { page: 1, limit: 20 });
      expect(firstPage.status).toBe(200);
      expect(firstPage.body.data.data).toHaveLength(20);
      expect(firstPage.body.data.meta.total).toBe(25);

      const secondPage = await getMovements(admin.token, { page: 2, limit: 20 });
      expect(secondPage.body.data.data).toHaveLength(5);

      const firstIds = new Set(firstPage.body.data.data.map((row) => row.id));
      const secondIds = secondPage.body.data.data.map((row) => row.id);
      secondIds.forEach((id) => expect(firstIds.has(id)).toBe(false));
      expect(firstIds.size + secondIds.length).toBe(25);

      // Repetir el recorrido da el mismo reparto (orden determinista).
      const repeat = await getMovements(admin.token, { page: 1, limit: 20 });
      expect(repeat.body.data.data.map((row) => row.id)).toEqual(
        firstPage.body.data.data.map((row) => row.id)
      );
    });
  });
});
