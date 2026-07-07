import { inventoryRepository } from '../repositories/inventory.repository.js';
import { itemRepository } from '../repositories/item.repository.js';
import { environmentRepository } from '../repositories/environment.repository.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const inventoryService = {
  async createInventoryUnit(data) {
    const item = await itemRepository.findById(data.itemId);
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    if (data.environmentId) {
      const environment = await environmentRepository.findById(data.environmentId);
      if (!environment) {
        throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
      }
    }

    const serialNumber = data.serialNumber || (await generateNextSerial(item.code));

    const exists = await inventoryRepository.findBySerialNumber(serialNumber);
    if (exists) {
      throw new AppError(
        'Ya existe una unidad con ese serial',
        HTTP_STATUS.CONFLICT,
        'SERIAL_EXISTS'
      );
    }

    const unit = await inventoryRepository.create({
      ...data,
      serialNumber,
    });

    return { unit };
  },

  async listInventoryUnits(filters, pagination) {
    const [units, total] = await Promise.all([
      inventoryRepository.findMany(filters, pagination),
      inventoryRepository.count(filters),
    ]);

    return {
      data: units,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },

  async getInventoryUnitById(id) {
    const unit = await inventoryRepository.findById(id);
    if (!unit) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }
    return { unit };
  },

  async updateInventoryUnit(id, data) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }

    if (data.environmentId) {
      const environment = await environmentRepository.findById(data.environmentId);
      if (!environment) {
        throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
      }
    }

    const unit = await inventoryRepository.update(id, data);
    return { unit };
  },

  async disposeInventoryUnit(id) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }

    if (existing.status === 'DISPOSED') {
      throw new AppError(
        'La unidad ya está dada de baja',
        HTTP_STATUS.CONFLICT,
        'ALREADY_DISPOSED'
      );
    }

    const unit = await inventoryRepository.update(id, { status: 'DISPOSED' });
    return { unit, message: 'Unidad dada de baja correctamente' };
  },

  async getLowStockItems() {
    const items = await inventoryRepository.findItemsWithAvailableStock();
    const lowStock = items.filter((item) => item.availableStock <= item.minStock);
    return { data: lowStock };
  },

  async assembleUnit(parentUnitId, childUnitIds, userId) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.inventoryUnit.findUnique({
        where: { id: parentUnitId },
        include: {
          item: {
            include: {
              components: {
                include: {
                  childItem: true,
                },
              },
            },
          },
        },
      });

      if (!parent) {
        throw new AppError('Unidad padre no encontrada', HTTP_STATUS.NOT_FOUND, 'PARENT_NOT_FOUND');
      }

      const allowedChildItemIds = new Set(parent.item.components.map((c) => c.childItemId));

      const children = await tx.inventoryUnit.findMany({
        where: { id: { in: childUnitIds } },
        include: { item: true },
      });

      if (children.length !== childUnitIds.length) {
        throw new AppError('Una o más unidades hijas no existen', HTTP_STATUS.NOT_FOUND, 'CHILDREN_NOT_FOUND');
      }

      for (const child of children) {
        if (child.parentUnitId && child.parentUnitId !== parentUnitId) {
          throw new AppError(
            `La unidad ${child.serialNumber} ya pertenece a otro ensamble`,
            HTTP_STATUS.CONFLICT,
            'CHILD_ALREADY_ASSEMBLED'
          );
        }

        if (!allowedChildItemIds.has(child.itemId)) {
          throw new AppError(
            `La unidad ${child.serialNumber} no es un componente válido para ${parent.item.name}`,
            HTTP_STATUS.BAD_REQUEST,
            'INVALID_COMPONENT'
          );
        }

        if (child.status !== 'AVAILABLE') {
          throw new AppError(
            `La unidad ${child.serialNumber} debe estar disponible para ensamblar`,
            HTTP_STATUS.CONFLICT,
            'CHILD_NOT_AVAILABLE'
          );
        }
      }

      await Promise.all(
        children.map((child) =>
          tx.inventoryUnit.update({
            where: { id: child.id },
            data: { parentUnitId },
          })
        )
      );

      await tx.movement.create({
        data: {
          type: 'ADJUSTMENT',
          inventoryUnitId: parentUnitId,
          quantity: children.length,
          responsibleId: userId,
          notes: `Ensambladas unidades: ${children.map((c) => c.serialNumber).join(', ')}`,
        },
      });

      return { assembled: children.length };
    });
  },

  async disassembleUnit(parentUnitId, childUnitIds, userId) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.inventoryUnit.findUnique({
        where: { id: parentUnitId },
      });

      if (!parent) {
        throw new AppError('Unidad padre no encontrada', HTTP_STATUS.NOT_FOUND, 'PARENT_NOT_FOUND');
      }

      const children = await tx.inventoryUnit.findMany({
        where: { id: { in: childUnitIds }, parentUnitId },
      });

      if (children.length !== childUnitIds.length) {
        throw new AppError('Una o más unidades no pertenecen a este ensamble', HTTP_STATUS.BAD_REQUEST, 'INVALID_DISASSEMBLY');
      }

      await Promise.all(
        children.map((child) =>
          tx.inventoryUnit.update({
            where: { id: child.id },
            data: { parentUnitId: null },
          })
        )
      );

      await tx.movement.create({
        data: {
          type: 'ADJUSTMENT',
          inventoryUnitId: parentUnitId,
          quantity: children.length,
          responsibleId: userId,
          notes: `Desensambladas unidades: ${children.map((c) => c.serialNumber).join(', ')}`,
        },
      });

      return { disassembled: children.length };
    });
  },

  async getUnitDetail(id) {
    const unit = await inventoryRepository.findById(id);
    if (!unit) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }

    const components = await inventoryRepository.findItemComponents(unit.itemId);
    const childUnits = await inventoryRepository.findChildUnits(id);

    const assembledItemIds = new Set(childUnits.map((c) => c.itemId));
    const isComplete = components
      .filter((c) => c.isRequired)
      .every((c) => assembledItemIds.has(c.childItemId));

    return {
      unit: {
        ...unit,
        isComplete,
        missingComponents: components
          .filter((c) => c.isRequired && !assembledItemIds.has(c.childItemId))
          .map((c) => ({ ...c, childItem: c.childItem })),
      },
    };
  },
};

async function generateNextSerial(itemCode) {
  const existingSerials = await inventoryRepository.findExistingSerialsByItemCode(itemCode);
  let max = 0;
  const pattern = new RegExp(`^${escapeRegExp(itemCode)}-(\\d+)$`);

  for (const serial of existingSerials) {
    const match = serial.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }

  const next = max + 1;
  return `${itemCode}-${String(next).padStart(3, '0')}`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
