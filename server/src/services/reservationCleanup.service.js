import cron from 'node-cron';
import { prisma } from '../config/database.js';

const CRON_EXPRESSION = process.env.RESERVATION_CLEANUP_CRON || '0 * * * *';
const BOGOTA_TIME_ZONE = 'America/Bogota';
const EXPIRY_EXTRA_DAYS = 2;

const bogotaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BOGOTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function bogotaParts(date) {
  const parts = Object.fromEntries(
    bogotaFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/**
 * Instante UTC que corresponde a una fecha/hora local de la aplicación (America/Bogota).
 * Se resuelve con dos iteraciones para absorber el desfase de la zona.
 */
export function bogotaInstant(year, monthIndex, day, hour, minute, second = 0) {
  const targetLocalAsUtc = Date.UTC(year, monthIndex, day, hour, minute, second);
  let guess = targetLocalAsUtc;
  for (let i = 0; i < 2; i += 1) {
    const parts = bogotaParts(new Date(guess));
    const localAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    guess += targetLocalAsUtc - localAsUtc;
  }
  return new Date(guess);
}

/**
 * RN-SOL-07: el plazo es "más de 2 días desde la fecha de retiro" y el corte es a las
 * 23:59 del segundo día posterior, en la zona local de la aplicación (America/Bogota).
 */
export function expiryThresholdFor(pickupDate) {
  const date = new Date(pickupDate);
  // La fecha de retiro se guarda como día de calendario (medianoche UTC); su Y/M/D es la
  // fecha elegida, independientemente de la zona con la que se lea.
  return bogotaInstant(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + EXPIRY_EXTRA_DAYS,
    23,
    59,
    0
  );
}

async function releaseAssignmentsForExpiry(request, tx) {
  const assignments = request.requestItems.flatMap((item) => item.assignedUnits);
  const active = assignments.filter((assignment) => !assignment.releasedAt);
  if (active.length === 0) return 0;

  const unitIds = active.map((assignment) => assignment.inventoryUnitId);
  await tx.requestItemUnit.updateMany({
    where: { id: { in: active.map((assignment) => assignment.id) } },
    data: { releasedAt: new Date() },
  });

  const remaining = await tx.requestItemUnit.findMany({
    where: {
      inventoryUnitId: { in: unitIds },
      returnedAt: null,
      lostAt: null,
      releasedAt: null,
    },
    select: { inventoryUnitId: true },
  });
  const stillReserved = new Set(remaining.map((row) => row.inventoryUnitId));

  for (const unitId of unitIds) {
    if (stillReserved.has(unitId)) continue;
    const unit = await tx.inventoryUnit.findUnique({ where: { id: unitId } });
    if (unit && unit.status === 'RESERVED') {
      await tx.inventoryUnit.update({ where: { id: unitId }, data: { status: 'AVAILABLE' } });
    }
  }

  return active.length;
}

export const reservationCleanupService = {
  /**
   * RN-SOL-07/10: cancela por vencimiento las solicitudes sin entrega cuyo plazo de retiro
   * pasó, liberando la reserva y conservando la traza de los seriales asignados.
   *
   * @param {{ now?: Date }} options instante de referencia (inyectable en tests)
   */
  async cleanupExpiredReservations({ now = new Date() } = {}) {
    const candidates = await prisma.request.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED', 'PACKED'] },
        pickupDate: { not: null },
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

    for (const request of candidates) {
      const threshold = expiryThresholdFor(request.pickupDate);
      if (now.getTime() < threshold.getTime()) continue;

      try {
        await prisma.$transaction(async (tx) => {
          releasedUnits += await releaseAssignmentsForExpiry(request, tx);
          await tx.request.update({
            where: { id: request.id },
            data: {
              status: 'CANCELLED',
              cancellationCause: 'EXPIRED',
            },
          });
        });
        cancelledRequests += 1;
      } catch (error) {
        console.error(
          `[ReservationCleanup] Error liberando solicitud ${request.id}:`,
          error.message
        );
      }
    }

    return { cancelledRequests, releasedUnits };
  },

  /** Inicia el scheduler y ejecuta una pasada inicial. */
  startScheduler() {
    cron.schedule(CRON_EXPRESSION, async () => {
      try {
        const { cancelledRequests, releasedUnits } =
          await this.cleanupExpiredReservations();
        if (cancelledRequests > 0) {
          console.log(
            `[ReservationCleanup] ${cancelledRequests} solicitud(es) vencidas, ${releasedUnits} unidad(es) liberadas`
          );
        }
      } catch (error) {
        console.error('[ReservationCleanup] Error en la limpieza:', error.message);
      }
    });

    this.cleanupExpiredReservations().catch((error) => {
      console.error('[ReservationCleanup] Error en la pasada inicial:', error.message);
    });

    console.log(
      `[ReservationCleanup] Scheduler activo (${CRON_EXPRESSION}), vencimiento: 2 días a las 23:59 (${BOGOTA_TIME_ZONE})`
    );
  },
};
