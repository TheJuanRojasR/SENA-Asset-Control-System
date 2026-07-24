import { z } from 'zod';

const requestStatusValues = ['PENDING', 'APPROVED', 'REJECTED', 'PACKED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
const shiftValues = ['MORNING', 'AFTERNOON', 'NIGHT'];

export const createRequestSchema = z.object({
  environmentId: z.number().int().positive().optional(),
  shift: z.enum(shiftValues, {
    errorMap: () => ({ message: 'Jornada inválida' }),
  }).optional(),
  estimatedDate: z.coerce.date().optional(),
  observations: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.number().int().positive('El ítem es requerido'),
      requestedQty: z.number().int().positive('La cantidad debe ser mayor a 0'),
    })
  ).min(1, 'Debe incluir al menos un ítem'),
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1, 'El motivo de rechazo es requerido'),
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
