import { prisma } from '../config/database.js';

export const notificationRepository = {
  async create(data, { tx } = {}) {
    return (tx || prisma).notification.create({ data });
  },

  async findByUser(userId, { page = 1, limit = 50 } = {}) {
    const where = { userId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);
    return { data, total };
  },
};
