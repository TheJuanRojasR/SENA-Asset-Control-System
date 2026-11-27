import { loanService } from '../services/loan.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const loanController = {
  list: asyncHandler(async (req, res) => {
    const result = await loanService.listLoans(req.user, req.query, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    successResponse(res, result);
  }),

  returnUnits: asyncHandler(async (req, res) => {
    const result = await loanService.returnUnits(req.user.userId, req.body);
    successResponse(res, result, 'Unidades devueltas correctamente');
  }),

  listReturns: asyncHandler(async (req, res) => {
    const filters = {
      serialNumber: req.query.serialNumber,
      itemId: req.query.itemId ? Number(req.query.itemId) : undefined,
      from: req.query.from,
      to: req.query.to,
    };
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    };
    const result = await loanService.listReturns(filters, pagination);
    successResponse(res, result);
  }),

  listPending: asyncHandler(async (req, res) => {
    const requestId = Number(req.query.requestId);
    const result = await loanService.listPending(requestId);
    successResponse(res, result);
  }),
};
