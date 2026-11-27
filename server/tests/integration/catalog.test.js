import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Tests de verificación del Módulo 08 — Catálogo y disponibilidad del instructor.
 * Cada `it` lleva el id del criterio en el nombre (`reparto.md` §3).
 *
 * Semántica del rango: días de calendario inclusivos (RN-NEG-04). Las fechas de los
 * escenarios se calculan con desplazamientos sobre hoy para que el rango empiece hoy o
 * después (RN-SOL-01).
 */

const PASSWORD = 'Password123';
let serialSequence = 0;
let requestSequence = 0;

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

const createInstructor = () =>
  loginAs({
    email: 'cmendoza@sena.edu.co',
    fullName: 'Carlos Mendoza',
    role: 'INSTRUCTOR',
    shift: 'MORNING',
  });

async function createCategory(name = 'Medición') {
  return prismaTest.category.create({ data: { name: `${name}-${Date.now()}-${Math.random()}` } });
}

async function createItem(categoryId, overrides = {}) {
  const category = categoryId
    ? { id: categoryId }
    : await createCategory(overrides.categoryName || 'Medición');
  return prismaTest.item.create({
    data: {
      code: `CAT-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      name: 'Elemento de catálogo',
      categoryId: category.id,
      ...overrides,
    },
  });
}

async function createUnit(itemId, overrides = {}) {
  serialSequence += 1;
  return prismaTest.inventoryUnit.create({
    data: {
      itemId,
      serialNumber: `SN-${serialSequence}`,
      status: 'AVAILABLE',
      physicalState: 'OPERATIVO',
      ...overrides,
    },
  });
}

async function createReservation({ requesterId, itemId, units, from, to, status = 'APPROVED' }) {
  requestSequence += 1;
  const requestRow = await prismaTest.request.create({
    data: {
      code: `SOL-CAT-${requestSequence}`,
      requesterId,
      status,
      requestDate: new Date(`${from}T00:00:00Z`),
      estimatedDate: new Date(`${to}T00:00:00Z`),
      requestItems: {
        create: {
          itemId,
          requestedQty: units.length,
          approvedQty: units.length,
          deliveredQty: 0,
        },
      },
    },
    include: { requestItems: true },
  });

  for (const unit of units) {
    await prismaTest.requestItemUnit.create({
      data: {
        requestItemId: requestRow.requestItems[0].id,
        inventoryUnitId: unit.id,
      },
    });
    await prismaTest.inventoryUnit.update({
      where: { id: unit.id },
      data: { status: 'RESERVED' },
    });
  }

  return requestRow;
}

async function createLoan({ requesterId, itemId, unit, from, to, status = 'DELIVERED' }) {
  requestSequence += 1;
  const requestRow = await prismaTest.request.create({
    data: {
      code: `SOL-LOAN-${requestSequence}`,
      requesterId,
      status,
      requestDate: new Date(`${from}T00:00:00Z`),
      estimatedDate: new Date(`${to}T00:00:00Z`),
      requestItems: {
        create: { itemId, requestedQty: 1, approvedQty: 1, deliveredQty: 1 },
      },
    },
    include: { requestItems: true },
  });

  const assignment = await prismaTest.requestItemUnit.create({
    data: {
      requestItemId: requestRow.requestItems[0].id,
      inventoryUnitId: unit.id,
      loanedAt: new Date(),
    },
  });
  await prismaTest.inventoryUnit.update({
    where: { id: unit.id },
    data: { status: 'LOANED' },
  });

  return { request: requestRow, assignment };
}

async function queryCatalog(token, params = {}) {
  return request(app)
    .get('/api/catalog')
    .query(params)
    .set('Authorization', token);
}

const catalogRows = (response) => response.body.data.data;
const catalogRow = (response, itemId) =>
  catalogRows(response).find((row) => row.id === itemId);

describe('Módulo 08 — Catálogo y disponibilidad', () => {
  let admin;
  let instructor;

  beforeEach(async () => {
    await resetDatabase();
    admin = await createAdmin();
    instructor = await createInstructor();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-CAT-01 — Consultar el catálogo de elementos
  // ---------------------------------------------------------------------------------
  describe('US-CAT-01 — Consultar el catálogo', () => {
    it('AC-CAT-01-1 — El catálogo lista elementos, no unidades físicas ni seriales', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Multímetro digital' });
      await createUnit(item.id);
      await createUnit(item.id);
      await createUnit(item.id);

      const response = await queryCatalog(instructor.token);
      expect(response.status).toBe(200);

      const row = catalogRow(response, item.id);
      expect(row).toBeDefined();
      expect(row.name).toBe('Multímetro digital');
      // No expone unidades ni seriales (RN-CAT-01).
      expect(JSON.stringify(row)).not.toContain('SN-');
      expect(row.inventoryUnits).toBeUndefined();
    });

    it('AC-CAT-01-2 — Cada elemento informa su cantidad disponible como número', async () => {
      const category = await createCategory();
      const three = await createItem(category.id, { name: 'Multímetro de pinza' });
      const one = await createItem(category.id, { name: 'Cargador de portátil' });
      for (let index = 0; index < 3; index += 1) await createUnit(three.id);
      await createUnit(one.id);

      const response = await queryCatalog(instructor.token);
      expect(catalogRow(response, three.id).availableQty).toBe(3);
      expect(catalogRow(response, one.id).availableQty).toBe(1);
      expect(typeof catalogRow(response, three.id).availableQty).toBe('number');
    });

    it('AC-CAT-01-3 — Un consumible muestra su cantidad en su propia unidad de medida', async () => {
      const category = await createCategory();
      const cleaner = await createItem(category.id, {
        name: 'Limpiador de contactos',
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'FRASCO',
        stock: 10,
      });
      const cable = await createItem(category.id, {
        name: 'Cable',
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'METRO',
        stock: 100,
      });

      const response = await queryCatalog(instructor.token);
      expect(catalogRow(response, cleaner.id).availableQty).toBe(10);
      expect(catalogRow(response, cleaner.id).unit).toBe('FRASCO');
      expect(catalogRow(response, cable.id).availableQty).toBe(100);
      expect(catalogRow(response, cable.id).unit).toBe('METRO');
    });

    it('AC-CAT-01-4 — Un elemento sin disponibilidad aparece con 0 y no seleccionable', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Sin unidades' });

      const response = await queryCatalog(instructor.token);
      expect(response.status).toBe(200);
      const row = catalogRow(response, item.id);
      expect(row).toBeDefined();
      expect(row.availableQty).toBe(0);
      expect(row.selectable).toBe(false);
    });

    it('AC-CAT-01-5 — El instructor no puede crear ni modificar elementos', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Elemento existente' });
      await createUnit(item.id);
      const before = await prismaTest.item.count();

      const createResponse = await request(app)
        .post('/api/items')
        .set('Authorization', instructor.token)
        .send({ code: 'NO-AUTORIZADO', name: 'No autorizado', categoryId: category.id });
      expect(createResponse.status).toBe(403);

      const updateResponse = await request(app)
        .put(`/api/items/${item.id}`)
        .set('Authorization', instructor.token)
        .send({ name: 'Nombre cambiado' });
      expect(updateResponse.status).toBe(403);

      expect(await prismaTest.item.count()).toBe(before);
      const stored = await prismaTest.item.findUnique({ where: { id: item.id } });
      expect(stored.name).toBe('Elemento existente');
    });

    it('AC-CAT-01-6 — El catálogo informa el rango con el que calcula y permite cambiarlo', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Con reserva' });
      const plainUnits = [await createUnit(item.id), await createUnit(item.id)];
      const reservedUnit = await createUnit(item.id);
      const reservedRange = { from: dateOffset(10), to: dateOffset(13) };
      await createReservation({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [reservedUnit],
        ...reservedRange,
      });

      const sameRange = await queryCatalog(instructor.token, reservedRange);
      expect(sameRange.status).toBe(200);
      expect(sameRange.body.data.range).toEqual(reservedRange);
      expect(catalogRow(sameRange, item.id).availableQty).toBe(2);

      const freeRange = { from: dateOffset(20), to: dateOffset(22) };
      const otherRange = await queryCatalog(instructor.token, freeRange);
      expect(otherRange.body.data.range).toEqual(freeRange);
      expect(catalogRow(otherRange, item.id).availableQty).toBe(3);
      // Las 2 unidades libres siguen ahí en todo rango.
      expect(plainUnits).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-CAT-02 — Buscar y filtrar
  // ---------------------------------------------------------------------------------
  describe('US-CAT-02 — Buscar y filtrar', () => {
    it('AC-CAT-02-1 — Buscar por nombre devuelve las coincidencias parciales', async () => {
      const category = await createCategory();
      const digital = await createItem(category.id, { name: 'Multímetro digital' });
      const pinza = await createItem(category.id, { name: 'Multímetro de pinza' });
      const taladro = await createItem(category.id, { name: 'Taladro' });

      const byFragment = await queryCatalog(instructor.token, { search: 'Multímetro' });
      const ids = catalogRows(byFragment).map((row) => row.id);
      expect(ids).toEqual(expect.arrayContaining([digital.id, pinza.id]));
      expect(ids).not.toContain(taladro.id);

      const byMiddle = await queryCatalog(instructor.token, { search: 'de pinza' });
      expect(catalogRows(byMiddle).map((row) => row.id)).toEqual([pinza.id]);
    });

    it('AC-CAT-02-2 — Una búsqueda sin coincidencias devuelve lista vacía, no error', async () => {
      const category = await createCategory();
      await createItem(category.id, { name: 'Multímetro digital' });
      const before = await prismaTest.item.count();

      const response = await queryCatalog(instructor.token, { search: 'zzz' });
      expect(response.status).toBe(200);
      expect(catalogRows(response)).toHaveLength(0);
      expect(response.body.data.meta.total).toBe(0);
      expect(await prismaTest.item.count()).toBe(before);
    });

    it('AC-CAT-02-3 — Filtrar por categoría devuelve solo los elementos de esa categoría', async () => {
      const tools = await createCategory('herramientas');
      const computing = await createCategory('cómputo');
      const firstTool = await createItem(tools.id, { name: 'Taladro' });
      const secondTool = await createItem(tools.id, { name: 'Llave' });
      const computer = await createItem(computing.id, { name: 'Portátil' });

      const response = await queryCatalog(instructor.token, {
        categoryId: tools.id,
        limit: 100,
      });
      const ids = catalogRows(response).map((row) => row.id);
      expect(ids.sort()).toEqual([firstTool.id, secondTool.id].sort());
      expect(ids).not.toContain(computer.id);
      expect(response.body.data.meta.total).toBe(2);
    });

    it('AC-CAT-02-4 — La búsqueda por nombre y el filtro de categoría se aplican juntos', async () => {
      const tools = await createCategory('herramientas');
      const computing = await createCategory('cómputo');
      const tool = await createItem(tools.id, { name: 'Multímetro de taller' });
      const computer = await createItem(computing.id, { name: 'Multímetro de banco' });

      const response = await queryCatalog(instructor.token, {
        search: 'Multímetro',
        categoryId: computing.id,
      });
      const ids = catalogRows(response).map((row) => row.id);
      expect(ids).toEqual([computer.id]);
      expect(ids).not.toContain(tool.id);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-CAT-03 — Disponibilidad por rango de fechas
  // ---------------------------------------------------------------------------------
  describe('US-CAT-03 — Disponibilidad por rango', () => {
    it('AC-CAT-03-1 — La disponibilidad se calcula para el rango solicitado', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Tres unidades' });
      const first = await createUnit(item.id);
      await createUnit(item.id);
      await createUnit(item.id);
      const reservedRange = { from: dateOffset(10), to: dateOffset(13) };
      await createReservation({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [first],
        ...reservedRange,
      });

      const sameRange = await queryCatalog(instructor.token, reservedRange);
      expect(catalogRow(sameRange, item.id).availableQty).toBe(2);

      const future = await queryCatalog(instructor.token, {
        from: dateOffset(5),
        to: dateOffset(6),
      });
      expect(catalogRow(future, item.id).availableQty).toBe(3);

      const otherRange = await queryCatalog(instructor.token, {
        from: dateOffset(20),
        to: dateOffset(22),
      });
      expect(catalogRow(otherRange, item.id).availableQty).toBe(3);
    });

    it('AC-CAT-03-2 — Una reserva que se solapa no se cuenta como disponible', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Dos unidades' });
      await createUnit(item.id);
      const reserved = await createUnit(item.id);
      await createReservation({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [reserved],
        from: dateOffset(10),
        to: dateOffset(13),
      });

      // Empieza en el último día reservado: el solapamiento es inclusivo.
      const lastDay = await queryCatalog(instructor.token, {
        from: dateOffset(13),
        to: dateOffset(15),
      });
      expect(catalogRow(lastDay, item.id).availableQty).toBe(1);

      // Empieza el día siguiente: ya no se solapa.
      const nextDay = await queryCatalog(instructor.token, {
        from: dateOffset(14),
        to: dateOffset(16),
      });
      expect(catalogRow(nextDay, item.id).availableQty).toBe(2);
    });

    it('AC-CAT-03-3 — Una reserva fuera de su rango sí se cuenta como disponible', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Dos unidades lejos' });
      await createUnit(item.id);
      const reserved = await createUnit(item.id);
      await createReservation({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [reserved],
        from: dateOffset(10),
        to: dateOffset(13),
      });

      const response = await queryCatalog(instructor.token, {
        from: dateOffset(20),
        to: dateOffset(22),
      });
      expect(catalogRow(response, item.id).availableQty).toBe(2);
    });

    it('AC-CAT-03-4 — Una unidad cuyo estado físico no permite prestar no se cuenta', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Con averiada' });
      await createUnit(item.id);
      await createUnit(item.id);
      await createUnit(item.id, { physicalState: 'AVERIADO' });

      const response = await queryCatalog(instructor.token, {
        from: dateOffset(1),
        to: dateOffset(2),
      });
      expect(catalogRow(response, item.id).availableQty).toBe(2);
    });

    it('AC-CAT-03-5 — Una pieza comprometida dentro de un conjunto no se cuenta por separado', async () => {
      const category = await createCategory();
      const assembly = await createItem(category.id, { name: 'Kit comprometido' });
      const piece = await createItem(category.id, { name: 'Pieza del kit' });
      const parentUnit = await createUnit(assembly.id);
      const pieceUnit = await createUnit(piece.id, { parentUnitId: parentUnit.id });

      await createReservation({
        requesterId: instructor.user.id,
        itemId: assembly.id,
        units: [parentUnit, pieceUnit],
        from: dateOffset(10),
        to: dateOffset(13),
      });

      const response = await queryCatalog(instructor.token, {
        from: dateOffset(10),
        to: dateOffset(13),
      });
      expect(catalogRow(response, piece.id).availableQty).toBe(0);
    });

    it('AC-CAT-03-6 — Un elemento con cero unidades disponibles devuelve 0, no error', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Única unidad reservada' });
      const unit = await createUnit(item.id);
      await createReservation({
        requesterId: instructor.user.id,
        itemId: item.id,
        units: [unit],
        from: dateOffset(10),
        to: dateOffset(13),
      });

      const response = await queryCatalog(instructor.token, {
        from: dateOffset(10),
        to: dateOffset(13),
      });
      expect(response.status).toBe(200);
      expect(catalogRow(response, item.id).availableQty).toBe(0);
    });

    it('AC-CAT-03-7 — Una unidad prestada no se cuenta para ningún rango', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Con préstamo activo' });
      await createUnit(item.id);
      const loanedUnit = await createUnit(item.id);
      await createLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        unit: loanedUnit,
        from: dateOffset(-5),
        to: dateOffset(2),
      });

      // Rango muy posterior a la fecha estimada de devolución: sigue sin contar.
      const futureRange = { from: dateOffset(60), to: dateOffset(65) };
      const beforeReturn = await queryCatalog(instructor.token, futureRange);
      expect(catalogRow(beforeReturn, item.id).availableQty).toBe(1);

      // Se registra la devolución: vuelve a contar.
      await prismaTest.requestItemUnit.updateMany({
        where: { inventoryUnitId: loanedUnit.id },
        data: { returnedAt: new Date() },
      });
      await prismaTest.inventoryUnit.update({
        where: { id: loanedUnit.id },
        data: { status: 'AVAILABLE' },
      });
      const afterReturn = await queryCatalog(instructor.token, futureRange);
      expect(catalogRow(afterReturn, item.id).availableQty).toBe(2);

      // Entrega parcial: de 3 unidades, 1 entregada queda afuera.
      const partialItem = await createItem(category.id, { name: 'Entrega parcial' });
      const partialUnits = [
        await createUnit(partialItem.id),
        await createUnit(partialItem.id),
        await createUnit(partialItem.id),
      ];
      await createLoan({
        requesterId: instructor.user.id,
        itemId: partialItem.id,
        unit: partialUnits[0],
        from: dateOffset(-1),
        to: dateOffset(1),
        status: 'PARTIALLY_RETURNED',
      });
      const partialResponse = await queryCatalog(instructor.token, futureRange);
      expect(catalogRow(partialResponse, partialItem.id).availableQty).toBe(2);
    });


    it('AC-CAT-03-8 — Una unidad en trámite de baja no se cuenta, ni ella ni sus piezas sueltas', async () => {
      const category = await createCategory();

      // Fila 1: 3 unidades OPERATIVO, una en trámite de baja → 2.
      const item = await createItem(category.id, { name: 'Con trámite de baja' });
      await createUnit(item.id);
      await createUnit(item.id);
      await createUnit(item.id, { disposalInProgress: true });

      const response = await queryCatalog(instructor.token, {
        from: dateOffset(10),
        to: dateOffset(13),
      });
      expect(catalogRow(response, item.id).availableQty).toBe(2);

      // Fila 2: dos conjuntos AVERIADOS (que prestan sus piezas) y uno en trámite.
      // La pieza del conjunto sin trámite cuenta; la del conjunto en trámite no.
      const assembly = await createItem(category.id, { name: 'Conjunto averiado' });
      const pieceItem = await createItem(category.id, { name: 'Pieza de conjunto averiado' });
      const assemblyWithoutDisposal = await createUnit(assembly.id, { physicalState: 'AVERIADO' });
      const assemblyWithDisposal = await createUnit(assembly.id, {
        physicalState: 'AVERIADO',
        disposalInProgress: true,
      });
      await createUnit(pieceItem.id, { parentUnitId: assemblyWithoutDisposal.id });
      await createUnit(pieceItem.id, { parentUnitId: assemblyWithDisposal.id });

      const pieceResponse = await queryCatalog(instructor.token, {
        from: dateOffset(10),
        to: dateOffset(13),
      });
      expect(catalogRow(pieceResponse, pieceItem.id).availableQty).toBe(1);
    });

    it('AC-CAT-03-10 — La cantidad de un consumible no depende del rango de fechas', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, {
        name: 'Cable consumible',
        isConsumable: true,
        ownership: 'DONATED',
        unit: 'METRO',
        stock: 10,
      });

      const firstRangeResponse = await queryCatalog(instructor.token, {
        from: dateOffset(1),
        to: dateOffset(2),
      });
      const secondRangeResponse = await queryCatalog(instructor.token, {
        from: dateOffset(30),
        to: dateOffset(31),
      });
      expect(catalogRow(firstRangeResponse, item.id).availableQty).toBe(10);
      expect(catalogRow(secondRangeResponse, item.id).availableQty).toBe(10);

      // Empacado: todavía no baja (RN-INV-11).
      await prismaTest.request.create({
        data: {
          code: 'SOL-PACKED',
          requesterId: instructor.user.id,
          status: 'PACKED',
          requestItems: {
            create: { itemId: item.id, requestedQty: 2, approvedQty: 2, deliveredQty: 0 },
          },
        },
      });
      const afterPacked = await queryCatalog(instructor.token, {
        from: dateOffset(1),
        to: dateOffset(2),
      });
      expect(catalogRow(afterPacked, item.id).availableQty).toBe(10);

      // Entrega registrada: el stock baja (la aritmética es del epic 06; acá se lee).
      await prismaTest.item.update({ where: { id: item.id }, data: { stock: 8 } });
      const afterDelivery = await queryCatalog(instructor.token, {
        from: dateOffset(1),
        to: dateOffset(2),
      });
      expect(catalogRow(afterDelivery, item.id).availableQty).toBe(8);
    });

    it('AC-CAT-03-11 — Una unidad declarada perdida no se cuenta ni bloquea disponibilidad', async () => {
      const category = await createCategory();
      const item = await createItem(category.id, { name: 'Con perdida' });
      await createUnit(item.id);
      await createUnit(item.id);
      const lostUnit = await createUnit(item.id);
      await createLoan({
        requesterId: instructor.user.id,
        itemId: item.id,
        unit: lostUnit,
        from: dateOffset(-5),
        to: dateOffset(2),
      });
      await prismaTest.inventoryUnit.update({
        where: { id: lostUnit.id },
        data: { declaredLost: true },
      });

      const lostResponse = await queryCatalog(instructor.token, {
        from: dateOffset(60),
        to: dateOffset(65),
      });
      expect(catalogRow(lostResponse, item.id).availableQty).toBe(2);

      // Excepción: el conjunto perdido no bloquea las piezas sueltas.
      const assembly = await createItem(category.id, { name: 'Conjunto perdido' });
      const pieceItem = await createItem(category.id, { name: 'Pieza suelta' });
      const parentUnit = await createUnit(assembly.id, {
        declaredLost: true,
        disposalInProgress: true,
      });
      await createUnit(pieceItem.id, { parentUnitId: parentUnit.id });

      const pieceResponse = await queryCatalog(instructor.token, {
        from: dateOffset(10),
        to: dateOffset(13),
      });
      expect(catalogRow(pieceResponse, pieceItem.id).availableQty).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-CAT-04 — Navegar el catálogo paginado
  // ---------------------------------------------------------------------------------
  describe('US-CAT-04 — Catálogo paginado', () => {
    const seed25 = async () => {
      const category = await createCategory();
      await prismaTest.item.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          code: `PAG-${index + 1}`,
          name: `Elemento ${String(index + 1).padStart(2, '0')}`,
          categoryId: category.id,
        })),
      });
    };

    it('AC-CAT-04-1 — La respuesta paginada informa el total y permite llegar al resto', async () => {
      await seed25();

      const firstPage = await queryCatalog(instructor.token, { page: 1 });
      expect(firstPage.status).toBe(200);
      expect(catalogRows(firstPage)).toHaveLength(20);
      expect(firstPage.body.data.meta.total).toBe(25);

      const secondPage = await queryCatalog(instructor.token, { page: 2 });
      expect(catalogRows(secondPage)).toHaveLength(5);
    });

    it('AC-CAT-04-2 — Se puede pedir una página concreta sin solapamiento', async () => {
      await seed25();

      const firstPage = await queryCatalog(instructor.token, { page: 1 });
      const secondPage = await queryCatalog(instructor.token, { page: 2 });
      const firstIds = new Set(catalogRows(firstPage).map((row) => row.id));
      const secondIds = catalogRows(secondPage).map((row) => row.id);

      secondIds.forEach((id) => expect(firstIds.has(id)).toBe(false));
      expect(firstIds.size + secondIds.length).toBe(25);
    });
  });
});
