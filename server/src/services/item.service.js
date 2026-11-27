import { itemRepository } from '../repositories/item.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

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

    // AC-ITE-04-1 / RN-INV-24: la consulta de composición informa la opcionalidad.
    const components = (item.components || []).map((component) => ({
      ...component,
      isOptional: !component.isRequired,
    }));

    return { item: { ...(await withAvailability(item)), components } };
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

    const { components, initialQty = 0, isConsumable = false, ...rest } = data;

    // RN-INV-46: solo un elemento donado puede ser consumible.
    const ownership = rest.ownership || 'SENA';
    if (isConsumable && ownership !== 'DONATED') {
      throw new AppError(
        'Solo un elemento donado puede registrarse como consumible',
        HTTP_STATUS.CONFLICT,
        'CONSUMABLE_NOT_DONATED'
      );
    }

    await validateComponents(null, components);

    // RN-INV-06 / RN-INV-12: el consumible nace con su cantidad inicial y cero unidades.
    // RN-INV-40: un serializable no autogenera unidades ni seriales, aunque llegue initialQty.
    const itemData = {
      ...rest,
      isConsumable,
      ownership,
      unit: rest.unit || 'UNIDAD',
      minStock: rest.minStock ?? null,
      stock: isConsumable ? Number(initialQty) || 0 : 0,
    };

    const createdId = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({ data: itemData, select: { id: true } });
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

    const { components, ...itemData } = data;
    await validateComponents(id, components);

    if (components) {
      // RN-INV-35 / AC-ITE-05-3: con unidades ensambladas no se puede quitar un
      // componente; agregar siempre se permite.
      const currentComponents = await itemRepository.findComponents(id);
      const nextIds = new Set(components.map((component) => component.childItemId));
      const removedIds = currentComponents
        .filter((component) => !nextIds.has(component.childItemId))
        .map((component) => component.childItemId);

      if (removedIds.length > 0) {
        const assembled = await prisma.inventoryUnit.count({
          where: {
            itemId: id,
            childUnits: { some: { itemId: { in: removedIds } } },
          },
        });
        if (assembled > 0) {
          throw new AppError(
            'No se puede quitar un componente con unidades ensambladas',
            HTTP_STATUS.CONFLICT,
            'COMPONENT_ASSEMBLED'
          );
        }
      }
    }

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
      return itemRepository.update(id, itemData, { tx });
    });

    return {
      item: {
        ...updated,
        stock: await calculateStock(updated),
      },
    };
  },

  /**
   * RN-INV-45 / US-ITE-06: dar de baja un elemento no lo elimina. Se rechaza si alguna
   * unidad está comprometida (prestada o reservada) y se acepta si no hay ninguna; las
   * unidades dadas de baja o declaradas perdidas no bloquean (RN-PRE-15).
   */
  async deleteItem(id) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    const committed = await itemRepository.countCommittedUnits(id);
    if (committed > 0) {
      throw new AppError(
        'No se puede dar de baja el ítem porque tiene unidades comprometidas',
        HTTP_STATUS.CONFLICT,
        'ITEM_HAS_COMMITTED_UNITS'
      );
    }

    await itemRepository.deactivate(id);
    return { message: 'Ítem dado de baja correctamente' };
  },

};



async function validateComponents(parentItemId, components) {
  if (!components || components.length === 0) return;

  for (const component of components) {
    if (parentItemId && component.childItemId === parentItemId) {
      throw new AppError('Un ítem no puede ser componente de sí mismo', HTTP_STATUS.BAD_REQUEST, 'SELF_COMPONENT');
    }

    const child = await itemRepository.findById(component.childItemId);
    if (!child) {
      throw new AppError(`Ítem componente no encontrado: ${component.childItemId}`, HTTP_STATUS.NOT_FOUND, 'COMPONENT_NOT_FOUND');
    }

    // RN-INV-41 / AC-ITE-03-8: la composición no puede formar ciclos ni directos ni
    // indirectos. Al agregar parent → child, el ciclo aparece si child ya contiene
    // (transitivamente) a parent.
    if (parentItemId && (await childContains(parentItemId, component.childItemId))) {
      throw new AppError(
        'La composición no puede formar un ciclo',
        HTTP_STATUS.CONFLICT,
        'COMPONENT_CYCLE'
      );
    }
  }
}

/**
 * ¿`candidateChildId` contiene a `ancestorId` de forma directa o transitiva?
 * Recorre el grafo de composición del catálogo.
 */
async function childContains(ancestorId, candidateChildId) {
  const visited = new Set();
  const stack = [candidateChildId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === ancestorId) return true;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const children = await prisma.itemComponent.findMany({
      where: { parentItemId: currentId },
      select: { childItemId: true },
    });
    stack.push(...children.map((row) => row.childItemId));
  }

  return false;
}

async function calculateStock(item) {
  // RN-INV-06: el stock del consumible es su cantidad; el del serializable se cuenta por
  // unidades disponibles (nunca por seriales autogenerados).
  if (item.isConsumable) return item.stock ?? 0;
  return itemRepository.countAvailableUnits(item.id);
}


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
