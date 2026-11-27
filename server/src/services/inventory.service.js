import { inventoryRepository } from '../repositories/inventory.repository.js';
import { itemRepository } from '../repositories/item.repository.js';
import { environmentRepository } from '../repositories/environment.repository.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const inventoryService = {
  async createInventoryUnit(data, userId) {
    const item = await itemRepository.findById(data.itemId);
    if (!item) {
      throw new AppError('Ítem no encontrado', HTTP_STATUS.NOT_FOUND, 'ITEM_NOT_FOUND');
    }

    // RN-INV-06 / AC-INV-04-2: un consumible se controla por cantidad y no admite
    // unidades serializadas; aceptar una crearía un segundo mecanismo de stock.
    if (item.isConsumable) {
      throw new AppError(
        'Un consumible no admite unidades serializadas',
        HTTP_STATUS.CONFLICT,
        'ITEM_IS_CONSUMABLE'
      );
    }

    let environmentId = data.environmentId;

    // RN-CTX-08 / AC-INV-11-1: la ubicación de una unidad nueva es el Ambiente 104.
    if (!environmentId) {
      const baseEnvironment = await environmentRepository.findByCode('104');
      if (baseEnvironment) environmentId = baseEnvironment.id;
    }

    if (environmentId) {
      const environment = await environmentRepository.findById(environmentId);
      if (!environment) {
        throw new AppError(
          'Ambiente no encontrado',
          HTTP_STATUS.NOT_FOUND,
          'ENVIRONMENT_NOT_FOUND'
        );
      }
    }

    const serialNumber = data.serialNumber;

    const exists = await inventoryRepository.findBySerialNumber(serialNumber);
    if (exists) {
      throw new AppError(
        `Ya existe una unidad con el serial ${serialNumber}`,
        HTTP_STATUS.CONFLICT,
        'SERIAL_EXISTS'
      );
    }

    const unit = await inventoryRepository.create({
      ...data,
      environmentId,
      serialNumber,
    });

    // RN-MOV-01: el alta de una unidad deja un movimiento con su actor y su fecha.
    await prisma.movement.create({
      data: {
        type: 'ENTRY',
        itemId: unit.itemId,
        inventoryUnitId: unit.id,
        quantity: 1,
        responsibleId: userId ?? null,
        notes: 'Alta de unidad',
      },
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

    // RN-INV-42 / AC-INV-12-1/3: a mantenimiento solo se envía un equipo CON_FALLA.
    if (data.physicalState === 'EN_MANTENIMIENTO' && existing.physicalState !== 'CON_FALLA') {
      throw new AppError(
        'Solo un equipo con falla se envía a mantenimiento',
        HTTP_STATUS.CONFLICT,
        'INVALID_MAINTENANCE_STATE'
      );
    }

    if (data.environmentId) {
      const environment = await environmentRepository.findById(data.environmentId);
      if (!environment) {
        throw new AppError(
          'Ambiente no encontrado',
          HTTP_STATUS.NOT_FOUND,
          'ENVIRONMENT_NOT_FOUND'
        );
      }
    }

    const unit = await inventoryRepository.update(id, data);
    return { unit };
  },

  /**
   * RN-INV-14 / RN-INV-17 / AC-INV-08-1: la baja inmediata es solo para una unidad DONADA y
   * exige motivo. El equipo del SENA exige el trámite de US-INV-09.
   */
  async disposeInventoryUnit(id, userId, reason) {
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

    if (existing.ownership !== 'DONATED') {
      throw new AppError(
        'Una unidad del SENA se da de baja por el trámite con confirmación',
        HTTP_STATUS.CONFLICT,
        'SENA_REQUIRES_PROCESS'
      );
    }

    const now = new Date();
    const unit = await inventoryRepository.update(id, {
      status: 'DISPOSED',
      physicalState: 'DADO_DE_BAJA',
      disposalInProgress: false,
      disposalReason: reason,
      disposalStartedAt: now,
      disposalStartedById: userId ?? null,
      disposalConfirmedAt: now,
      disposalConfirmedById: userId ?? null,
    });

    // RN-INV-17 / RN-MOV-01: la baja deja un movimiento con motivo y actor.
    await prisma.movement.create({
      data: {
        type: 'DISPOSAL',
        itemId: existing.itemId,
        inventoryUnitId: id,
        quantity: 1,
        responsibleId: userId ?? null,
        notes: reason,
      },
    });

    return { unit, message: 'Unidad dada de baja correctamente' };
  },

  /** RN-INV-19 / AC-INV-09-1: iniciar el trámite no da de baja la unidad (solo SENA). */
  async startDisposal(id, userId, reason) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }
    if (existing.status === 'DISPOSED' || existing.declaredLost) {
      throw new AppError(
        'La unidad ya salió del inventario activo',
        HTTP_STATUS.CONFLICT,
        'UNIT_ALREADY_OUT'
      );
    }
    if (existing.ownership !== 'SENA') {
      throw new AppError(
        'Solo un equipo del SENA tiene trámite de baja',
        HTTP_STATUS.CONFLICT,
        'NOT_SENA_OWNERSHIP'
      );
    }
    if (existing.disposalInProgress) {
      throw new AppError(
        'La unidad ya tiene un trámite de baja abierto',
        HTTP_STATUS.CONFLICT,
        'DISPOSAL_ALREADY_OPEN'
      );
    }

    const unit = await inventoryRepository.update(id, {
      disposalInProgress: true,
      disposalReason: reason,
      disposalStartedAt: new Date(),
      disposalStartedById: userId ?? null,
      disposalConfirmedAt: null,
      disposalConfirmedById: null,
    });

    return { unit, message: 'Trámite de baja iniciado' };
  },

  /** RN-INV-19/32 / AC-INV-09-3: la baja se efectiviza solo con la confirmación. */
  async confirmDisposal(id, userId) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }
    if (!existing.disposalInProgress) {
      throw new AppError(
        'La unidad no tiene un trámite de baja abierto',
        HTTP_STATUS.CONFLICT,
        'NO_DISPOSAL_PROCESS'
      );
    }

    const unit = await inventoryRepository.update(id, {
      status: 'DISPOSED',
      physicalState: 'DADO_DE_BAJA',
      disposalInProgress: false,
      disposalConfirmedAt: new Date(),
      disposalConfirmedById: userId ?? null,
    });

    await prisma.movement.create({
      data: {
        type: 'DISPOSAL',
        itemId: existing.itemId,
        inventoryUnitId: id,
        quantity: 1,
        responsibleId: userId ?? null,
        notes: existing.disposalReason || 'Baja confirmada',
      },
    });

    return { unit, message: 'Baja confirmada correctamente' };
  },

  /**
   * RN-INV-13 / AC-INV-08-5: pérdida de una unidad que no está prestada. La donada sale de
   * inmediato; la del SENA entra al trámite, y como unidad perdida (RN-PRE-15) no bloquea
   * sus piezas sueltas.
   */
  async registerUnitLoss(id, userId, reason) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }
    if (existing.status === 'LOANED') {
      throw new AppError(
        'La pérdida de una unidad prestada se declara desde el préstamo',
        HTTP_STATUS.CONFLICT,
        'UNIT_IS_LOANED'
      );
    }
    if (existing.declaredLost || existing.status === 'DISPOSED') {
      throw new AppError(
        'La unidad ya salió del inventario activo',
        HTTP_STATUS.CONFLICT,
        'UNIT_ALREADY_OUT'
      );
    }

    const now = new Date();
    const donated = existing.ownership === 'DONATED';
    const unit = await inventoryRepository.update(id, {
      declaredLost: true,
      disposalReason: reason,
      disposalStartedAt: now,
      disposalStartedById: userId ?? null,
      ...(donated
        ? {
            status: 'DISPOSED',
            physicalState: 'DADO_DE_BAJA',
            disposalInProgress: false,
            disposalConfirmedAt: now,
            disposalConfirmedById: userId ?? null,
          }
        : { disposalInProgress: true }),
    });

    await prisma.movement.create({
      data: {
        type: 'DISPOSAL',
        itemId: existing.itemId,
        inventoryUnitId: id,
        quantity: 1,
        responsibleId: userId ?? null,
        notes: `Pérdida: ${reason}`,
      },
    });

    return { unit, message: 'Pérdida registrada correctamente' };
  },

  async restoreInventoryUnit(id) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }

    if (existing.status !== 'DISPOSED') {
      throw new AppError(
        'Solo se puede restablecer una unidad dada de baja',
        HTTP_STATUS.CONFLICT,
        'UNIT_NOT_DISPOSED'
      );
    }

    const unit = await inventoryRepository.update(id, {
      status: 'AVAILABLE',
      physicalState:
        existing.physicalState === 'DADO_DE_BAJA' ? 'OPERATIVO' : existing.physicalState,
    });

    return { unit, message: 'Unidad restablecida correctamente' };
  },

  async hardDeleteInventoryUnit(id) {
    const existing = await inventoryRepository.findById(id);
    if (!existing) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }

    await inventoryRepository.hardDelete(id);
    return { id };
  },

  async getLowStockItems() {
    const items = await inventoryRepository.findItemsWithAvailableStock();
    // RN-INV-44: cada elemento se compara contra SU umbral y uno sin umbral no alerta.
    const lowStock = items.filter(
      (item) => item.minStock !== null && item.availableStock <= item.minStock
    );
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
        throw new AppError(
          'Una o más unidades hijas no existen',
          HTTP_STATUS.NOT_FOUND,
          'CHILDREN_NOT_FOUND'
        );
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

        if (child.status !== 'AVAILABLE' || child.disposalInProgress || child.declaredLost) {
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

      // RN-MOV-01: el ensamblaje es un evento propio y el movimiento identifica la unidad
      // ensamblada y el compuesto del que pasa a formar parte.
      await tx.movement.create({
        data: {
          type: 'ASSEMBLY',
          itemId: parent.itemId,
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
        include: {
          requestItemUnits: {
            where: { returnedAt: null, lostAt: null, releasedAt: null },
          },
          childUnits: { select: { id: true, status: true } },
        },
      });

      if (!parent) {
        throw new AppError('Unidad padre no encontrada', HTTP_STATUS.NOT_FOUND, 'PARENT_NOT_FOUND');
      }

      // RN-INV-38 / AC-INV-03-2: no se desensambla un conjunto comprometido (préstamo
      // vigente o reserva activa), ni por él ni por alguna de sus piezas.
      const parentCommitted =
        parent.status === 'LOANED' ||
        parent.status === 'RESERVED' ||
        parent.requestItemUnits.length > 0;
      const childCommitted = parent.childUnits.some(
        (child) => child.status === 'LOANED' || child.status === 'RESERVED'
      );
      if (parentCommitted || childCommitted) {
        throw new AppError(
          'No se puede desensamblar un equipo comprometido',
          HTTP_STATUS.CONFLICT,
          'ASSEMBLY_COMMITTED'
        );
      }

      const children = await tx.inventoryUnit.findMany({
        where: { id: { in: childUnitIds }, parentUnitId },
      });

      if (children.length !== childUnitIds.length) {
        throw new AppError(
          'Una o más unidades no pertenecen a este ensamble',
          HTTP_STATUS.BAD_REQUEST,
          'INVALID_DISASSEMBLY'
        );
      }

      await Promise.all(
        children.map((child) =>
          tx.inventoryUnit.update({
            where: { id: child.id },
            data: { parentUnitId: null },
          })
        )
      );

      // RN-MOV-01: el desensamblaje es un evento propio, distinto del ensamblaje.
      await tx.movement.create({
        data: {
          type: 'DISASSEMBLY',
          itemId: parent.itemId,
          inventoryUnitId: parentUnitId,
          quantity: children.length,
          responsibleId: userId,
          notes: `Desensambladas unidades: ${children.map((c) => c.serialNumber).join(', ')}`,
        },
      });

      return { disassembled: children.length };
    });
  },

  /**
   * RN-INV-10 / RN-INV-27: integridad funcional del conjunto, evaluada de forma recursiva.
   * Una pieza cuenta como presente solo si está físicamente dentro (status AVAILABLE);
   * si salió suelta (reservada o prestada) se informa como faltante con su tenedor.
   * La ausencia de un opcional se documenta sin volver incompleto al conjunto.
   */
  async getUnitDetail(id) {
    const unit = await inventoryRepository.findById(id);
    if (!unit) {
      throw new AppError('Unidad no encontrada', HTTP_STATUS.NOT_FOUND, 'INVENTORY_UNIT_NOT_FOUND');
    }
    const completeness = await computeUnitCompleteness(unit);
    return { unit: { ...unit, ...completeness } };
  },

  /** RN-INV-10 / AC-INV-05-3: conjuntos funcionalmente incompletos de todo el inventario. */
  async listIncompleteAssemblies(pagination = {}) {
    const units = await inventoryRepository.findAllAssemblyUnits();
    const incomplete = [];
    for (const unit of units) {
      const completeness = await computeUnitCompleteness(unit);
      if (!completeness.isComplete) {
        incomplete.push({ ...unit, ...completeness });
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const total = incomplete.length;
    return {
      data: incomplete.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    };
  },
};


function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Completitud funcional de una unidad de compuesto (RN-INV-10, RN-INV-27).
 * Presente = físicamente dentro (status AVAILABLE). Los faltantes obligatorios llevan su
 * tenedor si salieron sueltos; la recursión evalúa los compuestos ensamblados.
 */
async function computeUnitCompleteness(unit, visited = new Set()) {
  if (visited.has(unit.id)) {
    return { isComplete: true, missingComponents: [], optionalMissing: [] };
  }
  visited.add(unit.id);

  const components = await inventoryRepository.findItemComponents(unit.itemId);
  const childUnits = await inventoryRepository.findChildUnits(unit.id);
  const physicallyInside = childUnits.filter((child) => child.status === 'AVAILABLE');

  const presentByItem = new Map();
  for (const child of physicallyInside) {
    presentByItem.set(child.itemId, (presentByItem.get(child.itemId) || 0) + 1);
  }

  const missingComponents = [];
  const optionalMissing = [];

  for (const component of components) {
    const requiredQty = component.quantity ?? 1;
    const presentQty = presentByItem.get(component.childItemId) || 0;
    if (presentQty >= requiredQty) continue;

    const entry = {
      childItemId: component.childItemId,
      childItem: component.childItem,
      isRequired: component.isRequired,
      requiredQty,
      presentQty,
    };

    // RN-PRE-02: si la pieza salió suelta, el compromiso dice quién la tiene.
    const commitment = await inventoryRepository.findLooseCommitment(
      unit.id,
      component.childItemId
    );
    if (commitment) {
      entry.holder = commitment.requestItem?.request?.requester ?? null;
      entry.since = commitment.loanedAt ?? commitment.createdAt ?? null;
    }

    if (component.isRequired) missingComponents.push(entry);
    else optionalMissing.push(entry);
  }

  // RN-INV-27: un compuesto dentro de otro se evalúa recursivamente y sus faltantes
  // obligatorios se informan también en el conjunto padre.
  for (const childUnit of physicallyInside) {
    const childCompleteness = await computeUnitCompleteness(childUnit, new Set(visited));
    if (!childCompleteness.isComplete) {
      missingComponents.push(...childCompleteness.missingComponents);
    }
  }

  return {
    isComplete: missingComponents.length === 0,
    missingComponents,
    optionalMissing,
  };
}

