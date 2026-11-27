import { prisma } from '../config/database.js';
import { loanRepository } from '../repositories/loan.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * RN-PRE-12 — mapeo de la condición de retorno al estado físico de la unidad.
 * RN-PRE-11: el estado se actualiza en la misma operación de devolución.
 * Solo se asignan los estados que el mapeo distingue: OPERATIVO y CON_FALLA (en el modelo
 * actual GOOD y REGULAR). Los estados severos (agotado, averiado, mantenimiento, baja) no
 * se asignan solos; el administrador los corrige a mano.
 */
const mapConditionToPhysicalState = (functioning) =>
  functioning === 'FUNCIONA' ? 'GOOD' : 'REGULAR';

const needsDamageTask = ({ functioning, damageState }) =>
  functioning !== 'FUNCIONA' || damageState === 'DANADO';

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

      if (assignments.length !== serials.length) {
        throw new AppError(
          'Una o más unidades no existen',
          HTTP_STATUS.NOT_FOUND,
          'UNITS_NOT_FOUND'
        );
      }

      const bySerial = new Map(
        assignments.map((assignment) => [assignment.inventoryUnit.serialNumber, assignment])
      );

      for (const entry of returns) {
        const assignment = bySerial.get(entry.serialNumber);

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
        const assignment = bySerial.get(entry.serialNumber);
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

  async listReturns(filters, pagination) {
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
