import cron from 'node-cron';
import { prisma } from '../config/database.js';

/**
 * Tiempo máximo que una solicitud puede permanecer PENDING con unidades
 * reservadas antes de liberarse automáticamente.
 * Configurable vía RESERVATION_TIMEOUT_HOURS; por defecto 24 horas.
 */
const RESERVATION_TIMEOUT_HOURS = Number(process.env.RESERVATION_TIMEOUT_HOURS) || 24;
const CRON_EXPRESSION = process.env.RESERVATION_CLEANUP_CRON || '0 * * * *';

export const reservationCleanupService = {
  /**
   * Libera las reservas de solicitudes PENDING creadas antes del límite:
   * unidades RESERVED → AVAILABLE, elimina asignaciones y cancela la solicitud.
   *
   * @returns {Promise<{ cancelledRequests: number, releasedUnits: number }>}
   */
  async cleanupExpiredReservations() {
    const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT_HOURS * 60 * 60 * 1000);

    const expiredRequests = await prisma.request.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
      },
      include: {
        requestItems: {
          include: {
            assignedUnits: true,
          },
        },
      },
    });

    let cancelledRequests = 0;
    let releasedUnits = 0;

    for (const request of expiredRequests) {
      try {
        await prisma.$transaction(async (tx) => {
          const assignedUnits = request.requestItems.flatMap((item) => item.assignedUnits);

          if (assignedUnits.length > 0) {
            const unitIds = assignedUnits.map((assignment) => assignment.inventoryUnitId);

            await tx.inventoryUnit.updateMany({
              where: { id: { in: unitIds } },
              data: { status: 'AVAILABLE' },
            });

            await tx.requestItemUnit.deleteMany({
              where: { id: { in: assignedUnits.map((assignment) => assignment.id) } },
            });

            releasedUnits += assignedUnits.length;
          }

          const expirationNote = `Reserva expirada automáticamente tras ${RESERVATION_TIMEOUT_HOURS}h sin aprobación.`;
          const observations = request.observations
            ? `${request.observations} | ${expirationNote}`
            : expirationNote;

          await tx.request.update({
            where: { id: request.id },
            data: { status: 'CANCELLED', observations },
          });
        });

        cancelledRequests += 1;
      } catch (error) {
        // Una solicitud fallida no detiene la limpieza del resto.
        console.error(`[ReservationCleanup] Error liberando solicitud ${request.id}:`, error.message);
      }
    }

    return { cancelledRequests, releasedUnits };
  },

  /**
   * Inicia el scheduler (cada hora por defecto) y ejecuta una pasada inicial
   * para cubrir reservas que expiraron mientras el servidor estaba apagado.
   */
  startScheduler() {
    cron.schedule(CRON_EXPRESSION, async () => {
      try {
        const { cancelledRequests, releasedUnits } = await this.cleanupExpiredReservations();
        if (cancelledRequests > 0) {
          console.log(
            `[ReservationCleanup] ${cancelledRequests} solicitud(es) expiradas, ${releasedUnits} unidad(es) liberadas`
          );
        }
      } catch (error) {
        console.error('[ReservationCleanup] Error en ejecución programada:', error.message);
      }
    });

    this.cleanupExpiredReservations()
      .then(({ cancelledRequests, releasedUnits }) => {
        if (cancelledRequests > 0) {
          console.log(
            `[ReservationCleanup] Pasada inicial: ${cancelledRequests} solicitud(es) expiradas, ${releasedUnits} unidad(es) liberadas`
          );
        }
      })
      .catch((error) => {
        console.error('[ReservationCleanup] Error en pasada inicial:', error.message);
      });

    console.log(
      `[ReservationCleanup] Scheduler activo (${CRON_EXPRESSION}), timeout: ${RESERVATION_TIMEOUT_HOURS}h`
    );
  },
};
