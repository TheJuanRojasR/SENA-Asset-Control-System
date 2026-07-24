import { requestService } from '../services/request.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const requestController = {
  create: asyncHandler(async (req, res) => {
    const result = await requestService.createRequest(req.user.userId, req.body);
    successResponse(res, result, 'Solicitud creada correctamente', HTTP_STATUS.CREATED);
  }),

  list: asyncHandler(async (req, res) => {
    const filters = {
      status: req.query.status,
      requesterId: req.query.requesterId ? Number(req.query.requesterId) : undefined,
      search: req.query.search,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };
    const result = await requestService.listRequests(req.user, filters, pagination);
    successResponse(res, result);
  }),

  getById: asyncHandler(async (req, res) => {
    const result = await requestService.getRequestById(req.user, Number(req.params.id));
    successResponse(res, result);
  }),

  approve: asyncHandler(async (req, res) => {
    const result = await requestService.approveRequest(req.user.userId, Number(req.params.id));
    successResponse(res, result, 'Solicitud aprobada correctamente');
  }),

  reject: asyncHandler(async (req, res) => {
    const result = await requestService.rejectRequest(
      req.user.userId,
      Number(req.params.id),
      req.body.rejectionReason
    );
    successResponse(res, result, 'Solicitud rechazada correctamente');
  }),

  pack: asyncHandler(async (req, res) => {
    const result = await requestService.packRequest(req.user.userId, Number(req.params.id));
    successResponse(res, result, 'Solicitud empacada correctamente');
  }),

  deliver: asyncHandler(async (req, res) => {
    const result = await requestService.deliverRequest(req.user.userId, Number(req.params.id));
    successResponse(res, result, 'Solicitud entregada correctamente');
  }),

  complete: asyncHandler(async (req, res) => {
    const result = await requestService.completeRequest(req.user.userId, Number(req.params.id));
    successResponse(res, result, 'Solicitud completada correctamente');
  }),

  cancel: asyncHandler(async (req, res) => {
    const result = await requestService.cancelRequest(req.user.userId, Number(req.params.id));
    successResponse(res, result, 'Solicitud cancelada correctamente');
  }),
};
