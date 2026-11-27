import { movementRepository } from '../repositories/movement.repository.js';

const mapMovement = (movement) => ({
  id: movement.id,
  type: movement.type,
  date: movement.createdAt,
  quantity: movement.quantity,
  notes: movement.notes,
  item: movement.item,
  unit: movement.inventoryUnit,
  actor: movement.responsible,
  request: movement.request,
});

export const movementService = {
  async listMovements(filters, pagination) {
    const result = await movementRepository.findMany(filters, pagination);
    return { data: result.data.map(mapMovement), meta: result.meta };
  },
};
