import { prisma } from '../config/database.js';
import { requestRepository } from '../repositories/request.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
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

  /**
   * RN-SOL-05: el instructor modifica su solicitud mientras sigue PENDING. Es un cambio de
   * reserva: se libera la anterior y se reserva la nueva, de forma atómica.
   */
  async modifyRequest(requesterId, id, data = {}) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }
      if (request.requesterId !== requesterId) {
        throw new AppError('No puede modificar esa solicitud', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN');
      }
      if (request.status !== 'PENDING') {
        throw new AppError(
          'Solo se pueden modificar solicitudes pendientes',
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      const newLines = data.items
        ? data.items
        : request.requestItems.map((item) => ({
            itemId: item.itemId,
            requestedQty: item.requestedQty,
          }));

      const uniqueItemIds = new Set(newLines.map((line) => line.itemId));
      if (uniqueItemIds.size !== newLines.length) {
        throw new AppError(
          'No puede repetir ítems en la solicitud',
          HTTP_STATUS.BAD_REQUEST,
          'DUPLICATED_ITEMS'
        );
      }

      const range = buildReservationRange({
        pickupDate: data.pickupDate ?? request.pickupDate,
        estimatedDate: data.estimatedDate ?? request.estimatedDate,
      });

      const itemsById = new Map();
      for (const line of newLines) {
        const item = await itemRepository.findById(line.itemId);
        if (!item) {
          throw new AppError(`Ítem no encontrado: ${line.itemId}`, HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
        }
        if (!item.isActive) {
          throw new AppError(
            `Ítem no disponible: ${item.name}`,
            HTTP_STATUS.CONFLICT,
            'ITEM_NOT_AVAILABLE'
          );
        }
        itemsById.set(line.itemId, item);

        const available = item.isConsumable
          ? item.stock ?? 0
          : await countAvailableUnitsForRange(line.itemId, range, tx, {
              ignoreRequestId: id,
            });
        if (available < line.requestedQty) {
          throw new AppError(
            `Stock insuficiente para ${item.name}. Disponible: ${available}, solicitado: ${line.requestedQty}`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }
      }

      // Cambio de reserva atómico: se libera la anterior y se reserva la nueva.
      await releaseAssignedUnits(id, tx);
      await tx.requestItem.deleteMany({ where: { requestId: id } });

      const createdItems = [];
      for (const line of newLines) {
        const created = await tx.requestItem.create({
          data: { requestId: id, itemId: line.itemId, requestedQty: line.requestedQty },
        });
        createdItems.push(created);
      }

      await requestRepository.update(
        id,
        {
          pickupDate: range.pickupDate,
          estimatedDate: range.estimatedDate,
          observations: data.observations ?? request.observations,
        },
        { tx }
      );

      for (const requestItem of createdItems) {
        const item = itemsById.get(requestItem.itemId);
        if (item?.isConsumable) continue;
        await assignUnitsToRequestItem(
          requestItem.id,
          requestItem.itemId,
          requestItem.requestedQty,
          tx,
          { actorId: requesterId, requestId: id, range }
        );
      }

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  /**
   * RN-SOL-03/04/09: aprobar decide sobre el pedido. Puede reducir cantidades, nunca
   * aumentarlas sobre lo solicitado, y no puede aprobar más de lo disponible para el rango.
   * Si el total aprobado queda por debajo del solicitado, la nota es obligatoria.
   */
  async approveRequest(adminId, id, data = {}) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'PENDING') {
        throw new AppError(
          'Solo se pueden aprobar solicitudes pendientes',
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      const itemsById = new Map(request.requestItems.map((item) => [item.itemId, item]));
      const desired = new Map((data.items || []).map((item) => [item.itemId, item.approvedQty]));

      for (const itemId of desired.keys()) {
        if (!itemsById.has(itemId)) {
          throw new AppError(
            'La solicitud no contiene ese ítem',
            HTTP_STATUS.BAD_REQUEST,
            'ITEM_NOT_IN_REQUEST'
          );
        }
      }

      const approvedByItem = new Map();
      let totalRequested = 0;
      let totalApproved = 0;

      for (const requestItem of request.requestItems) {
        const approvedQty = desired.has(requestItem.itemId)
          ? desired.get(requestItem.itemId)
          : requestItem.requestedQty;

        if (approvedQty > requestItem.requestedQty) {
          throw new AppError(
            'No se puede aprobar más de lo solicitado',
            HTTP_STATUS.BAD_REQUEST,
            'APPROVED_QTY_EXCEEDS_REQUESTED'
          );
        }

        approvedByItem.set(requestItem.id, approvedQty);
        totalRequested += requestItem.requestedQty;
        totalApproved += approvedQty;
      }

      if (totalApproved < totalRequested && !(data.note && data.note.trim())) {
        throw new AppError(
          'La nota es obligatoria cuando se reduce la cantidad aprobada',
          HTTP_STATUS.BAD_REQUEST,
          'APPROVAL_NOTE_REQUIRED'
        );
      }

      // RN-SOL-09: techo del stock para el rango, descontando la propia reserva.
      const range = rangeFromRequest(request);
      for (const requestItem of request.requestItems) {
        const approvedQty = approvedByItem.get(requestItem.id);
        const item = await itemRepository.findById(requestItem.itemId);
        const available = item?.isConsumable
          ? item.stock ?? 0
          : await countAvailableUnitsForRange(requestItem.itemId, range, tx, {
              ignoreRequestId: request.id,
            });

        if (approvedQty > available) {
          throw new AppError(
            `Stock insuficiente para ${item?.name ?? 'el ítem'}. Disponible: ${available}, aprobado: ${approvedQty}`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }
      }

      await Promise.all(
        request.requestItems.map((requestItem) =>
          requestRepository.updateRequestItem(
            requestItem.id,
            { approvedQty: approvedByItem.get(requestItem.id) },
            { tx }
          )
        )
      );

      await requestRepository.update(
        id,
        {
          status: 'APPROVED',
          approvedById: adminId,
          approvedAt: new Date(),
          approvalNote: data.note?.trim() || null,
        },
        { tx }
      );

      // RN-NOT-01: aviso de aprobación (no es el aviso de "listo para retirar").
      await notificationRepository.create(
        {
          userId: request.requesterId,
          requestId: id,
          type: 'REQUEST_APPROVED',
          title: 'Solicitud aprobada',
          message: `Tu solicitud ${request.code} fue aprobada.`,
        },
        { tx }
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

  /**
   * RN-SOL-02 / RN-INV-02/24 / RN-NOT-01: empacar verifica, asigna los seriales concretos y
   * avisa al instructor que puede retirar. Un compuesto sin obligatorios no se empaca; un
   * opcional ausente se documenta. Los consumibles no se descuentan aquí.
   */
  async packRequest(adminId, id) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'APPROVED') {
        throw new AppError(
          'Solo se pueden empacar solicitudes aprobadas',
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      const range = rangeFromRequest(request);
      const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });
      const packingNotes = [];

      for (const requestItem of requestItems) {
        const item = await itemRepository.findById(requestItem.itemId);
        const needed = requestItem.approvedQty ?? requestItem.requestedQty;

        // RN-INV-11: el consumible se verifica pero no se descuenta al empacar.
        if (item?.isConsumable) {
          if ((item.stock ?? 0) < needed) {
            throw new AppError(
              `Stock insuficiente de ${item.name}`,
              HTTP_STATUS.CONFLICT,
              'INSUFFICIENT_STOCK'
            );
          }
          continue;
        }

        // RN-SOL-09: la cantidad debe seguir cabiendo en el rango (pudo cambiar el stock).
        const available = await countAvailableUnitsForRange(requestItem.itemId, range, tx, {
          ignoreRequestId: id,
        });
        if (available < needed) {
          throw new AppError(
            `Stock insuficiente para ${item?.name ?? 'el ítem'} al empacar`,
            HTTP_STATUS.CONFLICT,
            'INSUFFICIENT_STOCK'
          );
        }

        // Unidades ya asignadas a esta línea: para un compuesto es la unidad padre; para un
        // serializado simple es la unidad asignada (puede ser una pieza suelta del conjunto).
        const assignedForItem = requestItem.assignedUnits.filter(
          (assignment) =>
            assignment.inventoryUnit?.itemId === requestItem.itemId && !assignment.releasedAt
        );
        const missing = needed - assignedForItem.length;
        if (missing > 0) {
          await assignUnitsToRequestItem(requestItem.id, requestItem.itemId, missing, tx, {
            actorId: adminId,
            requestId: id,
            range,
          });
        }

        // RN-INV-02/24: comprobar la completitud funcional del compuesto asignado.
        const components = await itemRepository.findComponents(requestItem.itemId);
        if (components.length > 0) {
          const parents = await tx.inventoryUnit.findMany({
            where: {
              id: {
                in: requestItem.assignedUnits
                  .map((assignment) => assignment.inventoryUnitId)
                  .filter(Boolean),
              },
              itemId: requestItem.itemId,
              parentUnitId: null,
            },
            include: {
              childUnits: {
                where: { status: { in: ['AVAILABLE', 'RESERVED'] }, declaredLost: false },
                select: { id: true, itemId: true },
              },
            },
          });

          const presentByItem = new Map();
          for (const parent of parents) {
            const counts = new Map();
            for (const child of parent.childUnits) {
              counts.set(child.itemId, (counts.get(child.itemId) || 0) + 1);
            }
            presentByItem.set(parent.id, counts);
          }

          for (const parent of parents) {
            const counts = presentByItem.get(parent.id) || new Map();
            for (const component of components) {
              const presentQty = counts.get(component.childItemId) || 0;
              if (presentQty >= (component.quantity ?? 1)) continue;
              if (component.isRequired) {
                throw new AppError(
                  `El conjunto ${parent.id} no tiene el componente obligatorio ${component.childItem?.name ?? component.childItemId}`,
                  HTTP_STATUS.CONFLICT,
                  'INCOMPLETE_ASSEMBLY'
                );
              }
              packingNotes.push(
                `Falta componente opcional: ${component.childItem?.name ?? component.childItemId}`
              );
            }
          }
        }
      }

      await requestRepository.update(
        id,
        {
          status: 'PACKED',
          packedById: adminId,
          packedAt: new Date(),
          ...(packingNotes.length > 0
            ? { packingNotes: [...new Set(packingNotes)].join('; ') }
            : {}),
        },
        { tx }
      );

      // RN-NOT-01 / AC-SOL-05-6: exactamente un aviso de "listo para retirar".
      await notificationRepository.create(
        {
          userId: request.requesterId,
          requestId: id,
          type: 'PICKUP_READY',
          title: 'Listo para retirar',
          message: `Tu solicitud ${request.code} está empacada y puedes retirarla.`,
        },
        { tx }
      );

      return { request: await requestRepository.findById(id, { tx }) };
    });
  },

  /**
   * RN-SOL-11 / US-SOL-06: registrar la entrega, total o parcial. Solo desde PACKED o
   * PARTIALLY_DELIVERED; cada unidad entregada queda con tenedor y fecha (RN-PRE-02) y los
   * consumibles se descuentan en este momento (RN-INV-11).
   */
  async deliverRequest(adminId, id, data = {}) {
    return prisma.$transaction(async (tx) => {
      const request = await requestRepository.findById(id, { tx });
      if (!request) {
        throw new AppError('Solicitud no encontrada', HTTP_STATUS.NOT_FOUND, 'REQUEST_NOT_FOUND');
      }

      if (request.status !== 'PACKED' && request.status !== 'PARTIALLY_DELIVERED') {
        throw new AppError(
          'Solo se pueden entregar solicitudes empacadas o parcialmente entregadas',
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });
      const desired = new Map(
        (data.items || []).map((line) => [line.itemId, line.deliveredQty])
      );

      for (const itemId of desired.keys()) {
        if (!requestItems.some((requestItem) => requestItem.itemId === itemId)) {
          throw new AppError(
            'La solicitud no contiene ese ítem',
            HTTP_STATUS.BAD_REQUEST,
            'ITEM_NOT_IN_REQUEST'
          );
        }
      }

      const deliveredAt = new Date();

      for (const requestItem of requestItems) {
        const approvedQty = requestItem.approvedQty ?? requestItem.requestedQty;
        const currentDelivered = requestItem.deliveredQty ?? 0;
        const target = desired.has(requestItem.itemId)
          ? desired.get(requestItem.itemId)
          : approvedQty;

        if (target < currentDelivered || target > approvedQty) {
          throw new AppError(
            'La cantidad entregada no puede superar la aprobada ni retroceder',
            HTTP_STATUS.BAD_REQUEST,
            'INVALID_DELIVERED_QTY'
          );
        }

        const delta = target - currentDelivered;
        if (delta === 0) continue;

        const item = await itemRepository.findById(requestItem.itemId);

        if (item?.isConsumable) {
          if ((item.stock ?? 0) < delta) {
            throw new AppError(
              `Stock insuficiente de ${item.name}`,
              HTTP_STATUS.CONFLICT,
              'INSUFFICIENT_STOCK'
            );
          }
          await tx.item.update({
            where: { id: item.id },
            data: { stock: { decrement: delta } },
          });
          await requestRepository.createMovement(
            {
              type: 'LOAN',
              itemId: item.id,
              quantity: delta,
              responsibleId: adminId,
              requestId: id,
              notes: 'Entrega de consumible',
            },
            { tx }
          );
          await requestRepository.updateRequestItem(
            requestItem.id,
            { deliveredQty: target },
            { tx }
          );
          continue;
        }

        const pendingAssignments = requestItem.assignedUnits
          .filter((assignment) => !assignment.loanedAt && !assignment.lostAt && !assignment.releasedAt)
          .slice(0, delta);

        if (pendingAssignments.length < delta) {
          throw new AppError(
            'No hay unidades asignadas pendientes para entregar',
            HTTP_STATUS.CONFLICT,
            'NOT_ENOUGH_ASSIGNED_UNITS'
          );
        }

        for (const assignment of pendingAssignments) {
          const unit = assignment.inventoryUnit;
          // RN-CTX-08 / AC-INV-11-5: al prestarse, la unidad queda ubicada en el ambiente
          // de destino de la solicitud.
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
            data: { loanedAt: deliveredAt },
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
        }

        await requestRepository.updateRequestItem(
          requestItem.id,
          { deliveredQty: target },
          { tx }
        );
      }

      const refreshedItems = await requestRepository.findRequestItemsByRequestId(id, { tx });
      const allDelivered = refreshedItems.every(
        (requestItem) =>
          (requestItem.deliveredQty ?? 0) >= (requestItem.approvedQty ?? requestItem.requestedQty)
      );

      await requestRepository.update(
        id,
        {
          status: allDelivered ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
          deliveredById: adminId,
          deliveredAt,
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

  /**
   * RN-SOL-05/06: el instructor cancela solo su solicitud PENDING; el administrador
   * cancela mientras no se haya registrado la entrega (PENDING/APPROVED/PACKED).
   * La cancelación libera la reserva y conserva la traza de las unidades asignadas.
   */
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

      if (user.role !== 'ADMIN') {
        if (request.requesterId !== userId) {
          throw new AppError(
            'No tiene permisos para cancelar esta solicitud',
            HTTP_STATUS.FORBIDDEN,
            'FORBIDDEN'
          );
        }
        if (request.status !== 'PENDING') {
          throw new AppError(
            'El instructor solo puede cancelar solicitudes pendientes',
            HTTP_STATUS.FORBIDDEN,
            'FORBIDDEN'
          );
        }
      } else if (!['PENDING', 'APPROVED', 'PACKED'].includes(request.status)) {
        throw new AppError(
          `No se puede cancelar una solicitud con estado '${request.status}'`,
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      // La entrega es el límite: una solicitud entregada o parcialmente entregada no se cancela.
      if (['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED'].includes(request.status)) {
        throw new AppError(
          `No se puede cancelar una solicitud con estado '${request.status}'`,
          HTTP_STATUS.CONFLICT,
          'INVALID_STATUS'
        );
      }

      await releaseAssignedUnits(id, tx);

      await requestRepository.update(
        id,
        { status: 'CANCELLED', cancellationCause: 'MANUAL' },
        { tx }
      );

      return { request: await requestRepository.findById(id, { tx }) };
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
/**
 * Libera las asignaciones de una solicitud conservando la traza (RN-SOL-08 / RN-PRE-02):
 * las filas se marcan `releasedAt` y NO se borran, para que la consulta de la solicitud
 * cancelada siga informando qué seriales estuvieron asignados. Una unidad vuelve a
 * AVAILABLE solo si no le quedan otras reservas activas.
 */
async function releaseAssignedUnits(requestId, tx) {
  const requestItems = await requestRepository.findRequestItemsByRequestId(requestId, { tx });
  const assignedUnits = requestItems.flatMap((item) => item.assignedUnits);
  const active = assignedUnits.filter((assignment) => !assignment.releasedAt);

  if (active.length === 0) return;

  const unitIds = active.map((assignment) => assignment.inventoryUnitId);
  await tx.requestItemUnit.updateMany({
    where: { id: { in: active.map((assignment) => assignment.id) } },
    data: { releasedAt: new Date() },
  });

  const remaining = await tx.requestItemUnit.findMany({
    where: {
      inventoryUnitId: { in: unitIds },
      returnedAt: null,
      lostAt: null,
      releasedAt: null,
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

function unitHasOverlappingReservation(unit, range, ignoreRequestId = null) {
  return (unit.requestItemUnits || []).some((assignment) => {
    if (assignment.releasedAt) return false;
    const request = assignment.requestItem?.request;
    if (!request) return false;
    if (ignoreRequestId && request.id === ignoreRequestId) return false;
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
function unitIsFreeForRange(unit, range, { ignoreRequestId = null } = {}) {
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

  return !unitHasOverlappingReservation(unit, range, ignoreRequestId);
}

async function countAvailableUnitsForRange(itemId, range, tx, { ignoreRequestId = null } = {}) {
  const units = await requestRepository.findUnitsForRange(itemId, { tx });
  return units.filter((unit) => unitIsFreeForRange(unit, range, { ignoreRequestId })).length;
}
