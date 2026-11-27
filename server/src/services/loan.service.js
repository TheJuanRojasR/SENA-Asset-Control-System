import { prisma } from '../config/database.js';
import { loanRepository } from '../repositories/loan.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * RN-PRE-12 — mapeo de la condición de retorno al estado físico de la unidad.
 * RN-PRE-11: el estado se actualiza en la misma operación de devolución.
 * Solo se asignan los estados que el mapeo distingue: OPERATIVO y CON_FALLA. Los estados
 * severos (agotado, averiado, mantenimiento, baja) no se asignan solos; el administrador
 * los corrige a mano.
 */
const mapConditionToPhysicalState = (functioning) =>
  functioning === 'FUNCIONA' ? 'OPERATIVO' : 'CON_FALLA';

// RN-PRE-13 nombra tres disparadores: falta una pieza, algo no funciona o algo vuelve
// dañado. La pieza faltante no tiene campo propio: se reporta en la descripción libre
// (AC-PRE-03-7), así que se reconoce por su texto.
const reportsMissingPiece = (description) =>
  /(falta|faltante|sin pieza|piezas? falt)/i.test(description || '');

const needsDamageTask = ({ functioning, damageState, description }) =>
  functioning !== 'FUNCIONA' ||
  damageState === 'DANADO' ||
  reportsMissingPiece(description);

const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

const isOverdue = (estimatedDate) => {
  if (!estimatedDate) return false;
  const date = new Date(estimatedDate);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return day < todayUtc();
};

const mapLoan = (assignment) => {
  const request = assignment.requestItem.request;
  return {
    id: assignment.id,
    serialNumber: assignment.inventoryUnit.serialNumber,
    item: {
      id: assignment.requestItem.item.id,
      code: assignment.requestItem.item.code,
      name: assignment.requestItem.item.name,
    },
    requester: request.requester,
    pickupDate: request.requestDate,
    estimatedReturnDate: request.estimatedDate,
    loanedAt: assignment.loanedAt,
    overdue: isOverdue(request.estimatedDate),
    physicalState: assignment.inventoryUnit.physicalState,
    unitStatus: assignment.inventoryUnit.status,
  };
};

const mapReturn = (assignment) => ({
  id: assignment.id,
  serialNumber: assignment.inventoryUnit.serialNumber,
  item: {
    id: assignment.requestItem.item.id,
    code: assignment.requestItem.item.code,
    name: assignment.requestItem.item.name,
  },
  requester: assignment.requestItem.request.requester,
  returnedAt: assignment.returnedAt,
  functioning: assignment.returnFunctioning,
  damageState: assignment.returnDamageState,
  description: assignment.returnDescription,
  physicalStateReturned: assignment.physicalStateReturned,
  returnedBy: assignment.returnedBy,
});

/**
 * RN-SOL-12 / RN-PRE-01: la solicitud se cierra cuando no queda nada afuera; una entrega
 * parcial sigue en PARTIALLY_DELIVERED hasta que se entregue el resto.
 */
async function recalculateRequestStatus(requestId, { tx } = {}) {
  const request = await loanRepository.findRequestForClosing(requestId, { tx });
  if (!request) return;

  let assigned = 0;
  let resolved = 0;
  let deliveredQty = 0;
  let approvedQty = 0;

  for (const item of request.requestItems) {
    assigned += item.assignedUnits.length;
    resolved += item.assignedUnits.filter((unit) => unit.returnedAt || unit.lostAt).length;
    deliveredQty += item.deliveredQty || 0;
    approvedQty += item.approvedQty ?? item.requestedQty ?? 0;
  }

  if (assigned === 0) return;

  let status;
  let extraData = {};
  if (deliveredQty < approvedQty) {
    status = 'PARTIALLY_DELIVERED';
  } else if (resolved === assigned) {
    status = 'COMPLETED';
    extraData = { completedAt: new Date() };
  } else if (resolved > 0) {
    status = 'PARTIALLY_RETURNED';
  } else {
    status = 'DELIVERED';
  }

  await loanRepository.updateRequestStatus(requestId, status, extraData, { tx });
}

export const loanService = {
  async listLoans(user, filters = {}, pagination = {}) {
    const requesterId = user.role === 'ADMIN' ? undefined : user.userId;
    const result = await loanRepository.findActive({ requesterId }, pagination);
    return {
      data: result.data.map(mapLoan),
      meta: result.meta,
    };
  },

  /**
   * RN-PRE-04 / RN-PRE-03: devolución de unidades concretas por serial, cada una con su
   * condición de retorno obligatoria. El administrador no puede rechazar la devolución.
   */
  async returnUnits(adminId, { requestId, returns }) {
    if (!Array.isArray(returns) || returns.length === 0) {
      throw new AppError('Debe indicar al menos una unidad', HTTP_STATUS.BAD_REQUEST, 'EMPTY_UNITS');
    }

    const serials = returns.map((entry) => entry.serialNumber);
    if (new Set(serials).size !== serials.length) {
      throw new AppError(
        'No puede devolver la misma unidad dos veces',
        HTTP_STATUS.BAD_REQUEST,
        'DUPLICATED_UNITS'
      );
    }

    return prisma.$transaction(async (tx) => {
      const assignments = await loanRepository.findBySerials(serials, { tx });

      if (assignments.length === 0) {
        throw new AppError(
          'Una o más unidades no existen',
          HTTP_STATUS.NOT_FOUND,
          'UNITS_NOT_FOUND'
        );
      }

      // Una unidad puede tener historial de préstamos anteriores; la devolución se aplica
      // a la asignación activa (no devuelta y no perdida).
      const allBySerial = new Map();
      const activeBySerial = new Map();
      for (const assignment of assignments) {
        const serial = assignment.inventoryUnit.serialNumber;
        if (!allBySerial.has(serial)) allBySerial.set(serial, assignment);
        if (!assignment.returnedAt && !assignment.lostAt) {
          activeBySerial.set(serial, assignment);
        }
      }

      for (const entry of returns) {
        if (!allBySerial.has(entry.serialNumber)) {
          throw new AppError(
            'Una o más unidades no existen',
            HTTP_STATUS.NOT_FOUND,
            'UNITS_NOT_FOUND'
          );
        }
        const assignment = activeBySerial.get(entry.serialNumber);
        if (!assignment) {
          const previous = allBySerial.get(entry.serialNumber);
          if (previous?.returnedAt) {
            throw new AppError(
              `La unidad ${entry.serialNumber} ya fue devuelta`,
              HTTP_STATUS.CONFLICT,
              'UNIT_ALREADY_RETURNED'
            );
          }
          throw new AppError(
            `La unidad ${entry.serialNumber} fue declarada perdida`,
            HTTP_STATUS.CONFLICT,
            'UNIT_LOST'
          );
        }

        if (requestId && assignment.requestItem.requestId !== requestId) {
          throw new AppError(
            'La unidad no está prestada en esa solicitud',
            HTTP_STATUS.CONFLICT,
            'UNIT_NOT_IN_REQUEST'
          );
        }
        if (assignment.returnedAt) {
          throw new AppError(
            `La unidad ${entry.serialNumber} ya fue devuelta`,
            HTTP_STATUS.CONFLICT,
            'UNIT_ALREADY_RETURNED'
          );
        }
        if (assignment.lostAt) {
          throw new AppError(
            `La unidad ${entry.serialNumber} fue declarada perdida`,
            HTTP_STATUS.CONFLICT,
            'UNIT_LOST'
          );
        }
        if (assignment.inventoryUnit.status !== 'LOANED') {
          throw new AppError(
            `La unidad ${entry.serialNumber} no está en préstamo`,
            HTTP_STATUS.CONFLICT,
            'UNIT_NOT_LOANED'
          );
        }
      }

      const affectedRequestItemIds = new Set();
      const affectedRequestIds = new Set();

      for (const entry of returns) {
        const assignment = activeBySerial.get(entry.serialNumber);
        const physicalState = mapConditionToPhysicalState(entry.functioning);

        await loanRepository.updateInventoryUnit(
          assignment.inventoryUnitId,
          { status: 'AVAILABLE', physicalState },
          { tx }
        );

        await loanRepository.registerReturn(
          assignment.id,
          {
            returnedById: adminId,
            physicalStateReturned: physicalState,
            returnFunctioning: entry.functioning,
            returnDamageState: entry.damageState,
            returnDescription: entry.description,
          },
          { tx }
        );

        await loanRepository.createMovement(
          {
            type: 'RETURN',
            itemId: assignment.requestItem.itemId,
            inventoryUnitId: assignment.inventoryUnitId,
            quantity: 1,
            responsibleId: adminId,
            requestId: assignment.requestItem.requestId,
          },
          { tx }
        );

        // RN-PRE-06: una tarea pendiente cuando algo no funciona o vuelve dañado.
        if (needsDamageTask(entry)) {
          await loanRepository.createDamageTask(
            {
              inventoryUnitId: assignment.inventoryUnitId,
              requestItemUnitId: assignment.id,
              description:
                entry.description ||
                `Devolución con funcionamiento ${entry.functioning} y estado ${entry.damageState}`,
              createdById: adminId,
            },
            { tx }
          );
        }

        affectedRequestItemIds.add(assignment.requestItemId);
        affectedRequestIds.add(assignment.requestItem.requestId);
      }

      for (const requestItemId of affectedRequestItemIds) {
        const returnedCount = await loanRepository.countReturnedByRequestItem(requestItemId, { tx });
        await loanRepository.updateRequestItemReturnedQty(requestItemId, returnedCount, { tx });
      }

      for (const requestIdToRecalculate of affectedRequestIds) {
        await recalculateRequestStatus(requestIdToRecalculate, { tx });
      }

      return { returnedCount: returns.length, returned: serials };
    });
  },

  // ---- US-PRE-03: tareas por daño ----
  async listDamageTasks(filters, pagination) {
    const result = await loanRepository.findDamageTasks(filters, pagination);
    return {
      data: result.data.map((task) => ({
        id: task.id,
        status: task.status,
        description: task.description,
        createdAt: task.createdAt,
        resolvedAt: task.resolvedAt,
        resolutionNote: task.resolutionNote,
        inventoryUnit: {
          id: task.inventoryUnit.id,
          serialNumber: task.inventoryUnit.serialNumber,
          item: {
            id: task.inventoryUnit.item.id,
            code: task.inventoryUnit.item.code,
            name: task.inventoryUnit.item.name,
          },
        },
        requester:
          task.requestItemUnit?.requestItem?.request?.requester ?? null,
        createdBy: task.createdBy,
        resolvedBy: task.resolvedBy,
      })),
      meta: result.meta,
    };
  },

  /** RN-PRE-09: la tarea la resuelve el administrador; una resuelta no se reabre. */
  async resolveDamageTask(adminId, taskId, { resolutionNote }) {
    const task = await loanRepository.findDamageTaskById(taskId);
    if (!task) {
      throw new AppError('Tarea no encontrada', HTTP_STATUS.NOT_FOUND, 'DAMAGE_TASK_NOT_FOUND');
    }
    if (task.status === 'RESOLVED') {
      throw new AppError(
        'La tarea ya está resuelta y no se reabre',
        HTTP_STATUS.CONFLICT,
        'DAMAGE_TASK_ALREADY_RESOLVED'
      );
    }

    const resolved = await loanRepository.resolveDamageTask(taskId, {
      resolvedById: adminId,
      resolutionNote,
    });
    return { task: { id: resolved.id, status: resolved.status, resolutionNote: resolved.resolutionNote } };
  },

  // ---- US-PRE-05: pérdida declarada ----
  /**
   * RN-PRE-15 / RN-INV-14 / RN-INV-19: la pérdida sigue el camino de la tenencia.
   * SENA: trámite de baja (sigue existiendo, bloqueado). Donada: baja inmediata.
   * En ambos casos sale del inventario activo y no bloquea disponibilidad.
   */
  async declareLoss(adminId, { serialNumber, reason, requestId }) {
    return prisma.$transaction(async (tx) => {
      const [assignment] = await loanRepository.findBySerials([serialNumber], { tx });
      if (!assignment) {
        throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'UNITS_NOT_FOUND');
      }
      if (requestId && assignment.requestItem.requestId !== requestId) {
        throw new AppError(
          'La unidad no está prestada en esa solicitud',
          HTTP_STATUS.CONFLICT,
          'UNIT_NOT_IN_REQUEST'
        );
      }
      if (assignment.returnedAt) {
        throw new AppError(
          'La unidad ya fue devuelta',
          HTTP_STATUS.CONFLICT,
          'UNIT_ALREADY_RETURNED'
        );
      }
      if (assignment.lostAt) {
        throw new AppError(
          'La unidad ya fue declarada perdida',
          HTTP_STATUS.CONFLICT,
          'UNIT_ALREADY_LOST'
        );
      }
      if (assignment.inventoryUnit.status !== 'LOANED') {
        throw new AppError(
          'La unidad no está en préstamo',
          HTTP_STATUS.CONFLICT,
          'UNIT_NOT_LOANED'
        );
      }

      const ownership = assignment.requestItem.item.ownership;
      const donated = ownership === 'DONATED';

      await loanRepository.updateInventoryUnit(
        assignment.inventoryUnitId,
        donated
          ? { declaredLost: true, disposalInProgress: false, status: 'DISPOSED' }
          : { declaredLost: true, disposalInProgress: true },
        { tx }
      );

      await loanRepository.registerLoss(
        assignment.id,
        { lostById: adminId, lostReason: reason },
        { tx }
      );

      await loanRepository.createMovement(
        {
          type: 'DISPOSAL',
          itemId: assignment.requestItem.itemId,
          inventoryUnitId: assignment.inventoryUnitId,
          quantity: 1,
          responsibleId: adminId,
          requestId: assignment.requestItem.requestId,
          notes: reason,
        },
        { tx }
      );

      await recalculateRequestStatus(assignment.requestItem.requestId, { tx });

      const updated = await tx.requestItemUnit.findUnique({
        where: { id: assignment.id },
        include: {
          lostBy: { select: { id: true, fullName: true } },
          requestItem: {
            include: {
              request: { include: { requester: { select: { id: true, fullName: true } } } },
            },
          },
        },
      });

      return {
        lost: {
          serialNumber,
          lostAt: updated.lostAt,
          lostBy: updated.lostBy,
          reason: updated.lostReason,
          requester: updated.requestItem.request.requester,
          ownershipPath: donated ? 'DONATED_IMMEDIATE' : 'SENA_PROCESS',
        },
      };
    });
  },

  async listReturns(filters, pagination) {
    // RN-MOV-02: el filtro por tipo de movimiento deja solo las devoluciones (RETURN).
    if (filters.movementType && filters.movementType !== 'RETURN') {
      return { data: [], meta: { page: pagination.page, limit: pagination.limit, total: 0, totalPages: 0 } };
    }
    const result = await loanRepository.findReturns(filters, pagination);
    return { data: result.data.map(mapReturn), meta: result.meta };
  },

  /**
   * AC-PRE-02-10: unidades por devolver de una solicitud. Un consumible no tiene unidad
   * física ni condición de retorno, así que no aparece.
   */
  async listPending(requestId) {
    const items = await loanRepository.findPendingByRequest(requestId);
    const units = [];
    for (const item of items) {
      for (const assignment of item.assignedUnits) {
        units.push({
          requestItemId: item.id,
          serialNumber: assignment.inventoryUnit.serialNumber,
          item: { id: item.item.id, code: item.item.code, name: item.item.name },
          loanedAt: assignment.loanedAt,
        });
      }
    }
    return { data: units };
  },
};
