import { prisma } from '../config/database.js';

const userSelect = { id: true, fullName: true, email: true, role: true };

export const movementRepository = {
  /** RN-MOV-02 / RN-CTX-02: historial paginado con orden total y determinista. */
  async findMany(filters = {}, { page = 1, limit = 20 } = {}) {
    const where = buildWhere(filters);

    const [data, total] = await Promise.all([
      prisma.movement.findMany({
        where,
        include: {
          item: { select: { id: true, code: true, name: true, unit: true } },
          inventoryUnit: { select: { id: true, serialNumber: true, itemId: true } },
          responsible: { select: userSelect },
          request: { select: { id: true, code: true, status: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.movement.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
};

function buildWhere(filters = {}) {
  const where = {};
  if (filters.inventoryUnitId) where.inventoryUnitId = filters.inventoryUnitId;
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.type) where.type = filters.type;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(`${filters.from}T00:00:00Z`);
    if (filters.to) where.createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`);
  }
  return where;
}
