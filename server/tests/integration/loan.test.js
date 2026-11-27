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
});
