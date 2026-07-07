import { userService } from '../services/user.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const userController = {
  create: asyncHandler(async (req, res) => {
    const result = await userService.createUser(req.user.userId, req.body);
    successResponse(res, result, 'Usuario creado correctamente', HTTP_STATUS.CREATED);
  }),

  list: asyncHandler(async (req, res) => {
    const filters = {
      role: req.query.role,
      isActive: req.query.isActive,
      search: req.query.search,
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await userService.listUsers(filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await userService.getUserById(Number(req.params.id));
    successResponse(res, result);
  }),

  update: asyncHandler(async (req, res) => {
    const result = await userService.updateUser(Number(req.params.id), req.body);
    successResponse(res, result, 'Usuario actualizado correctamente');
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(Number(req.params.id));
    successResponse(res, result, 'Usuario eliminado correctamente');
  }),
};
