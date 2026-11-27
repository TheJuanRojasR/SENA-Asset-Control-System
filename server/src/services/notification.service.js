import { notificationRepository } from '../repositories/notification.repository.js';

export const notificationService = {
  /** RN-NOT-01: el actor consulta los avisos que el sistema le dejó. */
  async listForUser(userId, pagination = {}) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const { data, total } = await notificationRepository.findByUser(userId, { page, limit });
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    };
  },
};
