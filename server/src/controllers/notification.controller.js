import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/response.js';
import { notificationService } from '../services/notification.service.js';

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const pagination = {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    };
    const result = await notificationService.listForUser(req.user.userId, pagination);
    successResponse(res, result);
  }),
};
