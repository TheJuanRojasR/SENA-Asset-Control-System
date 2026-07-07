import { prisma } from '../config/database.js';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  shift: true,
};

export const loanRepository = {
  async findMany({ status, requesterId } = {}, { page = 1, limit = 20 } = {}) {
    const where = {};

    if (status === 'LOANED') {
      where.loanedAt = { not: null };
      where.returnedAt = null;
    } else if (status === 'RETURNED') {
      where.returnedAt = { not: null };
    } else {
      where.loanedAt = { not: null };
    }

    if (requesterId) {
      where.requestItem = { request: { requesterId } };
    }

    const [data, total] = await Promise.all([
      prisma.requestItemUnit.findMany({
        where,
        include: {
          inventoryUnit: {
            include: {
              item: true,
              environment: true,
              parentUnit: {
                include: {
                  item: true,
                },
              },
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
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { loanedAt: 'desc' },
      }),
      prisma.requestItemUnit.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async findById(id) {
    return prisma.requestItemUnit.findUnique({
      where: { id },
      include: {
        inventoryUnit: {
          include: {
            item: true,
            environment: true,
            parentUnit: {
              include: {
                item: true,
              },
            },
          },
        },
        requestItem: {
          include: {
            item: true,
            request: {
              include: {
                requester: { select: userSelect },
                environment: true,
              },
            },
          },
        },
        returnedBy: { select: userSelect },
      },
    });
  },

  async findByIds(ids, { tx } = {}) {
    return (tx || prisma).requestItemUnit.findMany({
      where: { id: { in: ids } },
      include: {
        inventoryUnit: true,
        requestItem: true,
      },
    });
  },

  async returnUnit(id, { returnedById, physicalStateReturned }, { tx } = {}) {
    return (tx || prisma).requestItemUnit.update({
      where: { id },
      data: {
        returnedAt: new Date(),
        returnedById,
        physicalStateReturned,
      },
    });
  },

  async updateRequestItemReturnedQty(id, returnedQty, { tx } = {}) {
    return (tx || prisma).requestItem.update({
      where: { id },
      data: { returnedQty },
    });
  },

  async updateRequestStatus(id, status, data, { tx } = {}) {
    return (tx || prisma).request.update({
      where: { id },
      data: { status, ...data },
    });
  },

  async createMovement(data, { tx } = {}) {
    return (tx || prisma).movement.create({ data });
  },

  async updateInventoryUnit(id, data, { tx } = {}) {
    return (tx || prisma).inventoryUnit.update({
      where: { id },
      data,
    });
  },

  async countReturnedByRequestItem(requestItemId, { tx } = {}) {
    return (tx || prisma).requestItemUnit.count({
      where: {
        requestItemId,
        returnedAt: { not: null },
      },
    });
  },

  async countAssignedByRequestItem(requestItemId, { tx } = {}) {
    return (tx || prisma).requestItemUnit.count({
      where: { requestItemId },
    });
  },
};
