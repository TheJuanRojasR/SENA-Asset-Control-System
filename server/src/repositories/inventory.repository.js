import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  itemId: true,
  serialNumber: true,
  environmentId: true,
  parentUnitId: true,
  status: true,
  physicalState: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  item: {
    select: {
      id: true,
      code: true,
      name: true,
      minStock: true,
    },
  },
  environment: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  parentUnit: {
    select: {
      id: true,
      serialNumber: true,
      item: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
};

export const inventoryRepository = {
  async findById(id) {
    return prisma.inventoryUnit.findFirst({
      where: { id },
      select: {
        ...defaultSelect,
        childUnits: {
          select: defaultSelect,
          orderBy: { serialNumber: 'asc' },
        },
      },
    });
  },

  async findBySerialNumber(serialNumber) {
    return prisma.inventoryUnit.findFirst({
      where: { serialNumber },
      select: defaultSelect,
    });
  },

  async create(data) {
    return prisma.inventoryUnit.create({
      data,
      select: defaultSelect,
    });
  },

  async update(id, data) {
    return prisma.inventoryUnit.update({
      where: { id },
      data,
      select: defaultSelect,
    });
  },

  async hardDelete(id) {
    return prisma.$transaction(async (tx) => {
      await tx.inventoryUnit.updateMany({
        where: { parentUnitId: id },
        data: { parentUnitId: null },
      });

      await tx.movement.deleteMany({
        where: { inventoryUnitId: id },
      });

      return tx.inventoryUnit.delete({
        where: { id },
        select: defaultSelect,
      });
    });
  },

  async count(filters = {}) {
    return prisma.inventoryUnit.count({ where: buildWhere(filters) });
  },

  async findMany(filters = {}, { page = 1, limit = 20 } = {}) {
    return prisma.inventoryUnit.findMany({
      where: buildWhere(filters),
      select: defaultSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findItemsWithAvailableStock() {
    const items = await prisma.item.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        code: true,
        name: true,
        minStock: true,
        unit: true,
        _count: {
          select: {
            inventoryUnits: {
              where: { status: 'AVAILABLE' },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return items.map((item) => ({
      ...item,
      availableStock: item._count.inventoryUnits,
      _count: undefined,
    }));
  },

  async findExistingSerialsByItemCode(itemCode) {
    const rows = await prisma.inventoryUnit.findMany({
      where: {
        serialNumber: { startsWith: `${itemCode}-` },
      },
      select: { serialNumber: true },
    });
    return rows.map((row) => row.serialNumber);
  },

  async findUnitsByIds(ids, { tx } = {}) {
    return (tx || prisma).inventoryUnit.findMany({
      where: { id: { in: ids } },
      select: defaultSelect,
    });
  },

  async findChildUnits(parentUnitId, { tx } = {}) {
    return (tx || prisma).inventoryUnit.findMany({
      where: { parentUnitId },
      select: defaultSelect,
    });
  },

  async updateParentUnit(unitId, parentUnitId, { tx } = {}) {
    return (tx || prisma).inventoryUnit.update({
      where: { id: unitId },
      data: { parentUnitId },
      select: defaultSelect,
    });
  },

  async findItemComponents(itemId) {
    return prisma.itemComponent.findMany({
      where: { parentItemId: itemId },
      include: {
        childItem: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  },
};

function buildWhere(filters) {
  const where = {};

  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.environmentId) where.environmentId = filters.environmentId;
  if (filters.status) where.status = filters.status;
  if (filters.physicalState) where.physicalState = filters.physicalState;

  if (filters.search) {
    where.OR = [
      { serialNumber: { contains: filters.search } },
      { item: { name: { contains: filters.search } } },
    ];
  }

  return where;
}
