import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  admin: asyncHandler(async (_req, res) => {
    const result = await dashboardService.getAdminDashboard();
    successResponse(res, result);
  }),

  instructor: asyncHandler(async (req, res) => {
    const result = await dashboardService.getInstructorDashboard(req.user.userId);
    successResponse(res, result);
  }),
};
