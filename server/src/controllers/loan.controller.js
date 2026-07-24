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
    const { unitIds, physicalStateReturned } = req.body;
    const result = await loanService.returnUnits(
      req.user.userId,
      unitIds,
      physicalStateReturned
    );
    successResponse(res, result, 'Unidades devueltas correctamente');
  }),
};
