import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  code: true,
  name: true,
  location: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
};

export const environmentRepository = {
  async findById(id) {
    return prisma.environment.findFirst({
      where: { id, isDeleted: false },
      select: defaultSelect,
    });
  },

  async findByCode(code) {
    return prisma.environment.findFirst({
      where: { code, isDeleted: false },
      select: defaultSelect,
    });
  },

  async create(data) {
    return prisma.environment.create({
      data,
      select: defaultSelect,
    });
  },

  async update(id, data) {
    return prisma.environment.update({
      where: { id },
      data,
      select: defaultSelect,
    });
  },

  async softDelete(id) {
    return prisma.environment.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
      select: defaultSelect,
    });
  },

  async existsActiveCode(code, excludeId) {
    const where = { code, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    const count = await prisma.environment.count({ where });
    return count > 0;
  },

  async count(filters = {}) {
    return prisma.environment.count({ where: buildWhere(filters) });
  },

  async findMany(filters = {}, { page = 1, limit = 20 } = {}) {
    return prisma.environment.findMany({
      where: buildWhere(filters),
      select: defaultSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  async countInventoryUnits(id) {
    return prisma.inventoryUnit.count({
      where: { environmentId: id },
    });
  },
};

function buildWhere(filters) {
  const where = { isDeleted: false };

  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { name: { contains: filters.search } },
      { location: { contains: filters.search } },
    ];
  }

  return where;
}
