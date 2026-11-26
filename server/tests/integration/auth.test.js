import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

describe('Auth endpoints', () => {
  beforeEach(async () => {
    await resetDatabase();
    await prismaTest.user.create({
      data: {
        email: 'admin@sena.edu.co',
        passwordHash: await bcrypt.hash('AdminSENA2024', 10),
        fullName: 'Admin Test',
        role: 'ADMIN',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('debe iniciar sesión con credenciales válidas', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('admin@sena.edu.co');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('debe rechazar credenciales inválidas', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'mal',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('debe devolver el perfil del usuario autenticado', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });

      const token = login.body.data.accessToken;
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('admin@sena.edu.co');
    });

    it('debe rechazar peticiones sin token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('AC-AUTH-01-5 — Cuenta inactiva', () => {
    it('AC-AUTH-01-5 — la cuenta inactiva responde idéntico a credenciales inválidas y no emite cookie', async () => {
      const inactivo = await prismaTest.user.create({
        data: {
          email: 'inactivo@sena.edu.co',
          passwordHash: await bcrypt.hash('AdminSENA2024', 10),
          fullName: 'Usuario Inactivo',
          role: 'INSTRUCTOR',
          shift: 'MORNING',
          isActive: false,
        },
      });

      // AC-AUTH-01-2 / AC-AUTH-01-3: referencia de «credenciales inválidas».
      const credencialesInvalidas = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'clave-que-no-es',
      });

      // AC-AUTH-01-5: cuenta correcta en correo y contraseña, pero desactivada.
      const cuentaInactiva = await request(app).post('/api/auth/login').send({
        email: inactivo.email,
        password: 'AdminSENA2024',
      });

      expect(credencialesInvalidas.status).toBe(401);
      expect(cuentaInactiva.status).toBe(401);
      expect(cuentaInactiva.body).toEqual(credencialesInvalidas.body);
      expect(cuentaInactiva.body.code).toBe('INVALID_CREDENTIALS');
      expect(cuentaInactiva.headers['set-cookie']).toBeUndefined();
    });
  });
});
