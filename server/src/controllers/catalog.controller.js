import { catalogService } from '../services/catalog.service.js';
import { successResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const catalogController = {
  list: asyncHandler(async (req, res) => {
    const result = await catalogService.listCatalog(req.query);
    successResponse(res, result);
  }),
};
