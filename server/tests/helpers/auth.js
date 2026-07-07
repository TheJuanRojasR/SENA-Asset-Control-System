import bcrypt from 'bcryptjs';
import { prismaTest } from './prisma.js';
import { generateTokens } from '../../src/utils/jwt.js';

export async function createAdminUser(overrides = {}) {
  return prismaTest.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      fullName: 'Admin Test',
      role: 'ADMIN',
      isActive: true,
      ...overrides,
    },
  });
}

export async function createInstructorUser(overrides = {}) {
  return prismaTest.user.create({
    data: {
      email: 'instructor@test.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      fullName: 'Instructor Test',
      role: 'INSTRUCTOR',
      shift: 'MORNING',
      isActive: true,
      ...overrides,
    },
  });
}

export function generateAccessToken(user) {
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });
  return tokens.accessToken;
}
