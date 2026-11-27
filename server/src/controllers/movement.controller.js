import { movementService } from '../services/movement.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const movementController = {
  list: asyncHandler(async (req, res) => {
    const filters = {
      inventoryUnitId: req.query.inventoryUnitId
        ? Number(req.query.inventoryUnitId)
        : undefined,
      itemId: req.query.itemId ? Number(req.query.itemId) : undefined,
      type: req.query.type,
      from: req.query.from,
      to: req.query.to,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };
    const result = await movementService.listMovements(filters, pagination);
    successResponse(res, result);
  }),
};
