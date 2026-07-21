import { prisma } from '../config/database.js';
import { requestRepository } from '../repositories/request.repository.js';
import { itemRepository } from '../repositories/item.repository.js';
import { environmentRepository } from '../repositories/environment.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const requestService = {
  async createRequest(requesterId, data) {
    const { environmentId, shift, estimatedDate, observations, items } = data;

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

    for (const { itemId, requestedQty } of items) {
      const item = await itemRepository.findById(itemId);
      if (!item) {
        throw new AppError(`Ítem no encontrado: ${itemId}`, HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
      }

      const available = await itemRepository.countAvailableUnits(itemId);
      if (available < requestedQty) {
        throw new AppError(
          `Stock insuficiente para ${item.name}. Disponible: ${available}, solicitado: ${requestedQty}`,
          HTTP_STATUS.CONFLICT,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    const code = await generateRequestCode();

    const request = await requestRepository.create({
      code,
      requesterId,
      environmentId,
      shift,
      estimatedDate: estimatedDate ? new Date(estimatedDate) : undefined,
      observations,
      status: 'PENDING',
      requestItems: {
        create: items.map(({ itemId, requestedQty }) => ({
          itemId,
          requestedQty,
        })),
      },
    });

    return { request };
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

      await Promise.all(
        requestItems.map(async (requestItem) => {
          const needed = requestItem.approvedQty ?? requestItem.requestedQty;
          const components = await itemRepository.findComponents(requestItem.itemId);

          if (components.length > 0) {
            const parentUnits = await tx.inventoryUnit.findMany({
              where: { itemId: requestItem.itemId, status: 'AVAILABLE' },
              take: needed,
              include: {
                childUnits: {
                  where: { status: 'AVAILABLE' },
                },
              },
              orderBy: { id: 'asc' },
            });

            if (parentUnits.length < needed) {
              throw new AppError(
                `Stock insuficiente de unidades padre para el ítem ${requestItem.itemId}`,
                HTTP_STATUS.CONFLICT,
                'INSUFFICIENT_STOCK'
              );
            }

            await Promise.all(
              parentUnits.map(async (parentUnit) => {
                await requestRepository.updateInventoryUnit(parentUnit.id, { status: 'RESERVED' }, { tx });
                await requestRepository.createRequestItemUnit(
                  { requestItemId: requestItem.id, inventoryUnitId: parentUnit.id },
                  { tx }
                );

                await Promise.all(
                  parentUnit.childUnits.map(async (childUnit) => {
                    await requestRepository.updateInventoryUnit(childUnit.id, { status: 'RESERVED' }, { tx });
                    await requestRepository.createRequestItemUnit(
                      { requestItemId: requestItem.id, inventoryUnitId: childUnit.id },
                      { tx }
                    );
                  })
                );
              })
            );
          } else {
            const availableUnits = await requestRepository.findAvailableUnitsByItemId(
              requestItem.itemId,
              needed,
              { tx }
            );

            if (availableUnits.length < needed) {
              throw new AppError(
                `Stock insuficiente para empacar el ítem ${requestItem.itemId}`,
                HTTP_STATUS.CONFLICT,
                'INSUFFICIENT_STOCK'
              );
            }

            await Promise.all(
              availableUnits.map(async (unit) => {
                await requestRepository.updateInventoryUnit(unit.id, { status: 'RESERVED' }, { tx });
                await requestRepository.createRequestItemUnit(
                  { requestItemId: requestItem.id, inventoryUnitId: unit.id },
                  { tx }
                );
              })
            );
          }
        })
      );

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
          await requestRepository.updateRequestItem(requestItem.id, { deliveredQty }, { tx });

          await Promise.all(
            requestItem.assignedUnits.map(async (assignment) => {
              const unit = assignment.inventoryUnit;
              await requestRepository.updateInventoryUnit(unit.id, { status: 'LOANED' }, { tx });
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
          const physicalState = requestItem.physicalStateApproved || 'GOOD';

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

      if (request.status === 'PACKED') {
        const requestItems = await requestRepository.findRequestItemsByRequestId(id, { tx });
        const assignedUnits = requestItems.flatMap((item) => item.assignedUnits);

        const unitIdsToUpdate = assignedUnits.map((unit) => unit.inventoryUnitId);

        if (unitIdsToUpdate.length > 0) {
          await tx.inventoryUnit.updateMany({
            where: { id: { in: unitIdsToUpdate } },
            data: { status: 'AVAILABLE' },
          });
        }

        const requestItemIds = requestItems.map((item) => item.id);
        if (requestItemIds.length > 0) {
          await tx.requestItemUnit.deleteMany({
            where: { requestItemId: { in: requestItemIds } },
          });
        }
      }

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

async function generateRequestCode() {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SOL-${yyyymmdd}-`;
  const count = await requestRepository.countByCodePrefix(prefix);
  const next = count + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
