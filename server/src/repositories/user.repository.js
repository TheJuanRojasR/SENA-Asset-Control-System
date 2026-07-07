import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  shift: true,
  imageUrl: true,
  phone: true,
  document: true,
  isActive: true,
  isDeleted: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepository = {
  async findById(id) {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: defaultSelect,
    });
  },

  async findByEmail(email) {
    return prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  },

  async findByEmailWithPassword(email) {
    return prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  },

  async create(data) {
    return prisma.user.create({
      data,
      select: defaultSelect,
    });
  },

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: defaultSelect,
    });
  },

  async softDelete(id) {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
      select: defaultSelect,
    });
  },

  async existsActiveEmail(email, excludeId) {
    const where = { email, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    const count = await prisma.user.count({ where });
    return count > 0;
  },

  async count(filters = {}) {
    return prisma.user.count({ where: buildWhere(filters) });
  },

  async findMany(filters = {}, { page = 1, limit = 20 } = {}) {
    return prisma.user.findMany({
      where: buildWhere(filters),
      select: defaultSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: defaultSelect,
    });
  },
};

function buildWhere(filters) {
  const where = { isDeleted: false };

  if (filters.role) where.role = filters.role;
  if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { document: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}
