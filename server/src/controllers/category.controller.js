import { categoryService } from '../services/category.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const categoryController = {
  list: asyncHandler(async (req, res) => {
    // Los query params llegan como texto; se normalizan para Prisma (AC-CATEG-02-5).
    const filters = { search: req.query.search };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 100,
    };
    const result = await categoryService.listCategories(filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await categoryService.getCategoryById(Number(req.params.id));
    successResponse(res, result);
  }),

  create: asyncHandler(async (req, res) => {
    const result = await categoryService.createCategory(req.body);
    successResponse(res, result, 'Categoría creada correctamente', HTTP_STATUS.CREATED);
  }),

  update: asyncHandler(async (req, res) => {
    const result = await categoryService.updateCategory(Number(req.params.id), req.body);
    successResponse(res, result, 'Categoría actualizada correctamente');
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await categoryService.deleteCategory(Number(req.params.id));
    successResponse(res, result, 'Categoría eliminada correctamente');
  }),
};
