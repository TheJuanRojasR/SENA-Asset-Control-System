import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app.js';
import { prismaTest, resetDatabase } from '../helpers/prisma.js';

describe('User endpoints', () => {
  let adminToken;

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

    const login = await request(app).post('/api/auth/login').send({
      email: 'admin@sena.edu.co',
      password: 'AdminSENA2024',
    });

    adminToken = login.body.data.accessToken;
  });

  afterAll(async () => {
    await prismaTest.$disconnect();
  });

  describe('POST /api/users', () => {
    it('debe crear un instructor con shift obligatorio', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Instructor Test',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
          shift: 'MORNING',
          imageUrl: 'https://example.com/image.png',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('instructor@sena.edu.co');
      expect(response.body.data.user.role).toBe('INSTRUCTOR');
      expect(response.body.data.user.shift).toBe('MORNING');
      expect(response.body.data.user.imageUrl).toBe('https://example.com/image.png');
    });

    it('debe crear un admin sin shift', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Otro Admin',
          email: 'otro.admin@sena.edu.co',
          password: 'AdminSENA2024',
          role: 'ADMIN',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('ADMIN');
      expect(response.body.data.user.shift).toBeNull();
    });

    it('debe rechazar crear un instructor sin shift', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Instructor Test',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.errors.some((e) => e.includes('shift'))).toBe(true);
    });

    it('debe rechazar un email duplicado', async () => {
      await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({
        fullName: 'Instructor Test',
        email: 'instructor@sena.edu.co',
        password: 'Instructor2024',
        role: 'INSTRUCTOR',
        shift: 'MORNING',
      });

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Otro Instructor',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
          shift: 'AFTERNOON',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('GET /api/users', () => {
    it('debe listar usuarios con sus nuevos campos', async () => {
      await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({
        fullName: 'Instructor Test',
        email: 'instructor@sena.edu.co',
        password: 'Instructor2024',
        role: 'INSTRUCTOR',
        shift: 'NIGHT',
      });

      const response = await request(app)
        .get('/api/users?role=INSTRUCTOR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.data[0].shift).toBe('NIGHT');
      expect(response.body.data.meta.total).toBe(1);
    });
  });

  describe('GET /api/users/:id', () => {
    it('debe obtener un usuario por id', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Instructor Test',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
          shift: 'MORNING',
        });

      const userId = created.body.data.user.id;
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('instructor@sena.edu.co');
      expect(response.body.data.user.shift).toBe('MORNING');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('debe actualizar shift e imageUrl de un instructor', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Instructor Test',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
          shift: 'MORNING',
        });

      const userId = created.body.data.user.id;
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shift: 'AFTERNOON',
          imageUrl: 'https://example.com/updated.png',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.shift).toBe('AFTERNOON');
      expect(response.body.data.user.imageUrl).toBe('https://example.com/updated.png');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('debe eliminar un instructor', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Instructor Test',
          email: 'instructor@sena.edu.co',
          password: 'Instructor2024',
          role: 'INSTRUCTOR',
          shift: 'MORNING',
        });

      const userId = created.body.data.user.id;
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('debe rechazar eliminar el único admin activo', async () => {
      const admin = await prismaTest.user.findFirst({ where: { email: 'admin@sena.edu.co' } });

      const response = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('LAST_ADMIN');
    });
  });
});
