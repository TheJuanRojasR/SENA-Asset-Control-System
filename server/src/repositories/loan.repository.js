import { prisma } from '../config/database.js';

const userSelect = { id: true, fullName: true, email: true, role: true, shift: true };

const assignmentInclude = {
  inventoryUnit: {
    include: {
      item: true,
      environment: true,
      parentUnit: { include: { item: true } },
    },
  },
  requestItem: {
    include: {
      item: true,
      request: {
        include: {
          requester: { select: userSelect },
          environment: true,
          deliveredBy: { select: userSelect },
        },
      },
    },
  },
  returnedBy: { select: userSelect },
  lostBy: { select: userSelect },
};

export const loanRepository = {
  /**
   * Préstamos activos: unidades entregadas, no devueltas y no declaradas perdidas.
   * El instructor solo ve las suyas (RN-PRE-17).
   */
  async findActive({ requesterId } = {}, { page = 1, limit = 20 } = {}) {
    const where = {
      loanedAt: { not: null },
      returnedAt: null,
      lostAt: null,
    };
    if (requesterId) {
      where.requestItem = { request: { requesterId } };
    }

    const [data, total] = await Promise.all([
      prisma.requestItemUnit.findMany({
        where,
        include: assignmentInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { loanedAt: 'desc' },
      }),
      prisma.requestItemUnit.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async findBySerials(serials, { tx } = {}) {
    return (tx || prisma).requestItemUnit.findMany({
      where: { inventoryUnit: { serialNumber: { in: serials } } },
      include: {
        inventoryUnit: true,
        requestItem: { include: { item: true, request: true } },
      },
    });
  },

  async registerReturn(
    id,
    { returnedById, physicalStateReturned, returnFunctioning, returnDamageState, returnDescription },
    { tx } = {}
  ) {
    return (tx || prisma).requestItemUnit.update({
      where: { id },
      data: {
        returnedAt: new Date(),
        returnedById,
        physicalStateReturned,
        returnFunctioning,
        returnDamageState,
        returnDescription,
      },
    });
  },

  async updateInventoryUnit(id, data, { tx } = {}) {
    return (tx || prisma).inventoryUnit.update({ where: { id }, data });
  },

  async createMovement(data, { tx } = {}) {
    return (tx || prisma).movement.create({ data });
  },

  async createDamageTask(data, { tx } = {}) {
    return (tx || prisma).damageTask.create({ data });
  },

  async updateRequestItemReturnedQty(id, returnedQty, { tx } = {}) {
    return (tx || prisma).requestItem.update({ where: { id }, data: { returnedQty } });
  },

  async countReturnedByRequestItem(requestItemId, { tx } = {}) {
    return (tx || prisma).requestItemUnit.count({
      where: { requestItemId, returnedAt: { not: null } },
    });
  },

  async findRequestForClosing(requestId, { tx } = {}) {
    return (tx || prisma).request.findUnique({
      where: { id: requestId },
      include: { requestItems: { include: { assignedUnits: true } } },
    });
  },

  async updateRequestStatus(id, status, data, { tx } = {}) {
    return (tx || prisma).request.update({ where: { id }, data: { status, ...data } });
  },

  /** RN-PRE-02: unidades que esa solicitud tiene prestadas y todavía no volvieron. */
  async findPendingByRequest(requestId) {
    return prisma.requestItem.findMany({
      where: { requestId },
      include: {
        item: true,
        assignedUnits: {
          where: { returnedAt: null, lostAt: null },
          include: { inventoryUnit: true },
        },
      },
    });
  },

  /** RN-MOV-01 / US-PRE-06: historial de devoluciones con filtros. */
  async findReturns(filters = {}, { page = 1, limit = 20 } = {}) {
    const where = { returnedAt: { not: null } };
    if (filters.serialNumber) {
      where.inventoryUnit = { serialNumber: filters.serialNumber };
    }
    if (filters.itemId) {
      where.requestItem = { itemId: filters.itemId };
    }
    if (filters.from || filters.to) {
      where.returnedAt = {};
      if (filters.from) where.returnedAt.gte = new Date(`${filters.from}T00:00:00Z`);
      if (filters.to) where.returnedAt.lte = new Date(`${filters.to}T23:59:59Z`);
    }

    const [data, total] = await Promise.all([
      prisma.requestItemUnit.findMany({
        where,
        include: assignmentInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { returnedAt: 'desc' },
      }),
      prisma.requestItemUnit.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
};
