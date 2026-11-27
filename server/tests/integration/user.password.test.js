import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

/**
 * Módulo 02 — Contraseñas (US-USR-04 y US-USR-05).
 * Cada `it` lleva el id del criterio en el nombre (`.ai/reparto.md` §3).
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

const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });

const createInstructorViaApi = (adminToken, overrides = {}) =>
  request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validInstructor(overrides));

describe('Módulo 02 — Contraseñas', () => {
  let adminToken;

  beforeEach(async () => {
    await resetDatabase();
    await prismaTest.user.create({
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
  // US-USR-04 — Cambiar la propia contraseña
  // ---------------------------------------------------------------------------------
  describe('US-USR-04 — Cambio de la propia contraseña', () => {
    it('AC-USR-04-1 — Un usuario con sesión cambia su contraseña y entra con la nueva', async () => {
      await createInstructorViaApi(adminToken);
      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: INSTRUCTOR_PASSWORD, newPassword: NEW_PASSWORD });

      expect(response.status).toBe(200);

      const oldLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(oldLogin.status).toBe(401);

      const newLogin = await login('ltorres@misena.edu.co', NEW_PASSWORD);
      expect(newLogin.status).toBe(200);
    });

    it('AC-USR-04-2 — Si la contraseña actual no coincide, el cambio se rechaza sin efecto', async () => {
      await createInstructorViaApi(adminToken);
      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const token = loginResponse.body.data.accessToken;

      const response = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'ClaveEquivocada', newPassword: NEW_PASSWORD });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_CURRENT_PASSWORD');

      const oldLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(oldLogin.status).toBe(200);
      const newLogin = await login('ltorres@misena.edu.co', NEW_PASSWORD);
      expect(newLogin.status).toBe(401);
    });

    it('AC-USR-04-3 — El cambio de contraseña cierra todas las sesiones, incluida la actual', async () => {
      await createInstructorViaApi(adminToken);
      const loginResponse = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const accessToken = loginResponse.body.data.accessToken;
      const refreshToken = refreshTokenFrom(loginResponse);

      const response = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: INSTRUCTOR_PASSWORD, newPassword: NEW_PASSWORD });
      expect(response.status).toBe(200);

      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(meResponse.status).toBe(401);

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(refreshResponse.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------------
  // US-USR-05 — Restablecer la contraseña de un instructor
  // ---------------------------------------------------------------------------------
  describe('US-USR-05 — Restablecimiento por el administrador', () => {
    it('AC-USR-05-1 — El administrador fija una contraseña nueva sin conocer la anterior', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      const response = await request(app)
        .patch(`/api/users/${userId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: NEW_PASSWORD });

      expect(response.status).toBe(200);

      const oldLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(oldLogin.status).toBe(401);
      const newLogin = await login('ltorres@misena.edu.co', NEW_PASSWORD);
      expect(newLogin.status).toBe(200);
    });

    it('AC-USR-05-2 — El restablecimiento no envía ningún correo: se completa sin canal externo', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      const response = await request(app)
        .patch(`/api/users/${userId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: NEW_PASSWORD });

      expect(response.status).toBe(200);
      // RN-NOT-02: no hay servicio de correo configurado. La operación no entrega ni exige
      // un token por correo; el instructor entra con la contraseña nueva de inmediato.
      expect(response.body.data).not.toHaveProperty('emailSent');
      expect(response.body.data).not.toHaveProperty('sentTo');

      const newLogin = await login('ltorres@misena.edu.co', NEW_PASSWORD);
      expect(newLogin.status).toBe(200);
    });

    it('AC-USR-05-3 — Un instructor no puede restablecer la contraseña de otro (403 sin efectos)', async () => {
      await createInstructorViaApi(adminToken);
      const createdOther = await createInstructorViaApi(adminToken, {
        email: 'otro@misena.edu.co',
        document: '555555',
        fullName: 'Otro Instructor',
      });
      const otherId = createdOther.body.data.user.id;

      const instructorLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const instructorToken = instructorLogin.body.data.accessToken;

      const response = await request(app)
        .patch(`/api/users/${otherId}/password`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ newPassword: NEW_PASSWORD });

      expect(response.status).toBe(403);

      const otherLogin = await login('otro@misena.edu.co', INSTRUCTOR_PASSWORD);
      expect(otherLogin.status).toBe(200);
    });

    it('AC-USR-05-4 — El restablecimiento cierra todas las sesiones del instructor', async () => {
      const created = await createInstructorViaApi(adminToken);
      const userId = created.body.data.user.id;

      const firstLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const secondLogin = await login('ltorres@misena.edu.co', INSTRUCTOR_PASSWORD);
      const firstAccess = firstLogin.body.data.accessToken;
      const secondAccess = secondLogin.body.data.accessToken;
      const firstRefresh = refreshTokenFrom(firstLogin);
      const secondRefresh = refreshTokenFrom(secondLogin);

      const response = await request(app)
        .patch(`/api/users/${userId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: NEW_PASSWORD });
      expect(response.status).toBe(200);

      for (const token of [firstAccess, secondAccess]) {
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        expect(me.status).toBe(401);
      }
      for (const token of [firstRefresh, secondRefresh]) {
        const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
        expect(refresh.status).toBe(401);
      }
    });
  });

});
