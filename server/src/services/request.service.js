import { prisma } from '../config/database.js';
import { requestRepository } from '../repositories/request.repository.js';
import { itemRepository } from '../repositories/item.repository.js';
import { environmentRepository } from '../repositories/environment.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const requestService = {
  async createRequest(requesterId, data) {
    const { environmentId, shift, pickupDate, estimatedDate, observations, items } = data;

    if (!items || items.length === 0) {
      throw new AppError('Debe incluir al menos un ítem', HTTP_STATUS.BAD_REQUEST, 'EMPTY_ITEMS');
    }

    if (environmentId) {
      const environment = await environmentRepository.findById(environmentId);
      if (!environment) {
        throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
      }
    }

    const itemIds = items.map((i) => i.itemId);
    const uniqueItemIds = new Set(itemIds);
    if (uniqueItemIds.size !== itemIds.length) {
      throw new AppError('No puede repetir ítems en la solicitud', HTTP_STATUS.BAD_REQUEST, 'DUPLICATED_ITEMS');
    }

    const range = buildReservationRange({ pickupDate, estimatedDate });

    return prisma.$transaction(async (tx) => {
      const itemById = new Map();
      // Validación y reserva atómicas: evita overbooking entre solicitudes simultáneas.
      for (const { itemId, requestedQty } of items) {
        const item = await itemRepository.findById(itemId);
        itemById.set(itemId, item);
        if (!item) {
          throw new AppError(`Ítem no encontrado: ${itemId}`, HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
        }

        // AC-ITE-06-1 / RN-INV-45: un elemento dado de baja deja de ofrecerse para
        // solicitudes nuevas, aunque conserve unidades físicas en inventario.
        if (!item.isActive) {
          throw new AppError(
            `Ítem no disponible: ${item.name}`,
            HTTP_STATUS.CONFLICT,
            'ITEM_NOT_AVAILABLE'
          );
        }

        // RN-INV-11: el consumible se controla por cantidad, no por unidades físicas.
        const available = item.isConsumable
          ? item.stock ?? 0
          : await countAvailableUnitsForRange(itemId, range, tx);
        if (available < requestedQty) {
          throw new AppError(
            `Stock insuficiente para ${item.name}. Disponible: ${available}, solicitado: ${requestedQty}`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }
      }

      const code = await generateRequestCode({ tx });

      const request = await requestRepository.create(
        {
          code,
          requesterId,
          environmentId,
          shift,
          pickupDate: range.pickupDate,
          estimatedDate: range.estimatedDate,
          observations,
          status: 'PENDING',
          requestItems: {
            create: items.map(({ itemId, requestedQty }) => ({
              itemId,
              requestedQty,
            })),
          },
        },
        { tx }
      );

      // Reserva inmediata: las unidades quedan apartadas desde la creación. Un consumible
      // no se reserva por fecha (RN-INV-11): solo se reservan unidades serializadas.
      for (const requestItem of request.requestItems) {
        const item = itemById.get(requestItem.itemId);
        if (item?.isConsumable) continue;
        await assignUnitsToRequestItem(
          requestItem.id,
          requestItem.itemId,
          requestItem.requestedQty,
          tx,
          { actorId: requesterId, requestId: request.id, range }
        );
      }

      return { request: await requestRepository.findById(request.id, { tx }) };
    });
  },

  async listRequests(user, filters, pagination) {
    const isAdmin = user.role === 'ADMIN';
    const requesterId = isAdmin ? undefined : user.userId;

    const [requests, total] = await Promise.all([
      requestRepository.findMany({ filters, requesterId }, pagination),
      requestRepository.count({ filters, requesterId }),
    ]);

    return {
      data: requests,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },

  async getRequestById(user, id) {
    const request = await requestRepository.findById(id);
    if (!request) {
      throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
    }

    if (user.role !== 'ADMIN' && request.requesterId !== user.userId) {
      throw new AppError('No tiene permisos para ver esta solicitud', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
    }

    return { request };
  },

  async approveRequest(adminId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'PENDING') {
        throw new AppError('Solo se pueden aprobar solicitudes pendientes', HTTP_STATUS.CONFLICT, 'INVALID_STATUS');
      }

      await requestRepository.update(
        id,
        {
          status: 'APPROVED',
          approvedById: adminId,
          approvedAt: new Date(),
        },
        { tx }
      );

      await Promise.all(
        request.requestItems.map((requestItem) =>
          requestRepository.updateRequestItem(
            requestItem.id,
            {
              approvedQty: requestItem.requestedQty,
            },
            { tx }
          )
        )
      );

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  async rejectRequest(adminId, id, rejectionReason) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'PENDING') {
        throw new AppError('Solo se pueden rechazar solicitudes pendientes', HTTP_STATUS.CONFLICT, 'INVALID_STATUS');
      }

      // Liberar las unidades reservadas al crear la solicitud.
      await releaseAssignedUnits(id, tx);

      const updated = await requestRepository.update(
        id,
        {
          status: 'REJECTED',
          rejectionReason,
          rejectedById: adminId,
          rejectedAt: new Date(),
        },
        { tx }
      );

      return { request: updated };
    });
  },

  async packRequest(adminId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'APPROVED') {
        throw new AppError('Solo se pueden empacar solicitudes aprobadas', HTTP_STATUS.CONFLICT, 'INVALID_STATUS');
      }

      const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });

      // Las unidades se reservaron al crear la solicitud. Si falta alguna
      // (solicitudes anteriores a la reserva inmediata), se asigna aquí como respaldo.
      for (const requestItem of requestItems) {
        const item = await itemRepository.findById(requestItem.itemId);
        // RN-INV-11: el consumible no tiene unidades que asignar y su stock no cambia al
        // empacar, pero la cantidad se verifica también aquí (puede haber cambiado desde
        // que se creó la solicitud) y vuelve a verificarse al entregar.
        if (item?.isConsumable) {
          const neededQty = requestItem.approvedQty ?? requestItem.requestedQty;
          if ((item.stock ?? 0) < neededQty) {
            throw new AppError(
              `Stock insuficiente de ${item.name}`,
              HTTP_STATUS.CONFLICT,
              'INSUFFICIENT_STOCK'
            );
          }
          continue;
        }

        const needed = requestItem.approvedQty ?? requestItem.requestedQty;
        const assigned = countAssignedParentUnits(requestItem);
        const missing = needed - assigned;

        if (missing > 0) {
          await assignUnitsToRequestItem(requestItem.id, requestItem.itemId, missing, tx, {
            actorId: adminId,
            requestId: id,
            range: rangeFromRequest(request),
          });
        }
      }

      await requestRepository.update(
        id,
        {
          status: 'PACKED',
          packedById: adminId,
          packedAt: new Date(),
        },
        { tx }
      );

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  async deliverRequest(adminId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'PACKED') {
        throw new AppError('Solo se pueden entregar solicitudes empacadas', HTTP_STATUS.CONFLICT, 'INVALID_STATUS');
      }

      const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });

      await Promise.all(
        requestItems.map(async (requestItem) => {
          const deliveredQty = requestItem.approvedQty ?? requestItem.requestedQty;
          const item = await itemRepository.findById(requestItem.itemId);

          if (item?.isConsumable) {
            // RN-INV-11: el consumible se descuenta del stock al entregar, sin unidad.
            if ((item.stock ?? 0) < deliveredQty) {
              throw new AppError(
                `Stock insuficiente de ${item.name}`,
                HTTP_STATUS.CONFLICT,
                'INSUFFICIENT_STOCK'
              );
            }
            await tx.item.update({
              where: { id: item.id },
              data: { stock: { decrement: deliveredQty } },
            });
            await requestRepository.createMovement(
              {
                type: 'LOAN',
                itemId: item.id,
                quantity: deliveredQty,
                responsibleId: adminId,
                requestId: id,
                notes: 'Entrega de consumible',
              },
              { tx }
            );
            await requestRepository.updateRequestItem(requestItem.id, { deliveredQty }, { tx });
            return;
          }

          await requestRepository.updateRequestItem(requestItem.id, { deliveredQty }, { tx });

          await Promise.all(
            requestItem.assignedUnits.map(async (assignment) => {
              const unit = assignment.inventoryUnit;
              // RN-CTX-08 / AC-INV-11-5: al prestarse, la unidad queda ubicada en el
              // ambiente de destino de la solicitud.
              await requestRepository.updateInventoryUnit(
                unit.id,
                {
                  status: 'LOANED',
                  ...(request.environmentId ? { environmentId: request.environmentId } : {}),
                },
                { tx }
              );
              await tx.requestItemUnit.update({
                where: { id: assignment.id },
                data: { loanedAt: new Date() },
              });
              await requestRepository.createMovement(
                {
                  type: 'LOAN',
                  itemId: requestItem.itemId,
                  inventoryUnitId: unit.id,
                  quantity: 1,
                  responsibleId: adminId,
                  requestId: id,
                },
                { tx }
              );
            })
          );
        })
      );

      await requestRepository.update(
        id,
        {
          status: 'DELIVERED',
          deliveredById: adminId,
          deliveredAt: new Date(),
        },
        { tx }
      );

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  async completeRequest(adminId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (!['DELIVERED', 'PARTIALLY_RETURNED'].includes(request.status)) {
        throw new AppError(
          'Solo se pueden completar solicitudes entregadas o parcialmente devueltas',
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });

      await Promise.all(
        requestItems.map(async (requestItem) => {
          const physicalState = requestItem.physicalStateApproved || 'OPERATIVO';

          await Promise.all(
            requestItem.assignedUnits.map(async (assignment) => {
              const unit = assignment.inventoryUnit;
              await requestRepository.updateInventoryUnit(
                unit.id,
                {
                  status: 'AVAILABLE',
                  physicalState,
                },
                { tx }
              );
              await tx.requestItemUnit.update({
                where: { id: assignment.id },
                data: {
                  returnedAt: new Date(),
                  physicalStateReturned: physicalState,
                  returnedById: adminId,
                },
              });
              await requestRepository.createMovement(
                {
                  type: 'RETURN',
                  itemId: requestItem.itemId,
                  inventoryUnitId: unit.id,
                  quantity: 1,
                  responsibleId: adminId,
                  requestId: id,
                },
                { tx }
              );
            })
          );

          const returnedQty = requestItem.deliveredQty;
          await requestRepository.updateRequestItem(requestItem.id, { returnedQty }, { tx });
        })
      );

      await requestRepository.update(
        id,
        {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
        { tx }
      );

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  async cancelRequest(userId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
      }

      if (user.role !== 'ADMIN' && request.requesterId !== userId) {
        throw new AppError('No tiene permisos para cancelar esta solicitud', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
      }

      if (!['PENDING', 'APPROVED', 'PACKED'].includes(request.status)) {
        throw new AppError(
          `No se puede cancelar una solicitud con estado '${request.status}'`,
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      // Liberar unidades reservadas en cualquier estado cancelable.
      await releaseAssignedUnits(id, tx);

      const updated = await requestRepository.update(
        id,
        {
          status: 'CANCELLED',
        },
        { tx }
      );

      return { request: updated };
    });
  },
};

/**
 * Reserva unidades de inventario para un ítem de solicitud.
 * Ítems compuestos: reserva unidades padre junto con sus hijos disponibles
 * (aunque el ensamblaje esté incompleto; la UI muestra el faltante).
 * Ítems simples: reserva unidades directas.
 */
/**
 * RN-SOL-01 / RN-NEG-01/02: reserva unidades disponibles para el rango de la solicitud.
 * Una unidad reservada para un rango que NO se solapa cuenta como disponible y se le agrega
 * la nueva reserva; una prestada (LOANED) no está disponible para ningún rango.
 */
async function assignUnitsToRequestItem(
  requestItemId,
  itemId,
  qty,
  tx,
  { actorId, requestId, range } = {}
) {
  if (qty <= 0) return;

  const components = await itemRepository.findComponents(itemId);

  if (components.length > 0) {
    const candidates = await requestRepository.findUnitsForRange(itemId, { tx });
    const freeParents = candidates.filter((unit) => unitIsFreeForRange(unit, range)).slice(0, qty);

    if (freeParents.length < qty) {
      throw new AppError(
        `Stock insuficiente de unidades para el ítem ${itemId}`,
        HTTP_STATUS.CONFLICT,
        'INSUFFICIENT_STOCK'
      );
    }

    for (const parentUnit of freeParents) {
      await reserveUnit(parentUnit, requestItemId, {
        tx,
        actorId,
        requestId,
        itemId,
      });

      for (const child of parentUnit.childUnits || []) {
        await requestRepository.updateInventoryUnit(child.id, { status: 'RESERVED' }, { tx });
        await requestRepository.createRequestItemUnit(
          { requestItemId, inventoryUnitId: child.id },
          { tx }
        );
        await createReservationMovement(
          { itemId, unit: child, actorId, requestId },
          tx
        );
      }
    }

    return;
  }

  const candidates = await requestRepository.findUnitsForRange(itemId, { tx });
  const freeUnits = candidates.filter((unit) => unitIsFreeForRange(unit, range)).slice(0, qty);

  if (freeUnits.length < qty) {
    throw new AppError(
      `Stock insuficiente para el ítem ${itemId}`,
      HTTP_STATUS.CONFLICT,
      'INSUFFICIENT_STOCK'
    );
  }

  for (const unit of freeUnits) {
    await reserveUnit(unit, requestItemId, { tx, actorId, requestId, itemId });
  }
}

async function reserveUnit(unit, requestItemId, { tx, actorId, requestId, itemId }) {
  if (unit.status === 'AVAILABLE') {
    await requestRepository.updateInventoryUnit(unit.id, { status: 'RESERVED' }, { tx });
  }
  await requestRepository.createRequestItemUnit(
    { requestItemId, inventoryUnitId: unit.id },
    { tx }
  );
  await createReservationMovement({ itemId, unit, actorId, requestId }, tx);
}

/**
 * Libera las asignaciones de una solicitud. Una unidad vuelve a AVAILABLE solo si no le
 * quedan otras reservas activas (RN-NEG-01: puede estar reservada en otro rango).
 */
async function releaseAssignedUnits(requestId, tx) {
  const requestItems = await requestRepository.findRequestItemsByRequestId(requestId, { tx });
  const assignedUnits = requestItems.flatMap((item) => item.assignedUnits);

  if (assignedUnits.length === 0) return;

  const unitIds = assignedUnits.map((assignment) => assignment.inventoryUnitId);

  await tx.requestItemUnit.deleteMany({
    where: { id: { in: assignedUnits.map((assignment) => assignment.id) } },
  });

  const remaining = await tx.requestItemUnit.findMany({
    where: {
      inventoryUnitId: { in: unitIds },
      returnedAt: null,
      lostAt: null,
    },
    select: { inventoryUnitId: true },
  });
  const stillReserved = new Set(remaining.map((row) => row.inventoryUnitId));

  for (const unitId of unitIds) {
    if (stillReserved.has(unitId)) continue;
    const unit = await tx.inventoryUnit.findUnique({ where: { id: unitId } });
    if (unit && unit.status === 'RESERVED') {
      await tx.inventoryUnit.update({ where: { id: unitId }, data: { status: 'AVAILABLE' } });
    }
  }
}

/**
 * Cuenta las unidades padre asignadas a un ítem de solicitud.
 * En ítems compuestos los hijos también quedan asignados; solo las unidades
 * del propio ítem cuentan para la cantidad solicitada.
 */
function countAssignedParentUnits(requestItem) {
  return requestItem.assignedUnits.filter(
    (assignment) => assignment.inventoryUnit?.itemId === requestItem.itemId
  ).length;
}

async function generateRequestCode({ tx } = {}) {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SOL-${yyyymmdd}-`;
  const count = await requestRepository.countByCodePrefix(prefix, { tx });
  const next = count + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function createReservationMovement({ itemId, unit, actorId, requestId }, tx) {
  if (!requestId) return;
  await requestRepository.createMovement(
    {
      type: 'RESERVATION',
      itemId,
      inventoryUnitId: unit.id,
      quantity: 1,
      responsibleId: actorId ?? null,
      requestId,
    },
    { tx }
  );
}

const ACTIVE_RESERVATION_STATUSES = new Set(['PENDING', 'APPROVED', 'PACKED']);

const toUtcDay = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/**
 * RN-SOL-01: la fecha de retiro más temprana es hoy y por defecto es mañana; la fecha
 * estimada no puede ser anterior a la de retiro. El rango es de días de calendario.
 */
function buildReservationRange({ pickupDate, estimatedDate }) {
  const todayMs = toUtcDay(new Date());
  const defaultPickupMs = todayMs + 24 * 60 * 60 * 1000;
  const pickupMs = pickupDate ? toUtcDay(pickupDate) : defaultPickupMs;

  if (pickupMs < todayMs && pickupDate) {
    throw new AppError(
      'La fecha de retiro no puede ser anterior a hoy',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_PICKUP_DATE'
    );
  }

  const estimatedMs = estimatedDate ? toUtcDay(estimatedDate) : pickupMs;
  if (estimatedMs < pickupMs) {
    throw new AppError(
      'La fecha estimada de devolución no puede ser anterior a la de retiro',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_RETURN_DATE'
    );
  }

  return {
    pickupDate: new Date(pickupMs),
    estimatedDate: new Date(estimatedMs),
    startMs: pickupMs,
    endMs: estimatedMs,
  };
}

function rangeFromRequest(request) {
  const pickupMs = toUtcDay(request.pickupDate ?? request.requestDate);
  const estimatedMs = toUtcDay(request.estimatedDate ?? request.pickupDate ?? request.requestDate);
  return {
    pickupDate: new Date(pickupMs),
    estimatedDate: new Date(estimatedMs),
    startMs: pickupMs,
    endMs: estimatedMs,
  };
}

function unitHasOverlappingReservation(unit, range) {
  return (unit.requestItemUnits || []).some((assignment) => {
    const request = assignment.requestItem?.request;
    if (!request) return false;
    if (!ACTIVE_RESERVATION_STATUSES.has(request.status)) return false;
    const startMs = toUtcDay(request.pickupDate ?? request.requestDate);
    const endMs = toUtcDay(request.estimatedDate ?? request.pickupDate ?? request.requestDate);
    return startMs <= range.endMs && endMs >= range.startMs;
  });
}

/**
 * RN-INV-31: la unidad como unidad solo se presta OPERATIVA; una pieza se presta según el
 * estado del conjunto padre. RN-INV-33 bloquea unidades en trámite; RN-PRE-15 exceptúa las
 * piezas de un conjunto perdido.
 */
function unitIsFreeForRange(unit, range) {
  if (!range) return unit.status === 'AVAILABLE';
  if (unit.status !== 'AVAILABLE' && unit.status !== 'RESERVED') return false;
  if (unit.disposalInProgress || unit.declaredLost) return false;

  if (unit.parentUnitId) {
    const parent = unit.parentUnit;
    if (!parent) return false;
    if (!parent.declaredLost) {
      if (parent.disposalInProgress) return false;
      if (parent.status === 'LOANED') return false;
      if (!['OPERATIVO', 'CON_FALLA', 'AVERIADO'].includes(parent.physicalState)) return false;
    }
  } else if (unit.physicalState !== 'OPERATIVO') {
    return false;
  }

  return !unitHasOverlappingReservation(unit, range);
}

async function countAvailableUnitsForRange(itemId, range, tx) {
  const units = await requestRepository.findUnitsForRange(itemId, { tx });
  return units.filter((unit) => unitIsFreeForRange(unit, range)).length;
}
