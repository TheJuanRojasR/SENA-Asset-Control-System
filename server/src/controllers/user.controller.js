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
    // Los query params llegan como texto: se normalizan aquí para que el filtro por estado
    // y la paginación lleguen a Prisma con su tipo (AC-USR-02-2 y AC-USR-06-3).
    const rawIsActive = req.query.isActive;
    const filters = {
      role: req.query.role,
      isActive:
        rawIsActive === undefined ? undefined : rawIsActive === 'true' || rawIsActive === true,
      search: req.query.search,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
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

  // AC-USR-04-1: cualquier usuario con sesión cambia su propia contraseña.
  changeOwnPassword: asyncHandler(async (req, res) => {
    const result = await userService.changeOwnPassword(req.user.userId, req.body);
    successResponse(res, result, result.message);
  }),

  // AC-USR-05-1: el administrador restablece la contraseña de un instructor.
  resetPassword: asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(Number(req.params.id), req.body);
    successResponse(res, result, 'Contraseña restablecida correctamente');
  }),

  // AC-USR-03-4 / AC-USR-06-1: activar o desactivar, con protección del último admin.
  updateStatus: asyncHandler(async (req, res) => {
    const result = await userService.setUserStatus(Number(req.params.id), req.body);
    successResponse(
      res,
      result,
      req.body.isActive ? 'Usuario reactivado correctamente' : 'Usuario desactivado correctamente'
    );
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(Number(req.params.id));
    successResponse(res, result, result.message);
  }),
};
