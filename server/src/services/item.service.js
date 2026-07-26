import { itemRepository } from '../repositories/item.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

const itemListSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  imageUrl: true,
  categoryId: true,
  minStock: true,
  unit: true,
  isConsumable: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  inventoryUnits: {
    select: {
      id: true,
      serialNumber: true,
      environmentId: true,
      status: true,
      physicalState: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { serialNumber: 'asc' },
  },
};

export const itemService = {
  async listItems(filters, pagination) {
    const includeInactive = filters.includeInactive !== false;
    const [items, total] = await Promise.all([
      itemRepository.findMany(filters, { ...pagination, includeInactive }),
      itemRepository.count(filters, { includeInactive }),
    ]);

    const data = await Promise.all(items.map(withAvailability));

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },

  async getItemById(id) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    return { item: await withAvailability(item) };
  },

  async createItem(data) {
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new AppError('Categoría no encontrada', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
    }

    const exists = await itemRepository.findByCode(data.code);
    if (exists) {
      throw new AppError('Ya existe un ítem con ese código', HTTP_STATUS.CONFLICT, 'ITEM_CODE_EXISTS');
    }

    const { components, ...itemData } = data;
    await validateComponents(null, components);

    const createdId = await prisma.$transaction(async (tx) => {
      const created = await createItemWithInitialStock(tx, itemData);
      if (components && components.length > 0) {
        await itemRepository.setComponents(created.id, components, { tx });
      }
      return created.id;
    });

    const item = await itemRepository.findById(createdId);

    return {
      item: {
        ...item,
        stock: await calculateStock(item),
      },
    };
  },

  async updateItem(id, data) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    const { components, initialQty, ...itemData } = data;
    await validateComponents(id, components);

    if (itemData.code) {
      const exists = await itemRepository.findByCode(itemData.code, id);
      if (exists) {
        throw new AppError('Ya existe un ítem con ese código', HTTP_STATUS.CONFLICT, 'ITEM_CODE_EXISTS');
      }
    }

    if (itemData.categoryId) {
      const category = await categoryRepository.findById(itemData.categoryId);
      if (!category) {
        throw new AppError('Categoría no encontrada', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (components) {
        await itemRepository.setComponents(id, components, { tx });
      }
      if (typeof initialQty === 'number') {
        await reconcileInitialQty(tx, {
          itemId: id,
          code: itemData.code || item.code,
          targetQty: initialQty,
        });
      }
      return itemRepository.update(id, itemData, { tx });
    });

    return {
      item: {
        ...updated,
        stock: await calculateStock(updated),
      },
    };
  },

  async deleteItem(id) {
    const item = await itemRepository.findById(id, { includeDeleted: true });
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    if (item.isDeleted || !item.isActive) {
      await itemRepository.restore(id);
      return { message: 'Ítem activado correctamente' };
    }

    const loanedCount = await itemRepository.countLoanedUnits(id);
    if (loanedCount > 0) {
      throw new AppError(
        'No se puede eliminar el ítem porque tiene unidades en préstamo',
        HTTP_STATUS.CONFLICT,
        'ITEM_HAS_LOANS'
      );
    }

    await itemRepository.softDelete(id);
    return { message: 'Ítem desactivado correctamente' };
  },

  async hardDeleteItem(id) {
    const item = await itemRepository.findById(id, { includeDeleted: true });
    if (!item) throw new AppError('Item no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');

    const loanedCount = await itemRepository.countLoanedUnits(id);
    if (loanedCount > 0) {
      throw new AppError( 'No se puede eliminar el item porque tiene unidades en préstamo', HTTP_STATUS.CONFLICT, 'ITEM_HAS_LOANS' );
    }

    await itemRepository.hardDelete(id);
    return { message: 'Item eliminado permanentemente' };
  },

};

function buildInitialUnits(code, initialQty) {
  const units = [];
  for (let i = 1; i <= initialQty; i += 1) {
    units.push({ serialNumber: `${code}-${String(i).padStart(3, '0')}` });
  }
  return units;
}

async function createItemWithInitialStock(tx, data) {
  const { initialQty, ...itemData } = data;
  const inventoryUnits = buildInitialUnits(itemData.code, initialQty);

  const item = await tx.item.create({
    data: {
      ...itemData,
      inventoryUnits: inventoryUnits.length > 0 ? { create: inventoryUnits } : undefined,
    },
    select: itemListSelect,
  });

  return item;
}

async function validateComponents(parentItemId, components) {
  if (!components || components.length === 0) return;

  const ids = components.map((c) => c.childItemId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new AppError('Los componentes no pueden repetirse', HTTP_STATUS.BAD_REQUEST, 'DUPLICATED_COMPONENTS');
  }

  for (const component of components) {
    if (parentItemId && component.childItemId === parentItemId) {
      throw new AppError('Un ítem no puede ser componente de sí mismo', HTTP_STATUS.BAD_REQUEST, 'SELF_COMPONENT');
    }

    const child = await itemRepository.findById(component.childItemId);
    if (!child) {
      throw new AppError(`Ítem componente no encontrado: ${component.childItemId}`, HTTP_STATUS.NOT_FOUND, 'COMPONENT_NOT_FOUND');
    }
  }
}

async function calculateStock(item) {
  return itemRepository.countAvailableUnits(item.id);
}

async function reconcileInitialQty(tx, { itemId, code, targetQty }) {
  const units = await tx.inventoryUnit.findMany({
    where: { itemId },
    select: { id: true, serialNumber: true, status: true },
    orderBy: { serialNumber: 'asc' },
  });

  const availableUnits = units.filter((u) => u.status === 'AVAILABLE');
  const diff = targetQty - availableUnits.length;
  if (diff === 0) return;

  if (diff < 0) {
    const toDelete = availableUnits.slice(diff).map((u) => u.id);
    await tx.inventoryUnit.deleteMany({ where: { id: { in: toDelete } } });
    return;
  }

  const maxSuffix = units.reduce((max, unit) => {
    const match = unit.serialNumber.match(/-(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);

  const newUnits = Array.from({ length: diff }, (_, index) => {
    const next = maxSuffix + index + 1;
    return { itemId, serialNumber: `${code}-${String(next).padStart(3, '0')}` };
  });

  await tx.inventoryUnit.createMany({ data: newUnits });
/**
 * Enriquece un ítem con su disponibilidad efectiva.
 * Ítems simples: { stock, available }.
 * Ítems compuestos: además { complete, incomplete, incompleteDetails },
 * indicando cuántas unidades padre disponibles tienen todos sus componentes
 * requeridos ensamblados y cuáles faltan por unidad.
 */
async function withAvailability(item) {
  const stock = await calculateStock(item);
  const result = { ...item, stock, available: stock };

  if (!Array.isArray(item.components) || item.components.length === 0) {
    return result;
  }

  return { ...result, ...(await calculateCompleteness(item)) };
}

async function calculateCompleteness(item) {
  const requiredComponents = item.components.filter((component) => component.isRequired);

  if (requiredComponents.length === 0) {
    return { complete: item.stock ?? 0, incomplete: 0, incompleteDetails: [] };
  }

  const parentUnits = await prisma.inventoryUnit.findMany({
    where: { itemId: item.id, status: 'AVAILABLE' },
    select: {
      id: true,
      serialNumber: true,
      childUnits: {
        where: { status: 'AVAILABLE' },
        select: { itemId: true },
      },
    },
    orderBy: { serialNumber: 'asc' },
  });

  let complete = 0;
  const incompleteDetails = [];

  for (const unit of parentUnits) {
    const missingComponents = [];

    for (const component of requiredComponents) {
      const assembled = unit.childUnits.filter(
        (childUnit) => childUnit.itemId === component.childItemId
      ).length;

      if (assembled < component.quantity) {
        missingComponents.push({
          itemId: component.childItemId,
          itemName: component.childItem?.name ?? `Ítem #${component.childItemId}`,
          required: component.quantity,
          assembled,
          missing: component.quantity - assembled,
        });
      }
    }

    if (missingComponents.length === 0) {
      complete += 1;
    } else {
      incompleteDetails.push({
        unitId: unit.id,
        serialNumber: unit.serialNumber,
        missingComponents,
      });
    }
  }

  return {
    complete,
    incomplete: incompleteDetails.length,
    incompleteDetails,
  };
}
