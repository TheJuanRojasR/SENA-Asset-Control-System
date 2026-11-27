import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Tests de verificación del Módulo 03 — Ambientes.
 * Cada `it` lleva el id del criterio en el nombre (`.ai/reparto.md` §3).
 */

const PASSWORD = 'Password123';

async function createUserAndLogin({ email, fullName, role, shift }) {
  const user = await prismaTest.user.create({
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
  return { user, token: `Bearer ${login.body.data.accessToken}` };
}

const createAdminAndLogin = () =>
  createUserAndLogin({
    email: 'admin@sena.edu.co',
    fullName: 'Admin Test',
    role: 'ADMIN',
  });

const createInstructorAndLogin = () =>
  createUserAndLogin({
    email: 'cmendoza@sena.edu.co',
    fullName: 'Carlos Mendoza',
    role: 'INSTRUCTOR',
    shift: 'MORNING',
  });

let environmentSequence = 0;
const nextCode = () => `AMB-${String(++environmentSequence).padStart(3, '0')}`;

async function createEnvironmentRecord(overrides = {}) {
  const code = overrides.code || nextCode();
  return prismaTest.environment.create({
    data: {
      code,
      name: overrides.name || `Ambiente ${code}`,
      location: overrides.location,
      isActive: true,
      isDeleted: false,
      ...overrides,
      code,
    },
  });
}

async function createItemRecord(code = 'ITEM-001') {
  const category = await prismaTest.category.create({
    data: { name: `Categoría ${code}` },
  });
  return prismaTest.item.create({
    data: {
      code,
      name: `Item ${code}`,
      categoryId: category.id,
    },
  });
}

async function createUnitRecord(itemId, environmentId, serialNumber) {
  return prismaTest.inventoryUnit.create({
    data: {
      itemId,
      serialNumber,
      environmentId,
      status: 'AVAILABLE',
      physicalState: 'GOOD',
    },
  });
}

const countEnvironments = () =>
  prismaTest.environment.count({ where: { isDeleted: false } });

describe('Módulo 03 — Ambientes', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  // ---------------------------------------------------------------------------------
  // US-AMB-01 — Registrar un ambiente de destino
  // ---------------------------------------------------------------------------------
  describe('US-AMB-01 — Registrar un ambiente de destino', () => {
    it('AC-AMB-01-1 — Un ambiente registrado con su nombre queda disponible como ubicación', async () => {
      const { token } = await createAdminAndLogin();

      const response = await request(app)
        .post('/api/environments')
        .set('Authorization', token)
        .send({ code: 'AMB-205', name: 'Ambiente 205' });

      expect(response.status).toBe(201);
      const environmentId = response.body.data.environment.id;
      expect(response.body.data.environment.name).toBe('Ambiente 205');

      const listResponse = await request(app)
        .get('/api/environments')
        .set('Authorization', token);
      expect(listResponse.body.data.data.some((row) => row.id === environmentId)).toBe(true);

      // Elegible: una unidad nueva puede registrarse con esa ubicación.
      const item = await createItemRecord();
      const unitResponse = await request(app)
        .post('/api/inventory')
        .set('Authorization', token)
        .send({ itemId: item.id, environmentId });
      expect(unitResponse.status).toBe(201);
      expect(unitResponse.body.data.unit.environmentId).toBe(environmentId);
    });

    it('AC-AMB-01-2 — Un nombre vacío o de solo espacios se rechaza sin crear nada', async () => {
      const { token } = await createAdminAndLogin();
      const before = await countEnvironments();

      const emptyName = await request(app)
        .post('/api/environments')
        .set('Authorization', token)
        .send({ code: 'AMB-900', name: '' });
      expect(emptyName.status).toBe(400);

      const blankName = await request(app)
        .post('/api/environments')
        .set('Authorization', token)
        .send({ code: 'AMB-901', name: '   ' });
      expect(blankName.status).toBe(400);

      expect(await countEnvironments()).toBe(before);
    });

    it('AC-AMB-01-3 — Un instructor no puede registrar ambientes (403 sin efectos)', async () => {
      const { token } = await createInstructorAndLogin();
      const before = await countEnvironments();

      const response = await request(app)
        .post('/api/environments')
        .set('Authorization', token)
        .send({ code: 'AMB-902', name: 'Ambiente 902' });

      expect(response.status).toBe(403);
      expect(await countEnvironments()).toBe(before);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-AMB-02 — Consultar los ambientes y cuántas unidades hay en cada uno
  // ---------------------------------------------------------------------------------
  describe('US-AMB-02 — Consulta de ambientes y conteo de unidades', () => {
    it('AC-AMB-02-1 — La consulta devuelve los ambientes con su nombre y son los elegibles', async () => {
      const { token: adminToken } = await createAdminAndLogin();
      const { token: instructorToken } = await createInstructorAndLogin();
      const first = await createEnvironmentRecord({ code: 'AMB-001', name: 'Ambiente 104' });
      const second = await createEnvironmentRecord({ code: 'AMB-002', name: 'Ambiente 205' });

      for (const token of [adminToken, instructorToken]) {
        const response = await request(app)
          .get('/api/environments')
          .set('Authorization', token);
        expect(response.status).toBe(200);
        const ids = response.body.data.data.map((row) => row.id).sort();
        expect(ids).toEqual([first.id, second.id].sort());
        const names = response.body.data.data.map((row) => row.name);
        expect(names).toEqual(expect.arrayContaining(['Ambiente 104', 'Ambiente 205']));
      }
    });

    it('AC-AMB-02-2 — Se informa cuántas unidades hay en cada ambiente', async () => {
      const { token } = await createAdminAndLogin();
      const first = await createEnvironmentRecord({ code: 'AMB-001', name: 'Ambiente 104' });
      const second = await createEnvironmentRecord({ code: 'AMB-002', name: 'Ambiente 205' });
      const item = await createItemRecord();

      for (let index = 0; index < 3; index += 1) {
        await createUnitRecord(item.id, first.id, `SN-104-${index}`);
      }
      for (let index = 0; index < 2; index += 1) {
        await createUnitRecord(item.id, second.id, `SN-205-${index}`);
      }

      const response = await request(app)
        .get('/api/environments')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      const firstRow = response.body.data.data.find((row) => row.id === first.id);
      const secondRow = response.body.data.data.find((row) => row.id === second.id);
      expect(firstRow.unitsCount).toBe(3);
      expect(secondRow.unitsCount).toBe(2);
    });

    it('AC-AMB-02-3 — La consulta de ambientes es paginada y devuelve el total', async () => {
      const { token } = await createAdminAndLogin();
      await prismaTest.environment.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          code: `AMB-${100 + index}`,
          name: `Ambiente ${100 + index}`,
        })),
      });

      const response = await request(app)
        .get('/api/environments?page=1&limit=10')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body.data.data).toHaveLength(10);
      expect(response.body.data.meta.total).toBe(25);
      expect(response.body.data.meta.totalPages).toBe(3);
      expect(response.body.data.meta.page).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-AMB-03 — Impedir la eliminación de un ambiente en uso
  // ---------------------------------------------------------------------------------
  describe('US-AMB-03 — Eliminación protegida', () => {
    it('AC-AMB-03-1 — No se puede eliminar un ambiente con unidades y ninguna cambia de ubicación', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironmentRecord({ code: 'AMB-205', name: 'Ambiente 205' });
      const item = await createItemRecord();
      const units = [
        await createUnitRecord(item.id, environment.id, 'SN-205-1'),
        await createUnitRecord(item.id, environment.id, 'SN-205-2'),
      ];

      const response = await request(app)
        .delete(`/api/environments/${environment.id}`)
        .set('Authorization', token);

      expect(response.status).toBe(409);

      const listResponse = await request(app)
        .get('/api/environments')
        .set('Authorization', token);
      expect(listResponse.body.data.data.some((row) => row.id === environment.id)).toBe(true);

      const unitsAfter = await prismaTest.inventoryUnit.findMany({
        where: { id: { in: units.map((unit) => unit.id) } },
      });
      unitsAfter.forEach((unit) => expect(unit.environmentId).toBe(environment.id));
    });

    it('AC-AMB-03-2 — No se puede eliminar el ambiente base y una unidad nueva sigue naciendo allí', async () => {
      const { token } = await createAdminAndLogin();
      const base = await createEnvironmentRecord({ code: '104', name: 'Ambiente 104' });

      const response = await request(app)
        .delete(`/api/environments/${base.id}`)
        .set('Authorization', token);
      expect(response.status).toBe(409);

      const listResponse = await request(app)
        .get('/api/environments')
        .set('Authorization', token);
      expect(listResponse.body.data.data.some((row) => row.id === base.id)).toBe(true);

      // Una unidad registrada después del intento sigue teniendo el ambiente base como
      // ubicación por defecto (RN-CTX-08).
      const item = await createItemRecord();
      const unitResponse = await request(app)
        .post('/api/inventory')
        .set('Authorization', token)
        .send({ itemId: item.id });
      expect(unitResponse.status).toBe(201);
      expect(unitResponse.body.data.unit.environmentId).toBe(base.id);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-AMB-04 — Editar el nombre de un ambiente
  // ---------------------------------------------------------------------------------
  describe('US-AMB-04 — Editar el nombre', () => {
    it('AC-AMB-04-1 — El nombre nuevo se refleja y las unidades siguen en el mismo ambiente', async () => {
      const { token } = await createAdminAndLogin();
      const environment = await createEnvironmentRecord({ code: 'AMB-205', name: 'Ambiente 205' });
      const item = await createItemRecord();
      const unit = await createUnitRecord(item.id, environment.id, 'SN-205-1');

      const response = await request(app)
        .put(`/api/environments/${environment.id}`)
        .set('Authorization', token)
        .send({ name: 'Ambiente 206' });
      expect(response.status).toBe(200);

      const listResponse = await request(app)
        .get('/api/environments')
        .set('Authorization', token);
      const names = listResponse.body.data.data.map((row) => row.name);
      expect(names).toContain('Ambiente 206');
      expect(names).not.toContain('Ambiente 205');

      const unitAfter = await prismaTest.inventoryUnit.findUnique({ where: { id: unit.id } });
      expect(unitAfter.environmentId).toBe(environment.id);

      const unitResponse = await request(app)
        .get(`/api/inventory/${unit.id}`)
        .set('Authorization', token);
      expect(unitResponse.body.data.unit.environment.name).toBe('Ambiente 206');
    });

    it('AC-AMB-04-2 — Editar el nombre a uno que ya existe se rechaza y nada cambia', async () => {
      const { token } = await createAdminAndLogin();
      const first = await createEnvironmentRecord({ code: 'AMB-001', name: 'Ambiente 104' });
      const second = await createEnvironmentRecord({ code: 'AMB-002', name: 'Ambiente 205' });

      const response = await request(app)
        .put(`/api/environments/${second.id}`)
        .set('Authorization', token)
        .send({ name: 'Ambiente 104' });

      expect(response.status).toBe(409);

      const firstAfter = await prismaTest.environment.findUnique({ where: { id: first.id } });
      const secondAfter = await prismaTest.environment.findUnique({ where: { id: second.id } });
      expect(firstAfter.name).toBe('Ambiente 104');
      expect(secondAfter.name).toBe('Ambiente 205');
      expect(await countEnvironments()).toBe(2);
    });
  });
});
