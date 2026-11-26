import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
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
      expect(response.body.data.user.email).toBe('admin@sena.edu.co');
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

  describe('AC-AUTH-02-5 — Tipo de dato inválido en /refresh', () => {
    it('AC-AUTH-02-5 — un token de tipo numérico responde 400 VALIDATION_ERROR y no verifica la firma', async () => {
      const response = await request(app).post('/api/auth/refresh').send({ refreshToken: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      // «Sesión inválida» (INVALID_TOKEN, 401) no es «petición mal formada» (400).
      expect(response.body.code).not.toBe('INVALID_TOKEN');
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('AC-AUTH-02-2 — sin cookie y sin token en el cuerpo responde 400 MISSING_TOKEN', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('AC-AUTH-02-1 — el token puede venir en la cookie sin cuerpo', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });

      const cookie = login.headers['set-cookie'][0].split(';')[0];

      const response = await request(app).post('/api/auth/refresh').set('Cookie', cookie).send();

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
    });
  });

  describe('AC-AUTH-04-1 — Contrato idéntico al del inicio de sesión', () => {
    it('AC-AUTH-04-1 — /me entrega el usuario en el mismo lugar que login y sin contraseña', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });

      const me = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`);

      expect(me.status).toBe(200);

      // Mismo lugar del cuerpo que el inicio de sesión: data.user.
      expect(me.body.data.user).toBeDefined();
      expect(me.body.data.user.email).toBe('admin@sena.edu.co');

      // Misma forma: las dos rutas exponen el mismo conjunto de campos.
      expect(Object.keys(me.body.data.user).sort()).toEqual(
        Object.keys(login.body.data.user).sort()
      );

      // AC-AUTH-04-1: el cuerpo no expone la contraseña ni su hash.
      expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|"password"/i);
    });
  });

  describe('AC-AUTH-04-4 — Token expirado', () => {
    it('AC-AUTH-04-4 — un token vencido responde 401 TOKEN_EXPIRED', async () => {
      const user = await prismaTest.user.findFirst({ where: { email: 'admin@sena.edu.co' } });

      const tokenVencido = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, fullName: user.fullName },
        env.JWT_SECRET,
        { expiresIn: -60 }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenVencido}`);

      // El cliente necesita esta distinción para decidir si renueva la sesión.
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('AC-AUTH-04-3 — un token firmado con otra clave no se confunde con uno vencido', async () => {
      const tokenFalsificado = jwt.sign(
        { userId: 1, email: 'admin@sena.edu.co', role: 'ADMIN' },
        'otra-clave-que-no-es-la-del-servidor'
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenFalsificado}`);

      expect(response.status).toBe(401);
      expect(response.body.code).not.toBe('TOKEN_EXPIRED');
    });
  });

  describe('AC-AUTH-04-5 — Cuenta desactivada con token vigente', () => {
    it('AC-AUTH-04-5 — un token vigente de una cuenta desactivada responde 401', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });

      const tokenVigente = login.body.data.accessToken;
      expect(login.status).toBe(200);

      // La cuenta se desactiva después de haber obtenido el token.
      await prismaTest.user.updateMany({
        where: { email: 'admin@sena.edu.co' },
        data: { isActive: false },
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenVigente}`);

      // La ventana hasta el vencimiento del token no es aceptable (RN-USR-05).
      expect(response.status).toBe(401);
    });
  });

  describe('AC-AUTH-03-2 — El token de refresco deja de servir', () => {
    it('AC-AUTH-03-2 — el token de refresco capturado deja de renovar tras cerrar sesión', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });
      const cookieCapturada = login.headers['set-cookie'][0].split(';')[0];

      const logout = await request(app).post('/api/auth/logout').set('Cookie', cookieCapturada);
      expect(logout.status).toBe(200);

      // El atacante reusa la credencial capturada antes del cierre: debe dar 401.
      const renovacion = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookieCapturada);

      expect(renovacion.status).toBe(401);
      expect(renovacion.headers['set-cookie']).toBeUndefined();
    });

    it('AC-AUTH-03-2 — el cierre de sesión invalida también el token de acceso vigente', async () => {
      const login = await request(app).post('/api/auth/login').send({
        email: 'admin@sena.edu.co',
        password: 'AdminSENA2024',
      });
      const accessToken = login.body.data.accessToken;
      const cookieCapturada = login.headers['set-cookie'][0].split(';')[0];

      await request(app).post('/api/auth/logout').set('Cookie', cookieCapturada);

      const perfil = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(perfil.status).toBe(401);
    });
  });
});
