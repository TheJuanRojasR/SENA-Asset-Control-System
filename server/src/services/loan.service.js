import { prisma } from '../config/database.js';
import { loanRepository } from '../repositories/loan.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const loanService = {
  async listLoans(user, filters = {}, pagination = {}) {
    const isAdmin = user.role === 'ADMIN';
    const requesterId = isAdmin ? undefined : user.userId;

    return loanRepository.findMany({ ...filters, requesterId }, pagination);
  },

  async returnUnits(adminId, unitIds, physicalStateReturned = 'GOOD') {
    if (!Array.isArray(unitIds) || unitIds.length === 0) {
      throw new AppError('Debe indicar al menos una unidad', HTTP_STATUS.BAD_REQUEST, 'EMPTY_UNITS');
    }

    return prisma.$transaction(async (tx) => {
      const assignments = await loanRepository.findByIds(unitIds, { tx });

      if (assignments.length !== unitIds.length) {
        throw new AppError('Una o más unidades no existen', HTTP_STATUS.NOT_FOUND, 'UNITS_NOT_FOUND');
      }

      const affectedRequestItemIds = new Set();
      const affectedRequestIds = new Set();

      for (const assignment of assignments) {
        if (assignment.returnedAt) {
          throw new AppError(
            `La unidad ${assignment.inventoryUnit.serialNumber} ya fue devuelta`,
            HTTP_STATUS.CONFLICT,
            'UNIT_ALREADY_RETURNED'
          );
        }

        if (assignment.inventoryUnit.status !== 'LOANED') {
          throw new AppError(
            `La unidad ${assignment.inventoryUnit.serialNumber} no está en préstamo`,
            HTTP_STATUS.CONFLICT,
            'UNIT_NOT_LOANED'
          );
        }

        affectedRequestItemIds.add(assignment.requestItemId);
        affectedRequestIds.add(assignment.requestItem.requestId);

        await loanRepository.updateInventoryUnit(
          assignment.inventoryUnitId,
          {
            status: 'AVAILABLE',
            physicalState: physicalStateReturned,
          },
          { tx }
        );

        await loanRepository.returnUnit(
          assignment.id,
          { returnedById: adminId, physicalStateReturned },
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
      }

      for (const requestItemId of affectedRequestItemIds) {
        const returnedCount = await loanRepository.countReturnedByRequestItem(requestItemId, { tx });
        await loanRepository.updateRequestItemReturnedQty(requestItemId, returnedCount, { tx });
      }

      for (const requestId of affectedRequestIds) {
        await recalculateRequestStatus(requestId, { tx });
      }

      return { returnedCount: assignments.length };
    });
  },
};

async function recalculateRequestStatus(requestId, { tx } = {}) {
  const requestItems = await tx.requestItem.findMany({
    where: { requestId },
    include: {
      assignedUnits: {
        select: {
          id: true,
          returnedAt: true,
        },
      },
    },
  });

  let totalAssigned = 0;
  let totalReturned = 0;

  for (const item of requestItems) {
    totalAssigned += item.assignedUnits.length;
    totalReturned += item.assignedUnits.filter((u) => u.returnedAt).length;
  }

  if (totalAssigned === 0) return;

  let newStatus;
  let extraData = {};

  if (totalReturned === totalAssigned) {
    newStatus = 'COMPLETED';
    extraData = { completedAt: new Date() };
  } else if (totalReturned > 0) {
    newStatus = 'PARTIALLY_RETURNED';
  } else {
    newStatus = 'DELIVERED';
  }

  await tx.request.update({
    where: { id: requestId },
    data: { status: newStatus, ...extraData },
  });
}
