import { z } from 'zod';

const requestStatusValues = ['PENDING', 'APPROVED', 'REJECTED', 'PACKED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const shiftValues = ['MORNING', 'AFTERNOON', 'NIGHT'];

export const createRequestSchema = z.object({
  environmentId: z.number().int().positive().optional(),
  shift: z.enum(shiftValues, {
    errorMap: () => ({ message: 'Jornada inválida' }),
  }).optional(),
  // RN-SOL-01: fecha de retiro dentro del rango; el default es el día siguiente.
  pickupDate: z.coerce.date().optional(),
  estimatedDate: z.coerce.date().optional(),
  observations: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.number().int().positive('El ítem es requerido'),
      requestedQty: z.number().int().positive('La cantidad debe ser mayor a 0'),
    })
  ).min(1, 'Debe incluir al menos un ítem'),
});

// RN-SOL-03/04: el administrador puede reducir cantidades; la nota es obligatoria si el
// total aprobado queda por debajo del solicitado.
// RN-SOL-05: el instructor solo modifica su solicitud mientras está PENDING.
export const updateRequestSchema = z.object({
  pickupDate: z.coerce.date().optional(),
  estimatedDate: z.coerce.date().optional(),
  observations: z.string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive('El ítem es requerido'),
        requestedQty: z.number().int().positive('La cantidad debe ser mayor a 0'),
      })
    )
    .min(1, 'Debe incluir al menos un ítem')
    .optional(),
});

export const approveRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive('El ítem es requerido'),
        approvedQty: z.number().int().min(0, 'La cantidad aprobada no puede ser negativa'),
      })
    )
    .optional(),
  note: z.string().trim().optional(),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z
    .string({ required_error: 'El motivo de rechazo es obligatorio' })
    .min(1, 'El motivo de rechazo es obligatorio'),
});

// RN-SOL-11 / US-SOL-06: la entrega puede ser total o parcial por línea.
export const deliverRequestSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive('El ítem es requerido'),
        deliveredQty: z.number().int().min(0, 'La cantidad entregada no puede ser negativa'),
      })
    )
    .optional(),
});

export const requestIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(requestStatusValues).optional(),
  requesterId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
