import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  imageUrl: true,
  categoryId: true,
  minStock: true,
  unit: true,
  isConsumable: true,
  ownership: true,
  stock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const categorySelect = {
  id: true,
  name: true,
};

const unitSelect = {
  id: true,
  serialNumber: true,
  environmentId: true,
  status: true,
  physicalState: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

export const itemRepository = {
  async findMany(filters, { page = 1, limit = 20, includeInactive = true } = {}) {
    return prisma.item.findMany({
      where: buildWhere(filters, { includeInactive }),
      select: {
        ...defaultSelect,
        category: { select: categorySelect },
        components: {
          include: {
            childItem: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
                isConsumable: true,
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    });
  },

  async findManyActive(filters, { page = 1, limit = 20 } = {}) {
    return this.findMany(filters, { page, limit, includeInactive: false });
  },

  async count(filters, { includeInactive = true } = {}) {
    return prisma.item.count({
      where: buildWhere(filters, { includeInactive }),
    });
  },

  async findById(id, { includeDeleted = false } = {}) {
    return prisma.item.findFirst({
      where: includeDeleted ? { id } : { id, isDeleted: false },
      select: {
        ...defaultSelect,
        category: { select: categorySelect },
        inventoryUnits: {
          select: unitSelect,
          orderBy: { serialNumber: 'asc' },
        },
        components: {
          include: {
            childItem: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
                isConsumable: true,
              },
            },
          },
        },
      },
    });
  },

  async findByCode(code, excludeId) {
    const where = { code, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    return prisma.item.findFirst({
      where,
      select: defaultSelect,
    });
  },

  async create(data, inventoryUnits = []) {
    return prisma.item.create({
      data: {
        ...data,
        inventoryUnits: inventoryUnits.length > 0 ? { create: inventoryUnits } : undefined,
      },
      select: {
        ...defaultSelect,
        category: { select: categorySelect },
        inventoryUnits: {
          select: unitSelect,
          orderBy: { serialNumber: 'asc' },
        },
      },
    });
  },

  async update(id, data, { tx } = {}) {
    const db = tx || prisma;
    const { categoryId, ...itemData } = data;
    delete itemData.initialQty;
    return db.item.update({
      where: { id },
      data: {
        ...itemData,
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
      },
      select: {
        ...defaultSelect,
        category: { select: categorySelect },
      },
    });
  },

  async softDelete(id) {
    return prisma.item.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
      select: defaultSelect,
    });
  },

  async restore(id) {
    return prisma.item.update({
      where: { id },
      data: { isDeleted: false, isActive: true },
      select: defaultSelect,
    });
  },

  async hardDelete(id) {
    return prisma.$transaction([
      prisma.inventoryUnit.deleteMany({ where: { itemId: id }}),
      prisma.item.delete({ where: { id } }),
    ])
  },

  /**
   * RN-INV-45: una unidad está comprometida si está prestada o reservada. Una unidad
   * dada de baja o declarada perdida (DISPOSED) sale del inventario activo y no bloquea;
   * RN-PRE-15 lo fija para la pérdida.
   */
  async countCommittedUnits(id) {
    return prisma.inventoryUnit.count({
      where: { itemId: id, status: { in: ['LOANED', 'RESERVED'] } },
    });
  },

  /**
   * RN-INV-45: la baja es un estado, no un borrado. El elemento sigue en el catálogo y
   * consultable; deja de ofrecerse para solicitudes nuevas.
   */
  async deactivate(id) {
    return prisma.item.update({
      where: { id },
      data: { isActive: false },
      select: defaultSelect,
    });
  },

  async countAvailableUnits(id) {
    return prisma.inventoryUnit.count({
      where: { itemId: id, status: 'AVAILABLE' },
    });
  },

  async findComponents(parentItemId) {
    return prisma.itemComponent.findMany({
      where: { parentItemId },
      include: {
        childItem: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            isConsumable: true,
          },
        },
      },
    });
  },

  async setComponents(parentItemId, components, { tx } = {}) {
    const db = tx || prisma;
    await db.itemComponent.deleteMany({ where: { parentItemId } });
    if (!components || components.length === 0) return [];

    // RN-INV-23 / AC-ITE-03-2: un componente puede repetirse en la composición. La
    // repetición se representa sumando cantidades (la regla admite cantidad o filas).
    const merged = new Map();
    for (const component of components) {
      const existing = merged.get(component.childItemId);
      if (existing) {
        existing.quantity += component.quantity ?? 1;
        existing.isRequired = existing.isRequired && (component.isRequired ?? true);
      } else {
        merged.set(component.childItemId, {
          parentItemId,
          childItemId: component.childItemId,
          quantity: component.quantity ?? 1,
          isRequired: component.isRequired ?? true,
        });
      }
    }

    return db.itemComponent.createMany({ data: [...merged.values()] });
  },
};

function buildWhere(filters = {}, { includeInactive = true } = {}) {
  const where = {};

  if (!includeInactive) {
    where.isDeleted = false;
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { code: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  return where;
}
