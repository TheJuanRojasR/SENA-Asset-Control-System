import { prisma } from '../config/database.js';

/**
 * RN-INV-33 / RN-PRE-15: una unidad en trámite de baja no se ofrece, ni sus piezas sueltas;
 * la única excepción es una unidad (o conjunto) declarado perdido, que deja sus piezas
 * prestables.
 */
const availabilityFilter = {
  disposalInProgress: false,
  declaredLost: false,
  OR: [
    // RN-INV-31: la unidad como unidad solo se presta si está OPERATIVA.
    { parentUnitId: null, physicalState: 'OPERATIVO' },
    // Pieza suelta: decide el estado del conjunto padre. CON_FALLA y AVERIADO prestan
    // piezas; EN_MANTENIMIENTO y DESCARGADO_AGOTADO no prestan nada. La pérdida
    // declarada es la excepción de RN-PRE-15.
    {
      parentUnitId: { not: null },
      parentUnit: {
        OR: [
          { declaredLost: true },
          {
            disposalInProgress: false,
            physicalState: { in: ['OPERATIVO', 'CON_FALLA', 'AVERIADO'] },
          },
        ],
      },
    },
  ],
};

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  shift: true,
};

const requesterSelect = {
  ...userSelect,
  document: true,
  phone: true,
  imageUrl: true,
};

export const requestSelect = {
  id: true,
  code: true,
  requesterId: true,
  environmentId: true,
  shift: true,
  status: true,
  requestDate: true,
  pickupDate: true,
  estimatedDate: true,
  approvalNote: true,
  packingNotes: true,
  observations: true,
  approvedById: true,
  approvedAt: true,
  rejectionReason: true,
  rejectedById: true,
  rejectedAt: true,
  packedById: true,
  packedAt: true,
  deliveredById: true,
  deliveredAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  requester: {
    select: requesterSelect,
  },
  approvedBy: { select: userSelect },
  rejectedBy: { select: userSelect },
  packedBy: { select: userSelect },
  deliveredBy: { select: userSelect },
  environment: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  requestItems: {
    select: {
      id: true,
      itemId: true,
      requestedQty: true,
      approvedQty: true,
      deliveredQty: true,
      returnedQty: true,
      physicalStateApproved: true,
      item: {
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          imageUrl: true,
        },
      },
      assignedUnits: {
        select: {
          id: true,
          inventoryUnitId: true,
          loanedAt: true,
          inventoryUnit: {
            select: {
              id: true,
              serialNumber: true,
              status: true,
              physicalState: true,
              parentUnitId: true,
            },
          },
        },
      },
    },
  },
};

export const requestRepository = {
  async findById(id, { tx } = {}) {
    return (tx || prisma).request.findUnique({
      where: { id },
      select: requestSelect,
    });
  },

  async findByCode(code, { tx } = {}) {
    return (tx || prisma).request.findUnique({
      where: { code },
      select: requestSelect,
    });
  },

  async countByCodePrefix(prefix, { tx } = {}) {
    return (tx || prisma).request.count({
      where: { code: { startsWith: prefix } },
    });
  },

  async findMany({ filters, requesterId }, { page = 1, limit = 20 } = {}, { tx } = {}) {
    return (tx || prisma).request.findMany({
      where: buildWhere(filters, requesterId),
      select: requestSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  async count({ filters, requesterId }, { tx } = {}) {
    return (tx || prisma).request.count({
      where: buildWhere(filters, requesterId),
    });
  },

  async create(data, { tx } = {}) {
    return (tx || prisma).request.create({
      data,
      select: requestSelect,
    });
  },

  async update(id, data, { tx } = {}) {
    return (tx || prisma).request.update({
      where: { id },
      data,
      select: requestSelect,
    });
  },

  async findRequestItemsByRequestId(requestId, { tx } = {}) {
    return (tx || prisma).requestItem.findMany({
      where: { requestId },
      include: {
        assignedUnits: {
          include: {
            inventoryUnit: true,
          },
        },
      },
    });
  },

  async updateRequestItem(id, data, { tx } = {}) {
    return (tx || prisma).requestItem.update({
      where: { id },
      data,
    });
  },

  async createRequestItemUnit(data, { tx } = {}) {
    return (tx || prisma).requestItemUnit.create({
      data,
    });
  },

  async updateInventoryUnit(id, data, { tx } = {}) {
    return (tx || prisma).inventoryUnit.update({
      where: { id },
      data,
    });
  },

  async createMovement(data, { tx } = {}) {
    return (tx || prisma).movement.create({
      data,
    });
  },

  /**
   * RN-NEG-01/02: unidades candidatas para un ítem con sus reservas activas y su rango, para
   * decidir disponibilidad por solapamiento de fechas en vez de por estado global.
   */
  async findUnitsForRange(itemId, { tx } = {}) {
    return (tx || prisma).inventoryUnit.findMany({
      where: {
        itemId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        disposalInProgress: false,
        declaredLost: false,
      },
      include: {
        parentUnit: {
          select: {
            id: true,
            status: true,
            physicalState: true,
            disposalInProgress: true,
            declaredLost: true,
          },
        },
        childUnits: { where: { status: 'AVAILABLE' }, select: { id: true, itemId: true } },
        requestItemUnits: {
          where: { returnedAt: null, lostAt: null },
          select: {
            requestItem: {
              select: {
                request: {
                  select: {
                    id: true,
                    status: true,
                    pickupDate: true,
                    requestDate: true,
                    pickupDate: true,
                    estimatedDate: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  },

  async countAvailableUnitsByItemId(itemId, { tx } = {}) {
    return (tx || prisma).inventoryUnit.count({
      where: { itemId, status: 'AVAILABLE', ...availabilityFilter },
    });
  },

  async findAvailableUnitsByItemId(itemId, limit, { tx } = {}) {
    return (tx || prisma).inventoryUnit.findMany({
      where: { itemId, status: 'AVAILABLE', ...availabilityFilter },
      take: limit,
      orderBy: { id: 'asc' },
    });
  },
};

function buildWhere(filters, requesterId) {
  const where = {};

  if (requesterId) where.requesterId = requesterId;
  if (filters.status) where.status = filters.status;
  if (filters.requesterId) where.requesterId = filters.requesterId;

  if (filters.search) {
    where.OR = [
      { code: { contains: filters.search } },
      { requester: { fullName: { contains: filters.search } } },
      { requester: { email: { contains: filters.search } } },
    ];
  }

  return where;
}
