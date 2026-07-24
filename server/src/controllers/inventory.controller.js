import { inventoryService } from '../services/inventory.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const inventoryController = {
  create: asyncHandler(async (req, res) => {
    const result = await inventoryService.createInventoryUnit(req.body);
    successResponse(res, result, 'Unidad de inventario creada correctamente', HTTP_STATUS.CREATED);
  }),

  list: asyncHandler(async (req, res) => {
    const filters = {
      itemId: req.query.itemId ? Number(req.query.itemId) : undefined,
      environmentId: req.query.environmentId ? Number(req.query.environmentId) : undefined,
      status: req.query.status,
      physicalState: req.query.physicalState,
      search: req.query.search,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };
    const result = await inventoryService.listInventoryUnits(filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await inventoryService.getInventoryUnitById(Number(req.params.id));
    successResponse(res, result);
  }),

  update: asyncHandler(async (req, res) => {
    const result = await inventoryService.updateInventoryUnit(Number(req.params.id), req.body);
    successResponse(res, result, 'Unidad de inventario actualizada correctamente');
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await inventoryService.disposeInventoryUnit(Number(req.params.id));
    successResponse(res, result, result.message);
  }),

  lowStock: asyncHandler(async (_req, res) => {
    const result = await inventoryService.getLowStockItems();
    successResponse(res, result);
  }),

  assemble: asyncHandler(async (req, res) => {
    const result = await inventoryService.assembleUnit(
      Number(req.params.id),
      req.body.childUnitIds,
      req.user.userId
    );
    successResponse(res, result, 'Unidades ensambladas correctamente');
  }),

  disassemble: asyncHandler(async (req, res) => {
    const result = await inventoryService.disassembleUnit(
      Number(req.params.id),
      req.body.childUnitIds,
      req.user.userId
    );
    successResponse(res, result, 'Unidades desensambladas correctamente');
  }),

  detail: asyncHandler(async (req, res) => {
    const result = await inventoryService.getUnitDetail(Number(req.params.id));
    successResponse(res, result);
  }),
};
