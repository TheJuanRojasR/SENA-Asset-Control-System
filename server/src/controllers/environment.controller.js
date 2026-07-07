import { environmentService } from '../services/environment.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const environmentController = {
  create: asyncHandler(async (req, res) => {
    const result = await environmentService.createEnvironment(req.body);
    successResponse(res, result, 'Ambiente creado correctamente', HTTP_STATUS.CREATED);
  }),

  list: asyncHandler(async (req, res) => {
    const filters = {
      search: req.query.search,
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await environmentService.listEnvironments(filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await environmentService.getEnvironmentById(Number(req.params.id));
    successResponse(res, result);
  }),

  update: asyncHandler(async (req, res) => {
    const result = await environmentService.updateEnvironment(Number(req.params.id), req.body);
    successResponse(res, result, 'Ambiente actualizado correctamente');
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await environmentService.deleteEnvironment(Number(req.params.id));
    successResponse(res, result, 'Ambiente eliminado correctamente');
  }),
};
