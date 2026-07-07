import { itemService } from '../services/item.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const itemController = {
  list: asyncHandler(async (req, res) => {
    const filters = {
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      search: req.query.search,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };

    const result = await itemService.listItems(filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await itemService.getItemById(Number(req.params.id));
    successResponse(res, result);
  }),

  create: asyncHandler(async (req, res) => {
    const result = await itemService.createItem(req.body);
    successResponse(res, result, 'Ítem creado correctamente', HTTP_STATUS.CREATED);
  }),

  update: asyncHandler(async (req, res) => {
    const result = await itemService.updateItem(Number(req.params.id), req.body);
    successResponse(res, result, 'Ítem actualizado correctamente');
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await itemService.deleteItem(Number(req.params.id));
    successResponse(res, result, 'Ítem eliminado correctamente');
  }),
};
