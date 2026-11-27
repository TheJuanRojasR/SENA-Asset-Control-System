import { prisma } from '../config/database.js';
import { itemService } from './item.service.js';
import { inventoryService } from './inventory.service.js';
import { requestRepository } from '../repositories/request.repository.js';

// RN-PAN-01: los estados activos del instructor son los no finales; la entrega parcial
// sigue viva (RN-SOL-11).
const ACTIVE_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'PACKED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'PARTIALLY_RETURNED',
];

export const dashboardService = {
  /**
   * RN-PAN-01/02: panel del administrador. Cada cifra se toma de la misma consulta que la
   * pantalla que la detalla; el panel no calcula variantes propias.
   */
  async getAdminDashboard() {
    const [activeInstructors, catalog, pendingRequests, lowStock, latestRequests] =
      await Promise.all([
        prisma.user.count({ where: { role: 'INSTRUCTOR', isActive: true } }),
        itemService.listItems({}, { page: 1, limit: 1 }),
        prisma.request.count({ where: { status: 'PENDING' } }),
        inventoryService.getLowStockItems(),
        requestRepository.findMany({ filters: {} }, { page: 1, limit: 5 }),
      ]);

    return {
      dashboard: {
        activeInstructors,
        catalogItems: catalog.meta.total,
        pendingRequests,
        lowStockAlerts: lowStock.data.length,
        latestRequests,
      },
    };
  },

  /** RN-PAN-01: panel del instructor; solo sus solicitudes activas y sus devoluciones. */
  async getInstructorDashboard(userId) {
    const [activeRequests, pendingReturns] = await Promise.all([
      prisma.request.count({
        where: { requesterId: userId, status: { in: ACTIVE_REQUEST_STATUSES } },
      }),
      // Unidades serializadas entregadas que todavía no volvieron ni se declararon perdidas.
      prisma.requestItemUnit.count({
        where: {
          requestItem: { request: { requesterId: userId } },
          loanedAt: { not: null },
          returnedAt: null,
          lostAt: null,
          releasedAt: null,
        },
      }),
    ]);

    return { dashboard: { activeRequests, pendingReturns } };
  },
};
