import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Tests de verificación del Módulo 07 — Préstamos y devoluciones.
 * Primera entrega: US-PRE-01 (consulta de préstamos activos) y US-PRE-02 (devoluciones).
 * Cada `it` lleva el id del criterio en el nombre (`reparto.md` §3).
 */

const PASSWORD = 'Password123';
let sequence = 0;

const dateOffset = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

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

const createInstructor = (email = 'cmendoza@sena.edu.co') =>
  loginAs({ email, fullName: `Instructor ${email}`, role: 'INSTRUCTOR', shift: 'MORNING' });

async function createCategory() {
  return prismaTest.category.create({
    data: { name: `Cat-${Date.now()}-${Math.random()}` },
  });
}

async function createItem(categoryId, overrides = {}) {
  return prismaTest.item.create({
    data: {
      code: `PRE-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: 'Elemento prestable',
      categoryId,
      ...overrides,
    },
  });
}

let serialSequence = 0;
async function createUnit(itemId, overrides = {}) {
  serialSequence += 1;
  return prismaTest.inventoryUnit.create({
    data: {
      itemId,
      serialNumber: `SN-PRE-${serialSequence}`,
      status: 'AVAILABLE',
      physicalState: 'GOOD',
      ...overrides,
    },
  });
}

/**
 * Solicitud con unidades entregadas (préstamo real): Request + RequestItem + RequestItemUnit
 * con `loanedAt` y unidades en estado LOANED.
 */
async function createDeliveredLoan({
  requesterId,
  itemId,
  units,
  pickupDate = dateOffset(-3),
  estimatedDate = dateOffset(10),
  status = 'DELIVERED',
  approvedQty = units.length,
  deliveredQty = units.length,
}) {
  sequence += 1;
  const requestRow = await prismaTest.request.create({
    data: {
      code: `SOL-PRE-${sequence}`,
      requesterId,
      status,
      requestDate: new Date(`${pickupDate}T00:00:00Z`),
      estimatedDate: new Date(`${estimatedDate}T00:00:00Z`),
      requestItems: {
        create: {
          itemId,
          requestedQty: approvedQty,
          approvedQty,
          deliveredQty,
        },
      },
    },
    include: { requestItems: true },
  });
  const requestItem = requestRow.requestItems[0];

  const assignments = [];
  for (const unit of units) {
    assignments.push(
      await prismaTest.requestItemUnit.create({
        data: { requestItemId: requestItem.id, inventoryUnitId: unit.id, loanedAt: new Date() },
      })
    );
    await prismaTest.inventoryUnit.update({
      where: { id: unit.id },
      data: { status: 'LOANED' },
    });
  }

  return { request: requestRow, requestItem, assignments };
}

const getLoans = (token, params = {}) =>
  request(app).get('/api/loans').query(params).set('Authorization', token);

const getReturns = (token, params = {}) =>
  request(app).get('/api/loans/returns').query(params).set('Authorization', token);

const getPending = (token, requestId) =>
  request(app)
    .get('/api/loans/pending')
    .query({ requestId })
    .set('Authorization', token);

const postReturn = (token, body) =>
  request(app).post('/api/loans/return').set('Authorization', token).send(body);

const countReturns = () =>
  prismaTest.requestItemUnit.count({ where: { returnedAt: { not: null } } });


const getDamageTasks = (token, params = {}) =>
  request(app).get('/api/loans/damage-tasks').query(params).set('Authorization', token);

const resolveDamageTask = (token, id, body = {}) =>
  request(app)
    .patch(`/api/loans/damage-tasks/${id}/resolve`)
    .set('Authorization', token)
    .send(body);

const postLoss = (token, body) =>
  request(app).post('/api/loans/loss').set('Authorization', token).send(body);

const countLossMovements = () =>
  prismaTest.movement.count({ where: { type: 'DISPOSAL' } });

const countOpenTasks = async (token) => {
  const response = await getDamageTasks(token, { status: 'OPEN' });
  return response.body.data.meta.total;
};

const returnPayload = (serialNumber, overrides = {}) => ({
  serialNumber,
  functioning: 'FUNCIONA',
  damageState: 'SIN_DANO',
  description: 'Devolución en buen estado',
  ...overrides,
});

describe('Módulo 07 — Préstamos y devoluciones (US-PRE-01/02)', () => {
  let admin;
  let instructor;
  let otherInstructor;
  let category;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
    instructor = await createInstructor();
    otherInstructor = await createInstructor('ltorres@misena.edu.co');
    category = await createCategory();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-01 — Consultar los préstamos activos
  // ---------------------------------------------------------------------------------
  describe('US-PRE-01 — Consultar préstamos activos', () => {
    it('AC-PRE-01-1 — La consulta lista las unidades prestadas con tenedor y sus dos fechas', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
        pickupDate: dateOffset(-3),
        estimatedDate: dateOffset(10),
      });

      // Una unidad ya devuelta no debe figurar en la consulta.
      const returnedUnit = await createUnit(item.id);
      const other = await createDeliveredLoan({
        requesterId: otherInstructor.user.id,
        itemId: item.id,
        units: [returnedUnit],
      });
      await postReturn(admin.token, { returns: [returnPayload(returnedUnit.serialNumber)] });

      const response = await getLoans(admin.token);
      expect(response.status).toBe(200);
      const serials = response.body.data.data.map((row) => row.serialNumber);
      expect(serials).toEqual(expect.arrayContaining(units.map((unit) => unit.serialNumber)));
      expect(serials).not.toContain(returnedUnit.serialNumber);

      const row = response.body.data.data.find(
        (entry) => entry.serialNumber === units[0].serialNumber
      );
      expect(row.requester.id).toBe(instructor.user.id);
      expect(new Date(row.pickupDate).toISOString().slice(0, 10)).toBe(dateOffset(-3));
      expect(new Date(row.estimatedReturnDate).toISOString().slice(0, 10)).toBe(dateOffset(10));
      expect(requestRow.id).toBeDefined();
      expect(other.assignments).toHaveLength(1);
    });

    it('AC-PRE-01-2 — Una fecha estimada pasada figura vencida, sin ninguna consecuencia', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [unit],
        pickupDate: dateOffset(-10),
        estimatedDate: dateOffset(-5),
      });

      const response = await getLoans(admin.token);
      const row = response.body.data.data.find((entry) => entry.serialNumber === unit.serialNumber);
      expect(row.overdue).toBe(true);
      expect(row.unitStatus).toBe('LOANED');
      expect(new Date(row.pickupDate).toISOString().slice(0, 10)).toBe(dateOffset(-10));

      // El instructor no queda bloqueado: puede crear una solicitud nueva.
      const availableItem = await createItem(category.id, { name: 'Disponible' });
      await createUnit(availableItem.id);
      const requestsBefore = await prismaTest.request.count();
      const createResponse = await request(app)
        .post('/api/requests')
        .set('Authorization', instructor.token)
        .send({ items: [{ itemId: availableItem.id, requestedQty: 1 }] });
      expect(createResponse.status).toBe(201);
      expect(await prismaTest.request.count()).toBe(requestsBefore + 1);

      const unitAfter = await prismaTest.inventoryUnit.findUnique({ where: { id: unit.id } });
      expect(unitAfter.status).toBe('LOANED');
      expect(unitAfter.physicalState).toBe('GOOD');
    });

    it('AC-PRE-01-3 — El instructor solo ve sus propios préstamos', async () => {
      const item = await createItem(category.id);
      const ownUnit = await createUnit(item.id);
      const otherUnit = await createUnit(item.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [ownUnit],
      });
      await createDeliveredLoan({
        requesterId: otherInstructor.user.id,
        itemId: item.id,
        units: [otherUnit],
      });

      const response = await getLoans(instructor.token);
      expect(response.status).toBe(200);
      const serials = response.body.data.data.map((row) => row.serialNumber);
      expect(serials).toContain(ownUnit.serialNumber);
      expect(serials).not.toContain(otherUnit.serialNumber);
      expect(JSON.stringify(response.body)).not.toContain(otherUnit.serialNumber);
    });

    it('AC-PRE-01-4 — La consulta de préstamos activos es paginada y devuelve el total', async () => {
      const item = await createItem(category.id);
      const units = [];
      for (let index = 0; index < 25; index += 1) {
        units.push(await createUnit(item.id));
      }
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      const response = await getLoans(admin.token, { page: 1, limit: 20 });
      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(20);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(2);
    });

    it('AC-PRE-01-5 — La fecha estimada no tiene ningún efecto sobre la devolución', async () => {
      const pastItem = await createItem(category.id, { name: 'Vencido' });
      const pastUnit = await createUnit(pastItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: pastItem.id,
        units: [pastUnit],
        estimatedDate: dateOffset(-5),
      });

      const before = await countReturns();
      const pastResponse = await postReturn(admin.token, {
        returns: [returnPayload(pastUnit.serialNumber, { description: 'Tarde, sin sanción' })],
      });
      expect(pastResponse.status).toBe(200);
      expect(await countReturns()).toBe(before + 1);

      const pastStored = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: pastUnit.id },
      });
      expect(pastStored.returnedAt).not.toBeNull();
      expect(pastStored.returnFunctioning).toBe('FUNCIONA');
      const instructorStored = await prismaTest.user.findUnique({
        where: { id: instructor.user.id },
      });
      expect(instructorStored.isActive).toBe(true);

      // Mismo resultado con fecha futura: la fecha no cambia nada.
      const futureItem = await createItem(category.id, { name: 'Futuro' });
      const futureUnit = await createUnit(futureItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: futureItem.id,
        units: [futureUnit],
        estimatedDate: dateOffset(30),
      });
      const beforeFuture = await countReturns();
      const futureResponse = await postReturn(admin.token, {
        returns: [returnPayload(futureUnit.serialNumber)],
      });
      expect(futureResponse.status).toBe(200);
      expect(await countReturns()).toBe(beforeFuture + 1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-02 — Registrar una devolución
  // ---------------------------------------------------------------------------------
  describe('US-PRE-02 — Registrar devoluciones', () => {
    it('AC-PRE-02-1 — Registrar una devolución exige seleccionar las unidades concretas', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      const { requestItem } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      const emptyResponse = await postReturn(admin.token, { returns: [] });
      expect(emptyResponse.status).toBe(400);
      expect(await countReturns()).toBe(0);
      const stillLoaned = await prismaTest.requestItemUnit.findMany({
        where: { requestItemId: requestItem.id },
      });
      stillLoaned.forEach((row) => expect(row.returnedAt).toBeNull());
      expect((await prismaTest.request.findUnique({ where: { id: requestItem.requestId } })).status)
        .toBe('DELIVERED');

      // Selección de un subconjunto: 2 de 3.
      const threeItem = await createItem(category.id, { name: 'Tres unidades' });
      const three = [await createUnit(threeItem.id), await createUnit(threeItem.id), await createUnit(threeItem.id)];
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: threeItem.id,
        units: three,
      });
      const response = await postReturn(admin.token, {
        returns: [returnPayload(three[0].serialNumber), returnPayload(three[1].serialNumber)],
      });
      expect(response.status).toBe(200);
      const third = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: three[2].id },
      });
      expect(third.returnedAt).toBeNull();
    });

    it('AC-PRE-02-2 — La devolución puede ser parcial y lo no devuelto sigue prestado', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id), await createUnit(item.id)];
      const { request } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
        pickupDate: dateOffset(-4),
      });

      const response = await postReturn(admin.token, {
        returns: [returnPayload(units[0].serialNumber), returnPayload(units[1].serialNumber)],
      });
      expect(response.status).toBe(200);

      const loans = await getLoans(admin.token);
      const serials = loans.body.data.data.map((row) => row.serialNumber);
      expect(serials).not.toContain(units[0].serialNumber);
      expect(serials).not.toContain(units[1].serialNumber);
      expect(serials).toContain(units[2].serialNumber);
      const remaining = loans.body.data.data.find(
        (row) => row.serialNumber === units[2].serialNumber
      );
      expect(remaining.requester.id).toBe(instructor.user.id);
      expect(new Date(remaining.pickupDate).toISOString().slice(0, 10)).toBe(dateOffset(-4));

      // Solicitud PARTIALLY_DELIVERED: vuelve una de las dos entregadas y sigue igual.
      const partialItem = await createItem(category.id, { name: 'Parcial' });
      const deliveredUnits = [await createUnit(partialItem.id), await createUnit(partialItem.id)];
      const { request: partialRequest } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: partialItem.id,
        units: deliveredUnits,
        status: 'PARTIALLY_DELIVERED',
        approvedQty: 3,
        deliveredQty: 2,
      });

      const partialResponse = await postReturn(admin.token, {
        returns: [returnPayload(deliveredUnits[0].serialNumber)],
      });
      expect(partialResponse.status).toBe(200);
      const partialStored = await prismaTest.request.findUnique({
        where: { id: partialRequest.id },
      });
      expect(partialStored.status).toBe('PARTIALLY_DELIVERED');
      const stillLoanedPartial = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: deliveredUnits[1].id },
      });
      expect(stillLoanedPartial.returnedAt).toBeNull();
      expect(request.id).toBeDefined();
    });

    it('AC-PRE-02-3 — Cada unidad devuelta registra su condición y una descripción', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(units[0].serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'DESGASTE_NORMAL',
            description: 'Desgaste leve de la carcasa',
          }),
          returnPayload(units[1].serialNumber, {
            functioning: 'FUNCIONA_CON_FALLA',
            damageState: 'DANADO',
            description: 'No enciende el botón',
          }),
        ],
      });
      expect(response.status).toBe(200);

      const history = await getReturns(admin.token, { limit: 100 });
      const first = history.body.data.data.find(
        (row) => row.serialNumber === units[0].serialNumber
      );
      const second = history.body.data.data.find(
        (row) => row.serialNumber === units[1].serialNumber
      );
      expect(first.functioning).toBe('FUNCIONA');
      expect(first.damageState).toBe('DESGASTE_NORMAL');
      expect(first.description).toBe('Desgaste leve de la carcasa');
      expect(second.functioning).toBe('FUNCIONA_CON_FALLA');
      expect(second.damageState).toBe('DANADO');
      expect(second.description).toBe('No enciende el botón');
    });

    it('AC-PRE-02-4 — La unidad devuelta registra fecha y vuelve a estar disponible', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });

      const response = await postReturn(admin.token, {
        returns: [returnPayload(unit.serialNumber)],
      });
      expect(response.status).toBe(200);

      const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unit.id } });
      expect(stored.status).toBe('AVAILABLE');
      expect(stored.physicalState).toBe('GOOD');

      const assignment = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: unit.id },
      });
      expect(assignment.returnedAt).not.toBeNull();

      const loans = await getLoans(admin.token);
      expect(loans.body.data.data.map((row) => row.serialNumber)).not.toContain(
        unit.serialNumber
      );
    });

    it('AC-PRE-02-5 — Devolver una unidad que no está prestada en esa solicitud se rechaza sin efectos', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });

      // Unidad del inventario que no está prestada.
      const freeUnit = await createUnit(item.id);
      const before = await countReturns();
      const response = await postReturn(admin.token, {
        returns: [returnPayload(freeUnit.serialNumber)],
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(await countReturns()).toBe(before);
      const freeAfter = await prismaTest.inventoryUnit.findUnique({ where: { id: freeUnit.id } });
      expect(freeAfter.status).toBe('AVAILABLE');
      expect(freeAfter.physicalState).toBe('GOOD');

      // Unidad prestada en la solicitud B, devuelta «en» la solicitud A.
      const requestBItem = await createItem(category.id, { name: 'Solicitud B' });
      const unitB = await createUnit(requestBItem.id);
      const loanB = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: requestBItem.id,
        units: [unitB],
      });
      const loanAItem = await createItem(category.id, { name: 'Solicitud A' });
      const unitA = await createUnit(loanAItem.id);
      const loanA = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: loanAItem.id,
        units: [unitA],
      });

      const mismatch = await postReturn(admin.token, {
        requestId: loanA.request.id,
        returns: [returnPayload(unitB.serialNumber)],
      });
      expect(mismatch.status).toBeGreaterThanOrEqual(400);
      expect(await countReturns()).toBe(before);
      const unitBAfter = await prismaTest.inventoryUnit.findUnique({ where: { id: unitB.id } });
      const unitAAfter = await prismaTest.inventoryUnit.findUnique({ where: { id: unitA.id } });
      expect(unitBAfter.status).toBe('LOANED');
      expect(unitAAfter.status).toBe('LOANED');
      const requestBStatus = await prismaTest.request.findUnique({
        where: { id: loanB.request.id },
      });
      expect(requestBStatus.status).toBe('DELIVERED');
    });

    it('AC-PRE-02-6 — La condición registra funcionamiento y estado al devolver con la escala aprobada', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(units[0].serialNumber, {
            functioning: 'FUNCIONA_CON_FALLA',
            damageState: 'DANADO',
          }),
          returnPayload(units[1].serialNumber, {
            functioning: 'NO_FUNCIONA',
            damageState: 'DESGASTE_NORMAL',
          }),
        ],
      });
      expect(response.status).toBe(200);

      const history = await getReturns(admin.token);
      history.body.data.data.forEach((row) => {
        expect(['FUNCIONA', 'FUNCIONA_CON_FALLA', 'NO_FUNCIONA']).toContain(row.functioning);
        expect(['SIN_DANO', 'DESGASTE_NORMAL', 'DANADO']).toContain(row.damageState);
      });

      // Ejes cruzados inválidos: no se acepta una escala única.
      const invalidItem = await createItem(category.id, { name: 'Ejes cruzados' });
      const invalidUnit = await createUnit(invalidItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: invalidItem.id,
        units: [invalidUnit],
      });
      const beforeInvalid = await countReturns();
      const invalidResponse = await postReturn(admin.token, {
        returns: [
          {
            serialNumber: invalidUnit.serialNumber,
            functioning: 'DESGASTE_NORMAL',
            damageState: 'FUNCIONA',
          },
        ],
      });
      expect(invalidResponse.status).toBe(400);
      expect(await countReturns()).toBe(beforeInvalid);
      const invalidStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: invalidUnit.id },
      });
      expect(invalidStored.status).toBe('LOANED');
    });

    it('AC-PRE-02-7 — La condición actualiza el estado físico en la misma operación', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA_CON_FALLA',
            damageState: 'SIN_DANO',
          }),
        ],
      });
      expect(response.status).toBe(200);

      const unitResponse = await request(app)
        .get(`/api/inventory/${unit.id}`)
        .set('Authorization', admin.token);
      expect(unitResponse.status).toBe(200);
      expect(unitResponse.body.data.unit.physicalState).toBe('REGULAR');
    });

    it('AC-PRE-02-8 — La condición registra funcionamiento y estado por separado', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(units[0].serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'DANADO',
            description: 'Rayado profundo',
          }),
          returnPayload(units[1].serialNumber, {
            functioning: 'FUNCIONA_CON_FALLA',
            damageState: 'DANADO',
            description: 'Botón duro',
          }),
        ],
      });
      expect(response.status).toBe(200);

      const history = await getReturns(admin.token);
      const first = history.body.data.data.find(
        (row) => row.serialNumber === units[0].serialNumber
      );
      const second = history.body.data.data.find(
        (row) => row.serialNumber === units[1].serialNumber
      );
      // Difieren solo en el funcionamiento: quedan distinguibles.
      expect(first.damageState).toBe(second.damageState);
      expect(first.functioning).not.toBe(second.functioning);
      expect(first.description).not.toBe(second.description);
    });

    it('AC-PRE-02-9 — El estado físico se determina por el mapeo de RN-PRE-12', async () => {
      const item = await createItem(category.id);
      const combinations = [
        { functioning: 'FUNCIONA', damageState: 'SIN_DANO', expected: 'GOOD' },
        { functioning: 'FUNCIONA', damageState: 'DESGASTE_NORMAL', expected: 'GOOD' },
        { functioning: 'FUNCIONA', damageState: 'DANADO', expected: 'GOOD' },
        { functioning: 'FUNCIONA_CON_FALLA', damageState: 'SIN_DANO', expected: 'REGULAR' },
        { functioning: 'FUNCIONA_CON_FALLA', damageState: 'DANADO', expected: 'REGULAR' },
        { functioning: 'NO_FUNCIONA', damageState: 'DANADO', expected: 'REGULAR' },
      ];
      const units = [];
      for (let index = 0; index < combinations.length; index += 1) {
        units.push(await createUnit(item.id));
      }
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });

      const response = await postReturn(admin.token, {
        returns: combinations.map((combination, index) =>
          returnPayload(units[index].serialNumber, combination)
        ),
      });
      expect(response.status).toBe(200);

      for (let index = 0; index < combinations.length; index += 1) {
        const stored = await prismaTest.inventoryUnit.findUnique({
          where: { id: units[index].id },
        });
        expect(stored.physicalState).toBe(combinations[index].expected);
      }

      // El administrador puede corregir el estado físico a mano; la condición se conserva.
      const corrected = await request(app)
        .put(`/api/inventory/${units[5].id}`)
        .set('Authorization', admin.token)
        .send({ physicalState: 'DAMAGED' });
      expect(corrected.status).toBe(200);
      const history = await getReturns(admin.token, { limit: 100 });
      const row = history.body.data.data.find(
        (entry) => entry.serialNumber === units[5].serialNumber
      );
      expect(row.functioning).toBe('NO_FUNCIONA');
      expect(row.damageState).toBe('DANADO');
    });

    it('AC-PRE-02-10 — La devolución exige la condición de retorno de cada unidad', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });

      const before = await countReturns();
      const response = await postReturn(admin.token, {
        returns: [
          { serialNumber: units[0].serialNumber },
          { serialNumber: units[1].serialNumber },
        ],
      });
      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body).toLowerCase()).toContain('condici');
      expect(await countReturns()).toBe(before);
      units.forEach(async (unit) => {
        const stored = await prismaTest.inventoryUnit.findUnique({ where: { id: unit.id } });
        expect(stored.status).toBe('LOANED');
        expect(stored.physicalState).toBe('GOOD');
      });

      const validResponse = await postReturn(admin.token, {
        returns: [returnPayload(units[0].serialNumber), returnPayload(units[1].serialNumber)],
      });
      expect(validResponse.status).toBe(200);

      // Un consumible no aparece entre las unidades por devolver.
      const consumable = await prismaTest.item.create({
        data: {
          code: `CON-${Date.now()}`,
          name: 'Cable consumible',
          categoryId: category.id,
          isConsumable: true,
          ownership: 'DONATED',
          unit: 'METRO',
          stock: 10,
        },
      });
      sequence += 1;
      const consumableRequest = await prismaTest.request.create({
        data: {
          code: `SOL-CON-${sequence}`,
          requesterId: instructor.user.id,
          status: 'DELIVERED',
          requestDate: new Date(),
          requestItems: {
            create: { itemId: consumable.id, requestedQty: 2, approvedQty: 2, deliveredQty: 2 },
          },
        },
      });
      const pending = await getPending(admin.token, consumableRequest.id);
      expect(pending.status).toBe(200);
      expect(
        pending.body.data.data.some((row) => row.item.id === consumable.id)
      ).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-03 — Registrar daños en la devolución
  // ---------------------------------------------------------------------------------
  describe('US-PRE-03 — Daños y tareas pendientes', () => {
    it('AC-PRE-03-1 — Una devolución con daño queda registrada con su descripción', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'DANADO',
            description: 'Carcasa rota por caída',
          }),
        ],
      });
      expect(response.status).toBe(200);

      const history = await getReturns(admin.token, { serialNumber: unit.serialNumber });
      const row = history.body.data.data.find((entry) => entry.serialNumber === unit.serialNumber);
      expect(row.damageState).toBe('DANADO');
      expect(row.description).toBe('Carcasa rota por caída');
    });

    it('AC-PRE-03-2 — El daño genera una tarea pendiente visible para el administrador', async () => {
      const before = await countOpenTasks(admin.token);

      const damagedItem = await createItem(category.id, { name: 'Con daño' });
      const damagedUnit = await createUnit(damagedItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: damagedItem.id,
        units: [damagedUnit],
      });
      await postReturn(admin.token, {
        returns: [
          returnPayload(damagedUnit.serialNumber, {
            damageState: 'DANADO',
            description: 'Puerto de carga hundido',
          }),
        ],
      });

      const after = await countOpenTasks(admin.token);
      expect(after).toBe(before + 1);
      const tasks = await getDamageTasks(admin.token, { status: 'OPEN', limit: 100 });
      const task = tasks.body.data.data.find(
        (entry) => entry.inventoryUnit.serialNumber === damagedUnit.serialNumber
      );
      expect(task).toBeDefined();
      expect(task.description).toBe('Puerto de carga hundido');

      // Control negativo: devolución sin daño no crea tarea.
      const goodItem = await createItem(category.id, { name: 'Sin daño' });
      const goodUnit = await createUnit(goodItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: goodItem.id,
        units: [goodUnit],
      });
      await postReturn(admin.token, {
        returns: [returnPayload(goodUnit.serialNumber, { description: 'Todo correcto' })],
      });
      expect(await countOpenTasks(admin.token)).toBe(after);
    });

    it('AC-PRE-03-3 — La tarea pendiente puede marcarse como resuelta', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            damageState: 'DANADO',
            description: 'Rayón profundo',
          }),
        ],
      });
      const tasks = await getDamageTasks(admin.token, { status: 'OPEN', limit: 100 });
      const task = tasks.body.data.data.find(
        (entry) => entry.inventoryUnit.serialNumber === unit.serialNumber
      );
      const before = await countOpenTasks(admin.token);

      const response = await resolveDamageTask(admin.token, task.id, {
        resolutionNote: 'Se reemplazó la carcasa',
      });
      expect(response.status).toBe(200);
      expect(await countOpenTasks(admin.token)).toBe(before - 1);

      const history = await getReturns(admin.token, { serialNumber: unit.serialNumber });
      expect(history.body.data.data[0].description).toBe('Rayón profundo');
    });

    it('AC-PRE-03-4 — El daño no produce ninguna consecuencia sobre el instructor', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'NO_FUNCIONA',
            damageState: 'DANADO',
            description: 'No enciende',
          }),
        ],
      });

      const availableItem = await createItem(category.id, { name: 'Disponible' });
      await createUnit(availableItem.id);
      const requestsBefore = await prismaTest.request.count();
      const response = await request(app)
        .post('/api/requests')
        .set('Authorization', instructor.token)
        .send({ items: [{ itemId: availableItem.id, requestedQty: 1 }] });
      expect(response.status).toBe(201);
      expect(await prismaTest.request.count()).toBe(requestsBefore + 1);

      const stored = await prismaTest.user.findUnique({ where: { id: instructor.user.id } });
      expect(stored.isActive).toBe(true);
      const loans = await getLoans(instructor.token);
      expect(loans.status).toBe(200);
    });

    it('AC-PRE-03-5 — La tarea la resuelve el administrador, con nota opcional y sin reapertura', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            damageState: 'DANADO',
            description: 'Golpe lateral',
          }),
        ],
      });
      const tasks = await getDamageTasks(admin.token, { status: 'OPEN', limit: 100 });
      const task = tasks.body.data.data.find(
        (entry) => entry.inventoryUnit.serialNumber === unit.serialNumber
      );

      // Instructor no puede resolver.
      const forbidden = await resolveDamageTask(instructor.token, task.id, {
        resolutionNote: 'Intento',
      });
      expect(forbidden.status).toBe(403);
      expect(await countOpenTasks(admin.token)).toBeGreaterThanOrEqual(1);

      // Administrador resuelve con nota.
      const resolved = await resolveDamageTask(admin.token, task.id, {
        resolutionNote: 'Se mandó a reparar',
      });
      expect(resolved.status).toBe(200);
      const allTasks = await getDamageTasks(admin.token, { status: 'RESOLVED', limit: 100 });
      const resolvedTask = allTasks.body.data.data.find((entry) => entry.id === task.id);
      expect(resolvedTask.resolutionNote).toBe('Se mandó a reparar');

      // Reabrir se rechaza.
      const reopen = await request(app)
        .patch(`/api/loans/damage-tasks/${task.id}/resolve`)
        .set('Authorization', admin.token)
        .send({ resolutionNote: 'Otra vez' });
      expect(reopen.status).toBeGreaterThanOrEqual(400);
      const stillResolved = await getDamageTasks(admin.token, { status: 'RESOLVED', limit: 100 });
      expect(stillResolved.body.data.data.find((entry) => entry.id === task.id).status).toBe(
        'RESOLVED'
      );

      // La misma unidad vuelve a dañarse: tarea nueva, la anterior sigue resuelta.
      const again = await request(app)
        .post('/api/loans/return')
        .set('Authorization', admin.token)
        .send({ returns: [returnPayload(unit.serialNumber)] });
      expect(again.status).toBeGreaterThanOrEqual(400); // ya fue devuelta antes: no se duplica

      const loanAgain = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [unit],
      });
      expect(loanAgain.request.id).toBeDefined();
      const newDamage = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            damageState: 'DANADO',
            description: 'Nuevo daño',
          }),
        ],
      });
      expect(newDamage.status).toBe(200);
      const openTasks = await getDamageTasks(admin.token, { status: 'OPEN', limit: 100 });
      const newTask = openTasks.body.data.data.find(
        (entry) =>
          entry.inventoryUnit.serialNumber === unit.serialNumber && entry.description === 'Nuevo daño'
      );
      expect(newTask).toBeDefined();
      expect(newTask.id).not.toBe(task.id);
      const resolvedStill = await getDamageTasks(admin.token, { status: 'RESOLVED', limit: 100 });
      expect(resolvedStill.body.data.data.some((entry) => entry.id === task.id)).toBe(true);
    });

    it('AC-PRE-03-6 — Un desgaste normal con funcionamiento correcto no genera tarea', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      const before = await countOpenTasks(admin.token);

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'DESGASTE_NORMAL',
            description: 'Uso normal del equipo',
          }),
        ],
      });
      expect(response.status).toBe(200);
      expect(await countOpenTasks(admin.token)).toBe(before);

      const history = await getReturns(admin.token, { serialNumber: unit.serialNumber });
      const row = history.body.data.data[0];
      expect(row.functioning).toBe('FUNCIONA');
      expect(row.damageState).toBe('DESGASTE_NORMAL');
      expect(row.description).toBe('Uso normal del equipo');
    });

    it('AC-PRE-03-7 — Una pieza faltante deja una nota pendiente', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      const before = await countOpenTasks(admin.token);

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'SIN_DANO',
            description: 'Le falta la tapa de la batería',
          }),
        ],
      });
      expect(response.status).toBe(200);
      expect(await countOpenTasks(admin.token)).toBe(before + 1);
      const tasks = await getDamageTasks(admin.token, { status: 'OPEN', limit: 100 });
      const task = tasks.body.data.data.find(
        (entry) => entry.inventoryUnit.serialNumber === unit.serialNumber
      );
      expect(task.description).toBe('Le falta la tapa de la batería');

      // Sin reportar pieza faltante no hay tarea.
      const otherItem = await createItem(category.id, { name: 'Completo' });
      const otherUnit = await createUnit(otherItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: otherItem.id,
        units: [otherUnit],
      });
      const beforeClean = await countOpenTasks(admin.token);
      await postReturn(admin.token, {
        returns: [
          returnPayload(otherUnit.serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'SIN_DANO',
            description: 'Volvió completo y funcionando',
          }),
        ],
      });
      expect(await countOpenTasks(admin.token)).toBe(beforeClean);
    });

    it('AC-PRE-03-8 — Una unidad que vuelve sin funcionar deja nota pendiente', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      const before = await countOpenTasks(admin.token);

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'NO_FUNCIONA',
            damageState: 'SIN_DANO',
            description: 'No enciende',
          }),
        ],
      });
      expect(response.status).toBe(200);
      expect(await countOpenTasks(admin.token)).toBe(before + 1);
      const loans = await getLoans(admin.token);
      expect(loans.body.data.data.map((row) => row.serialNumber)).not.toContain(
        unit.serialNumber
      );

      // Control positivo de funcionamiento correcto: no genera nota.
      const goodItem = await createItem(category.id, { name: 'Funciona bien' });
      const goodUnit = await createUnit(goodItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: goodItem.id,
        units: [goodUnit],
      });
      const beforeGood = await countOpenTasks(admin.token);
      await postReturn(admin.token, {
        returns: [returnPayload(goodUnit.serialNumber, { description: 'Sin observaciones' })],
      });
      expect(await countOpenTasks(admin.token)).toBe(beforeGood);
    });

    it('AC-PRE-03-9 — La devolución no se puede rechazar, ni siquiera con daño', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      const before = await countReturns();

      const response = await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'NO_FUNCIONA',
            damageState: 'DANADO',
            description: 'Destrozado',
          }),
        ],
      });
      expect(response.status).toBe(200);
      expect(await countReturns()).toBe(before + 1);
      const loans = await getLoans(admin.token);
      expect(loans.body.data.data.map((row) => row.serialNumber)).not.toContain(
        unit.serialNumber
      );
      expect(await countOpenTasks(admin.token)).toBeGreaterThanOrEqual(1);

      // No existe acción de rechazo de devolución.
      const reject = await request(app)
        .post('/api/loans/return/reject')
        .set('Authorization', admin.token)
        .send({ serialNumber: unit.serialNumber });
      expect(reject.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-04 — Cerrar el préstamo
  // ---------------------------------------------------------------------------------
  describe('US-PRE-04 — Cierre del préstamo', () => {
    it('AC-PRE-04-1 — Cuando se devuelven todas las unidades, la solicitud queda COMPLETED', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      const response = await postReturn(admin.token, {
        returns: [returnPayload(units[0].serialNumber), returnPayload(units[1].serialNumber)],
      });
      expect(response.status).toBe(200);

      const stored = await prismaTest.request.findUnique({ where: { id: requestRow.id } });
      expect(stored.status).toBe('COMPLETED');
      expect(stored.completedAt).not.toBeNull();
      const active = await getLoans(admin.token);
      units.forEach((unit) => {
        expect(active.body.data.data.map((row) => row.serialNumber)).not.toContain(
          unit.serialNumber
        );
      });
    });

    it('AC-PRE-04-2 — Cuando se devuelve parte, la solicitud queda PARTIALLY_RETURNED', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id), await createUnit(item.id)];
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      await postReturn(admin.token, { returns: [returnPayload(units[0].serialNumber)] });

      const stored = await prismaTest.request.findUnique({ where: { id: requestRow.id } });
      expect(stored.status).toBe('PARTIALLY_RETURNED');
      const active = await getLoans(admin.token);
      const serials = active.body.data.data.map((row) => row.serialNumber);
      expect(serials).toContain(units[1].serialNumber);
      expect(serials).toContain(units[2].serialNumber);
    });

    it('AC-PRE-04-3 — Registrar dos veces la devolución de la misma unidad se rechaza', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [unit],
      });

      await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA',
            damageState: 'DESGASTE_NORMAL',
            description: 'Primera devolución',
          }),
        ],
      });
      const before = await countReturns();
      const firstStored = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: unit.id },
      });

      const response = await postReturn(admin.token, {
        returns: [returnPayload(unit.serialNumber, { description: 'Segunda devolución' })],
      });
      expect(response.status).toBe(409);
      expect(await countReturns()).toBe(before);

      const stored = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: unit.id },
      });
      expect(stored.returnedAt.toISOString()).toBe(firstStored.returnedAt.toISOString());
      expect(stored.returnFunctioning).toBe('FUNCIONA');
      expect(stored.returnDescription).toBe('Primera devolución');
      const requestStored = await prismaTest.request.findUnique({
        where: { id: requestRow.id },
      });
      expect(requestStored.status).toBe('COMPLETED');
    });

    it('AC-PRE-04-4 — La devolución de lo que falta no reescribe ni duplica lo ya devuelto', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id), await createUnit(item.id)];
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });

      await postReturn(admin.token, {
        returns: [
          returnPayload(units[0].serialNumber, {
            damageState: 'DESGASTE_NORMAL',
            description: 'Primera',
          }),
        ],
      });
      const firstStored = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: units[0].id },
      });
      const before = await countReturns();

      const response = await postReturn(admin.token, {
        returns: [returnPayload(units[1].serialNumber), returnPayload(units[2].serialNumber)],
      });
      expect(response.status).toBe(200);
      expect(await countReturns()).toBe(before + 2);

      const firstAfter = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: units[0].id },
      });
      expect(firstAfter.returnedAt.toISOString()).toBe(firstStored.returnedAt.toISOString());
      expect(firstAfter.returnFunctioning).toBe(firstStored.returnFunctioning);
      expect(firstAfter.returnDescription).toBe('Primera');

      const stored = await prismaTest.request.findUnique({ where: { id: requestRow.id } });
      expect(stored.status).toBe('COMPLETED');
      const active = await getLoans(admin.token);
      expect(active.body.data.data.some((row) => row.serialNumber === units[0].serialNumber)).toBe(
        false
      );
    });

    it('AC-PRE-04-5 — La devolución de lo que falta lleva PARTIALLY_RETURNED a COMPLETED', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id), await createUnit(item.id)];
      const { request: requestRow } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });
      await postReturn(admin.token, { returns: [returnPayload(units[0].serialNumber)] });

      const response = await postReturn(admin.token, {
        returns: [returnPayload(units[1].serialNumber), returnPayload(units[2].serialNumber)],
      });
      expect(response.status).toBe(200);
      const stored = await prismaTest.request.findUnique({ where: { id: requestRow.id } });
      expect(stored.status).toBe('COMPLETED');
      expect(stored.completedAt).not.toBeNull();
      const active = await getLoans(admin.token);
      const serials = active.body.data.data.map((row) => row.serialNumber);
      units.forEach((unit) => expect(serials).not.toContain(unit.serialNumber));
    });
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-05 — Declarar la pérdida
  // ---------------------------------------------------------------------------------
  describe('US-PRE-05 — Pérdida de una unidad prestada', () => {
    it('AC-PRE-05-1 — La pérdida se declara con motivo y queda registrado el actor', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });
      const beforeLosses = await countLossMovements();

      const response = await postLoss(admin.token, {
        serialNumber: units[0].serialNumber,
        reason: 'Se perdió en el aula 205',
      });
      expect(response.status).toBe(200);
      expect(await countLossMovements()).toBe(beforeLosses + 1);

      const assignment = await prismaTest.requestItemUnit.findFirst({
        where: { inventoryUnitId: units[0].id },
      });
      expect(assignment.lostAt).not.toBeNull();
      expect(assignment.lostReason).toBe('Se perdió en el aula 205');
      expect(assignment.lostById).toBe(admin.user.id);
      expect(response.body.data.lost.lostBy.id).toBe(admin.user.id);

      // La pérdida no se puede deshacer: no existe endpoint de reversión.
      const undo = await request(app)
        .delete('/api/loans/loss')
        .set('Authorization', admin.token);
      expect(undo.status).toBe(404);
    });

    it('AC-PRE-05-2 — La unidad perdida sigue el camino de su tenencia', async () => {
      const senaItem = await createItem(category.id, { name: 'Equipo SENA' });
      const senaUnit = await createUnit(senaItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: senaItem.id,
        units: [senaUnit],
      });
      const senaResponse = await postLoss(admin.token, {
        serialNumber: senaUnit.serialNumber,
        reason: 'Pérdida SENA',
      });
      expect(senaResponse.status).toBe(200);
      expect(senaResponse.body.data.lost.ownershipPath).toBe('SENA_PROCESS');
      const senaStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: senaUnit.id },
      });
      expect(senaStored.declaredLost).toBe(true);
      expect(senaStored.disposalInProgress).toBe(true);
      expect(senaStored.status).not.toBe('DISPOSED');

      const donatedItem = await createItem(category.id, {
        name: 'Equipo donado',
        ownership: 'DONATED',
      });
      const donatedUnit = await createUnit(donatedItem.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: donatedItem.id,
        units: [donatedUnit],
      });
      const donatedResponse = await postLoss(admin.token, {
        serialNumber: donatedUnit.serialNumber,
        reason: 'Pérdida donada',
      });
      expect(donatedResponse.status).toBe(200);
      expect(donatedResponse.body.data.lost.ownershipPath).toBe('DONATED_IMMEDIATE');
      const donatedStored = await prismaTest.inventoryUnit.findUnique({
        where: { id: donatedUnit.id },
      });
      expect(donatedStored.status).toBe('DISPOSED');

      const active = await getLoans(admin.token);
      const serials = active.body.data.data.map((row) => row.serialNumber);
      expect(serials).not.toContain(senaUnit.serialNumber);
      expect(serials).not.toContain(donatedUnit.serialNumber);
    });

    it('AC-PRE-05-3 — La unidad perdida deja de bloquear disponibilidad', async () => {
      const item = await createItem(category.id, { name: 'Con perdida y disponible' });
      const lostUnit = await createUnit(item.id);
      await createUnit(item.id);
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [lostUnit],
      });
      await postLoss(admin.token, { serialNumber: lostUnit.serialNumber, reason: 'Perdida' });

      const response = await request(app)
        .get('/api/catalog')
        .query({ from: dateOffset(60), to: dateOffset(65) })
        .set('Authorization', admin.token);
      expect(response.status).toBe(200);
      const row = response.body.data.data.find((entry) => entry.id === item.id);
      expect(row.availableQty).toBe(1);
      const active = await getLoans(admin.token);
      expect(active.body.data.data.map((entry) => entry.serialNumber)).not.toContain(
        lostUnit.serialNumber
      );
    });

    it('AC-PRE-05-4 — El instructor queda registrado como quien la tenía y sin consecuencia', async () => {
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id)];
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units });
      const response = await postLoss(admin.token, {
        serialNumber: units[0].serialNumber,
        reason: 'Robo',
      });
      expect(response.status).toBe(200);
      expect(response.body.data.lost.requester.id).toBe(instructor.user.id);

      const stored = await prismaTest.user.findUnique({ where: { id: instructor.user.id } });
      expect(stored.isActive).toBe(true);
      const availableItem = await createItem(category.id, { name: 'Nueva solicitud' });
      await createUnit(availableItem.id);
      const createResponse = await request(app)
        .post('/api/requests')
        .set('Authorization', instructor.token)
        .send({ items: [{ itemId: availableItem.id, requestedQty: 1 }] });
      expect(createResponse.status).toBe(201);
    });

    it('AC-PRE-05-5 — La solicitud se resuelve con las unidades restantes', async () => {
      // Escenario A: pérdida + devolución de las dos restantes → COMPLETED.
      const item = await createItem(category.id);
      const units = [await createUnit(item.id), await createUnit(item.id), await createUnit(item.id)];
      const { request: requestA } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });
      await postLoss(admin.token, { serialNumber: units[0].serialNumber, reason: 'Perdida A' });
      const responseA = await postReturn(admin.token, {
        returns: [returnPayload(units[1].serialNumber), returnPayload(units[2].serialNumber)],
      });
      expect(responseA.status).toBe(200);
      expect((await prismaTest.request.findUnique({ where: { id: requestA.id } })).status).toBe(
        'COMPLETED'
      );

      // Escenario B: pérdida + devolución de una sola → PARTIALLY_RETURNED.
      const itemB = await createItem(category.id, { name: 'Escenario B' });
      const unitsB = [await createUnit(itemB.id), await createUnit(itemB.id), await createUnit(itemB.id)];
      const { request: requestB } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: itemB.id,
        units: unitsB,
      });
      await postLoss(admin.token, { serialNumber: unitsB[0].serialNumber, reason: 'Perdida B' });
      await postReturn(admin.token, { returns: [returnPayload(unitsB[1].serialNumber)] });
      expect((await prismaTest.request.findUnique({ where: { id: requestB.id } })).status).toBe(
        'PARTIALLY_RETURNED'
      );

      // Escenario C: PARTIALLY_RETURNED, 2 devueltas y la última se declara perdida → COMPLETED.
      const itemC = await createItem(category.id, { name: 'Escenario C' });
      const unitsC = [await createUnit(itemC.id), await createUnit(itemC.id), await createUnit(itemC.id)];
      const { request: requestC } = await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: itemC.id,
        units: unitsC,
      });
      await postReturn(admin.token, {
        returns: [returnPayload(unitsC[0].serialNumber), returnPayload(unitsC[1].serialNumber)],
      });
      const beforeLossC = await countLossMovements();
      const responseC = await postLoss(admin.token, {
        serialNumber: unitsC[2].serialNumber,
        reason: 'Perdida C',
      });
      expect(responseC.status).toBe(200);
      expect(await countLossMovements()).toBe(beforeLossC + 1);
      expect((await prismaTest.request.findUnique({ where: { id: requestC.id } })).status).toBe(
        'COMPLETED'
      );
      const pending = await getPending(admin.token, requestC.id);
      expect(pending.body.data.data).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-PRE-06 — Historial de devoluciones
  // ---------------------------------------------------------------------------------
  describe('US-PRE-06 — Historial de devoluciones', () => {
    it('AC-PRE-06-1 — La consulta lista devoluciones con unidad, instructor, fecha y condición', async () => {
      const item = await createItem(category.id);
      const unit = await createUnit(item.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: item.id, units: [unit] });
      await postReturn(admin.token, {
        returns: [
          returnPayload(unit.serialNumber, {
            functioning: 'FUNCIONA_CON_FALLA',
            damageState: 'DESGASTE_NORMAL',
            description: 'Funciona con ruido',
          }),
        ],
      });

      const response = await getReturns(admin.token);
      expect(response.status).toBe(200);
      const row = response.body.data.data.find((entry) => entry.serialNumber === unit.serialNumber);
      expect(row).toBeDefined();
      expect(row.requester.id).toBe(instructor.user.id);
      expect(row.returnedAt).toBeTruthy();
      expect(row.functioning).toBe('FUNCIONA_CON_FALLA');
      expect(row.damageState).toBe('DESGASTE_NORMAL');
    });

    it('AC-PRE-06-2 — El historial se filtra por unidad, elemento, tipo de movimiento y fechas', async () => {
      const itemA = await createItem(category.id, { name: 'Elemento A' });
      const itemB = await createItem(category.id, { name: 'Elemento B' });
      const unitA = await createUnit(itemA.id);
      const unitB = await createUnit(itemB.id);
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: itemA.id, units: [unitA] });
      await createDeliveredLoan({ requesterId: instructor.user.id, itemId: itemB.id, units: [unitB] });
      await postReturn(admin.token, { returns: [returnPayload(unitA.serialNumber)] });
      await postReturn(admin.token, { returns: [returnPayload(unitB.serialNumber)] });

      // Fechas distintas para el filtro por rango.
      await prismaTest.requestItemUnit.updateMany({
        where: { inventoryUnitId: unitA.id },
        data: { returnedAt: new Date('2026-03-10T12:00:00Z') },
      });
      await prismaTest.requestItemUnit.updateMany({
        where: { inventoryUnitId: unitB.id },
        data: { returnedAt: new Date('2026-04-20T12:00:00Z') },
      });

      const byUnit = await getReturns(admin.token, { serialNumber: unitA.serialNumber });
      expect(byUnit.body.data.data).toHaveLength(1);
      expect(byUnit.body.data.data[0].serialNumber).toBe(unitA.serialNumber);

      const byItem = await getReturns(admin.token, { itemId: itemB.id });
      expect(byItem.body.data.data.every((row) => row.item.id === itemB.id)).toBe(true);
      expect(byItem.body.data.data.some((row) => row.serialNumber === unitA.serialNumber)).toBe(
        false
      );

      const byType = await getReturns(admin.token, { movementType: 'RETURN' });
      expect(byType.body.data.data.length).toBeGreaterThanOrEqual(2);
      const byLoan = await getReturns(admin.token, { movementType: 'LOAN' });
      expect(byLoan.body.data.data).toHaveLength(0);

      const byRange = await getReturns(admin.token, { from: '2026-04-01', to: '2026-04-30' });
      const rangeSerials = byRange.body.data.data.map((row) => row.serialNumber);
      expect(rangeSerials).toContain(unitB.serialNumber);
      expect(rangeSerials).not.toContain(unitA.serialNumber);
    });

    it('AC-PRE-06-3 — La consulta del historial es paginada y devuelve el total', async () => {
      const item = await createItem(category.id);
      const units = [];
      for (let index = 0; index < 25; index += 1) {
        units.push(await createUnit(item.id));
      }
      await createDeliveredLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        units,
      });
      await postReturn(admin.token, {
        returns: units.map((unit) => returnPayload(unit.serialNumber)),
      });

      const response = await getReturns(admin.token, { page: 1, limit: 20 });
      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(20);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(2);
    });
  });
});
