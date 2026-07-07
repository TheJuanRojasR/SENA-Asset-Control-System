import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
};

export const categoryRepository = {
  async findManyActive(search) {
    return prisma.category.findMany({
      where: buildWhere({ search }),
      select: defaultSelect,
      orderBy: { name: 'asc' },
    });
  },

  async findById(id) {
    return prisma.category.findFirst({
      where: { id, isDeleted: false },
      select: defaultSelect,
    });
  },

  async findByName(name, excludeId) {
    const where = { name, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    return prisma.category.findFirst({
      where,
      select: defaultSelect,
    });
  },

  async create(data) {
    return prisma.category.create({
      data,
      select: defaultSelect,
    });
  },

  async update(id, data) {
    return prisma.category.update({
      where: { id },
      data,
      select: defaultSelect,
    });
  },

  async softDelete(id) {
    return prisma.category.update({
      where: { id },
      data: { isDeleted: true },
      select: defaultSelect,
    });
  },

  async countItems(id) {
    return prisma.item.count({
      where: { categoryId: id, isDeleted: false },
    });
  },
};

function buildWhere({ search }) {
  const where = { isDeleted: false };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  return where;
}
