import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Tests de verificación del Módulo 02 — Usuarios e instructores.
 * Cada `it` lleva el id del criterio en el nombre (convención de `.ai/reparto.md` §3).
 *
 * Precondición: la BD de test debe tener las migraciones de la rama
 * (`npx prisma migrate deploy` con `DATABASE_URL_TEST`).
 */

const ADMIN_PASSWORD = 'AdminSENA2024';
const INSTRUCTOR_PASSWORD = 'Instructor2024';
const NEW_PASSWORD = 'NuevaClave2026';

const validInstructor = (overrides = {}) => ({
  fullName: 'Laura Torres',
  email: 'ltorres@misena.edu.co',
  password: INSTRUCTOR_PASSWORD,
  role: 'INSTRUCTOR',
  shift: 'MORNING',
  documentType: 'CC',
  document: '1020304050',
  phone: '3001234567',
  ...overrides,
});

function refreshTokenFrom(response) {
  const cookies = response.headers['set-cookie'] || [];
  const cookie = cookies.find((value) => value.startsWith('refreshToken='));
  return cookie ? cookie.split(';')[0].slice('refreshToken='.length) : null;
}

async function login(email, password) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function createInstructorViaApi(adminToken, overrides = {}) {
  return request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validInstructor(overrides));
}

const countInstructors = () =>
  prismaTest.user.count({ where: { role: 'INSTRUCTOR', isDeleted: false } });

const countAdmins = () =>
  prismaTest.user.count({ where: { role: 'ADMIN', isDeleted: false } });

/**
 * Fixture de historial: un instructor con una solicitud y unidades realmente entregadas
 * (RequestItemUnit con loanedAt y sin returnedAt), que es lo que RN-PRE-02 obliga a no
 * perder al desactivar o intentar borrar.
 */
async function createLoanFixture(instructor, { status = 'DELIVERED', units = 2 } = {}) {
  const suffix = Date.now() + Math.floor(Math.random() * 1000);
  const category = await prismaTest.category.create({
    data: { name: `Cómputo ${suffix}` },
  });
  const item = await prismaTest.item.create({
    data: {
      code: `LAP-${suffix}`,
      name: 'Portátil',
      categoryId: category.id,
      minStock: 1,
      unit: 'UNIDAD',
    },
  });
  const environment = await prismaTest.environment.create({
    data: { code: `AULA-${suffix}`, name: `Ambiente ${suffix}` },
  });
  const requestRow = await prismaTest.request.create({
    data: {
      code: `SOL-${suffix}`,
      requesterId: instructor.id,
      environmentId: environment.id,
      status,
    },
  });
  const requestItem = await prismaTest.requestItem.create({
    data: {
      requestId: requestRow.id,
      itemId: item.id,
      requestedQty: units,
      approvedQty: units,
      deliveredQty: units,
    },
  });

  const createdUnits = [];
  for (let index = 0; index < units; index += 1) {
    const unit = await prismaTest.inventoryUnit.create({
      data: {
        itemId: item.id,
        serialNumber: `SER-${suffix}-${index}`,
        status: 'LOANED',
      },
    });
    await prismaTest.requestItemUnit.create({
      data: {
        requestItemId: requestItem.id,
        inventoryUnitId: unit.id,
        loanedAt: new Date(),
      },
    });
    createdUnits.push(unit);
  }

  return { request: requestRow, requestItem, units: createdUnits, item, environment };
}

describe('Módulo 02 — Usuarios e instructores', () => {
  let admin;
  let adminToken;

  beforeEach(async () => {
    await resetDatabase();

    admin = await prismaTest.user.create({
      data: {
        email: 'admin@sena.edu.co',
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        fullName: 'Admin Test',
        role: 'ADMIN',
        isActive: true,
      },
    });

    const loginResponse = await login('admin@sena.edu.co', ADMIN_PASSWORD);
    adminToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-USR-01 — Dar de alta un instructor
  // ---------------------------------------------------------------------------------
  describe('US-USR-01 — Alta de instructores', () => {
    it('AC-USR-01-1 — Un alta con los seis datos obligatorios deja al instructor activo y puede iniciar sesión', async () => {
      const response = await createInstructorViaApi(adminToken);

      expect(response.status).toBe(201);
      expect(response.body.data.user.email).toBe('ltorres@misena.edu.co');
      expect(response.body.data.user.isActive).toBe(true);
      expect(response.body.data.user.documentType).toBe('CC');
      expect(response.body.data.user.document).toBe('1020304050');
      expect(response.body.data.user.phone).toBe('3001234567');

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.user.email).toBe('ltorres@misena.edu.co');
    });

    it('AC-USR-01-2 — Si falta cualquier dato obligatorio, el alta se rechaza y no crea al instructor', async () => {
      const before = await countInstructors();

      const withoutDocument = validInstructor();
      delete withoutDocument.document;
      const missing = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(withoutDocument);

      expect(missing.status).toBe(400);
      expect(missing.body.success).toBe(false);

      const emptyPhone = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInstructor({ phone: '' }));

      expect(emptyPhone.status).toBe(400);
      expect(emptyPhone.body.success).toBe(false);

      expect(await countInstructors()).toBe(before);
      const created = await prismaTest.user.count({
        where: { email: 'ltorres@misena.edu.co' },
      });
      expect(created).toBe(0);
    });

    it('AC-USR-01-3 — La foto es opcional: el alta sin foto se acepta y el instructor puede entrar', async () => {
      const response = await createInstructorViaApi(adminToken);

      expect(response.status).toBe(201);
      expect(response.body.data.user.imageUrl).toBeNull();
      expect(response.body.data.user.isActive).toBe(true);

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(200);
    });

    it('AC-USR-01-4 — Un correo ya registrado se rechaza sin crear un segundo instructor ni tocar al existente', async () => {
      const first = await createInstructorViaApi(adminToken);
      expect(first.status).toBe(201);

      const duplicate = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInstructor({ email: 'LTORRES@MISENA.EDU.CO', document: '999999' }));

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.code).toBe('EMAIL_EXISTS');
      expect(await countInstructors()).toBe(1);

      const stored = await prismaTest.user.findFirst({
        where: { email: 'ltorres@misena.edu.co' },
      });
      expect(stored.fullName).toBe('Laura Torres');
      expect(stored.document).toBe('1020304050');

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(200);
    });

    it('AC-USR-01-5 — El instructor no puede dar de alta a otro instructor (403 sin efectos)', async () => {
      await createInstructorViaApi(adminToken);
      const instructorLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const instructorToken = instructorLogin.body.data.accessToken;
      const before = await countInstructors();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send(validInstructor({ email: 'otro@misena.edu.co', document: '555555' }));

      expect(response.status).toBe(403);
      expect(await countInstructors()).toBe(before);
      const notCreated = await prismaTest.user.count({
        where: { email: 'otro@misena.edu.co' },
      });
      expect(notCreated).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-USR-02 — Consultar y editar el padrón (incluye AC-USR-06-3)
  // ---------------------------------------------------------------------------------
  describe('US-USR-02 — Consulta y edición del padrón', () => {
    it('AC-USR-02-1 — La consulta devuelve los instructores con sus datos y su estado', async () => {
      await createInstructorViaApi(adminToken);
      await prismaTest.user.create({
        data: {
          email: 'inactivo@misena.edu.co',
          passwordHash: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
          fullName: 'Instructor Inactivo',
          role: 'INSTRUCTOR',
          shift: 'AFTERNOON',
          isActive: false,
        },
      });

      const response = await request(app)
        .get('/api/users?role=INSTRUCTOR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const users = response.body.data.data;
      expect(users).toHaveLength(2);

      const active = users.find((user) => user.email === 'ltorres@misena.edu.co');
      const inactive = users.find((user) => user.email === 'inactivo@misena.edu.co');
      expect(active.fullName).toBe('Laura Torres');
      expect(active.isActive).toBe(true);
      expect(inactive.fullName).toBe('Instructor Inactivo');
      expect(inactive.isActive).toBe(false);
    });

    it('AC-USR-02-2 — La consulta se puede filtrar por estado activo o inactivo', async () => {
      await prismaTest.user.createMany({
        data: [
          {
            email: 'activo1@misena.edu.co',
            passwordHash: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
            fullName: 'Activo Uno',
            role: 'INSTRUCTOR',
            shift: 'MORNING',
            isActive: true,
          },
          {
            email: 'activo2@misena.edu.co',
            passwordHash: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
            fullName: 'Activo Dos',
            role: 'INSTRUCTOR',
            shift: 'AFTERNOON',
            isActive: true,
          },
          {
            email: 'inactivo@misena.edu.co',
            passwordHash: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
            fullName: 'Inactivo',
            role: 'INSTRUCTOR',
            shift: 'NIGHT',
            isActive: false,
          },
        ],
      });

      const inactiveResponse = await request(app)
        .get('/api/users?role=INSTRUCTOR&isActive=false')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(inactiveResponse.status).toBe(200);
      expect(inactiveResponse.body.data.data).toHaveLength(1);
      expect(inactiveResponse.body.data.data[0].email).toBe('inactivo@misena.edu.co');

      const activeResponse = await request(app)
        .get('/api/users?role=INSTRUCTOR&isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(activeResponse.status).toBe(200);
      expect(activeResponse.body.data.data).toHaveLength(2);
      const emails = activeResponse.body.data.data.map((user) => user.email).sort();
      expect(emails).toEqual(['activo1@misena.edu.co', 'activo2@misena.edu.co']);
    });

    it('AC-USR-02-3 — Editar los datos no obliga a cambiar la contraseña ni altera los demás datos', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      const updateResponse = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '3119998877' });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.user.phone).toBe('3119998877');
      expect(updateResponse.body.data.user.fullName).toBe('Laura Torres');

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(200);
    });

    it('AC-USR-02-4 — Un instructor con historial no se elimina: se desactiva y conserva su historial', async () => {
      const created = await createInstructorViaApi(adminToken);
      const instructor = await prismaTest.user.findFirst({
        where: { email: 'ltorres@misena.edu.co' },
      });
      const fixture = await createLoanFixture(instructor);

      const response = await request(app)
        .delete(`/api/users/${instructor.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.deactivated).toBe(true);

      const stored = await prismaTest.user.findUnique({ where: { id: instructor.id } });
      expect(stored).not.toBeNull();
      expect(stored.isActive).toBe(false);
      expect(stored.isDeleted).toBe(false);

      const requestAfter = await prismaTest.request.findUnique({
        where: { id: fixture.request.id },
      });
      expect(requestAfter).not.toBeNull();
      expect(requestAfter.requesterId).toBe(instructor.id);

      const loans = await prismaTest.requestItemUnit.findMany({
        where: { requestItemId: fixture.requestItem.id },
      });
      expect(loans).toHaveLength(2);
      loans.forEach((loan) => {
        expect(loan.loanedAt).not.toBeNull();
        expect(loan.returnedAt).toBeNull();
      });

      const units = await prismaTest.inventoryUnit.findMany({
        where: { id: { in: fixture.units.map((unit) => unit.id) } },
      });
      units.forEach((unit) => expect(unit.status).toBe('LOANED'));

      // Sigue figurando en el padrón, ahora inactivo.
      const listResponse = await request(app)
        .get('/api/users?role=INSTRUCTOR')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listResponse.body.data.data).toHaveLength(1);
      expect(listResponse.body.data.data[0].isActive).toBe(false);
    });

    it('AC-USR-06-3 — La consulta del padrón es paginada y devuelve el total y las páginas', async () => {
      const passwordHash = await bcrypt.hash(INSTRUCTOR_PASSWORD, 10);
      await prismaTest.user.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          email: `instructor${index}@misena.edu.co`,
          passwordHash,
          fullName: `Instructor ${index}`,
          role: 'INSTRUCTOR',
          shift: 'MORNING',
          isActive: true,
        })),
      });

      const response = await request(app)
        .get('/api/users?role=INSTRUCTOR&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(10);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(3);
      expect(response.body.data.meta.page).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-USR-03 — Desactivar y reactivar
  // ---------------------------------------------------------------------------------
  describe('US-USR-03 — Desactivar y reactivar un instructor', () => {
    it('AC-USR-03-1 — Un instructor desactivado no puede iniciar sesión y su contraseña no cambia', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      const deactivate = await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactivate.status).toBe(200);
      expect(deactivate.body.data.user.isActive).toBe(false);

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(401);
      expect(refreshTokenFrom(loginResponse)).toBeNull();

      const stored = await prismaTest.user.findUnique({ where: { id: userId } });
      expect(await bcrypt.compare(INSTRUCTOR_PASSWORD, stored.passwordHash)).toBe(true);
    });

    it('AC-USR-03-2 — Al desactivar, la solicitud y los préstamos en curso siguen vigentes', async () => {
      const created = await createInstructorViaApi(adminToken);
      const instructor = await prismaTest.user.findFirst({
        where: { email: 'ltorres@misena.edu.co' },
      });
      const fixture = await createLoanFixture(instructor, { status: 'APPROVED' });

      const deactivate = await request(app)
        .patch(`/api/users/${instructor.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactivate.status).toBe(200);

      const requestAfter = await prismaTest.request.findUnique({
        where: { id: fixture.request.id },
      });
      expect(requestAfter.status).toBe('APPROVED');

      const loans = await prismaTest.requestItemUnit.findMany({
        where: { requestItemId: fixture.requestItem.id },
      });
      expect(loans).toHaveLength(2);
      loans.forEach((loan) => {
        expect(loan.loanedAt).not.toBeNull();
        expect(loan.returnedAt).toBeNull();
      });

      const units = await prismaTest.inventoryUnit.findMany({
        where: { id: { in: fixture.units.map((unit) => unit.id) } },
      });
      units.forEach((unit) => expect(unit.status).toBe('LOANED'));
    });

    it('AC-USR-03-3 — Un instructor desactivado sigue figurando como deudor con su estado y la fecha', async () => {
      const created = await createInstructorViaApi(adminToken);
      const instructor = await prismaTest.user.findFirst({
        where: { email: 'ltorres@misena.edu.co' },
      });
      const fixture = await createLoanFixture(instructor, { units: 1 });

      await request(app)
        .patch(`/api/users/${instructor.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      const response = await request(app)
        .get(`/api/inventory/${fixture.units[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const holder = response.body.data.unit.holder;
      expect(holder).not.toBeNull();
      expect(holder.id).toBe(instructor.id);
      expect(holder.fullName).toBe('Laura Torres');
      expect(holder.isActive).toBe(false);
      expect(holder.loanedAt).toBeTruthy();
    });

    it('AC-USR-03-4 — El administrador puede reactivar a un instructor y este vuelve a entrar', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      const reactivate = await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(reactivate.status).toBe(200);
      expect(reactivate.body.data.user.isActive).toBe(true);

      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(loginResponse.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-USR-06 — Proteger al último administrador y al arranque
  // ---------------------------------------------------------------------------------
  describe('US-USR-06 — Último administrador y arranque del sistema', () => {
    it('AC-USR-06-1 — No se puede eliminar ni desactivar al último administrador activo', async () => {
      const deleteResponse = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deleteResponse.status).toBe(409);
      expect(deleteResponse.body.code).toBe('LAST_ADMIN');

      const deactivateResponse = await request(app)
        .patch(`/api/users/${admin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactivateResponse.status).toBe(409);
      expect(deactivateResponse.body.code).toBe('LAST_ADMIN');

      const stored = await prismaTest.user.findUnique({ where: { id: admin.id } });
      expect(stored.isActive).toBe(true);
      expect(stored.isDeleted).toBe(false);
    });

    it('AC-USR-06-2 — La aplicación nunca crea administradores; el primero vive fuera de ella', async () => {
      const before = await countAdmins();

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validInstructor({ role: 'ADMIN', email: 'nuevo.admin@sena.edu.co' }));

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ADMIN_CREATION_NOT_ALLOWED');
      expect(await countAdmins()).toBe(before);

      // El administrador creado fuera de la aplicación (seed/BD) sí puede iniciar sesión.
      const adminLogin = await login('admin@sena.edu.co', ADMIN_PASSWORD);
      expect(adminLogin.status).toBe(200);
    });
  });
});
