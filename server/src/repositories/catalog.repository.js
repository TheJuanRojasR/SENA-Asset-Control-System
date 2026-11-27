import { prisma } from '../config/database.js';

/**
 * Select mínimo del elemento de catálogo: RN-CAT-01 prohíbe exponer unidades o seriales.
 * La cantidad disponible se calcula en el servicio para el rango pedido.
 */
const catalogItemSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  unit: true,
  minStock: true,
  isConsumable: true,
  stock: true,
  category: {
    select: { id: true, name: true },
  },
};

const reservationSelect = {
  requestItemUnits: {
    where: { returnedAt: null },
    select: {
      requestItem: {
        select: {
          request: {
            select: {
              status: true,
              requestDate: true,
              estimatedDate: true,
            },
          },
        },
      },
    },
  },
};

const unitAvailabilitySelect = {
  id: true,
  itemId: true,
  status: true,
  physicalState: true,
  disposalInProgress: true,
  declaredLost: true,
  parentUnitId: true,
  ...reservationSelect,
  parentUnit: {
    select: {
      id: true,
      status: true,
      physicalState: true,
      disposalInProgress: true,
      declaredLost: true,
      ...reservationSelect,
    },
  },
};

export const catalogRepository = {
  async findItems(filters, { page = 1, limit = 20 } = {}) {
    return prisma.item.findMany({
      where: buildWhere(filters),
      select: catalogItemSelect,
      skip: (page - 1) * limit,
      take: limit,
      // Orden total y determinista para que las páginas no se solapen (AC-CAT-04-2).
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  },

  async countItems(filters) {
    return prisma.item.count({ where: buildWhere(filters) });
  },

  async findUnitsByItemIds(itemIds) {
    if (itemIds.length === 0) return [];
    return prisma.inventoryUnit.findMany({
      where: { itemId: { in: itemIds } },
      select: unitAvailabilitySelect,
    });
  },
};

function buildWhere(filters = {}) {
  // RN-CAT-05 / RN-INV-45: el catálogo ofrece elementos activos; uno dado de baja deja de
  // ofrecerse aunque conserve unidades físicas.
  const where = { isActive: true, isDeleted: false };

  if (filters.categoryId) where.categoryId = filters.categoryId;
  // RN-CAT-02: búsqueda parcial por nombre.
  if (filters.search) where.name = { contains: filters.search };

  return where;
}
