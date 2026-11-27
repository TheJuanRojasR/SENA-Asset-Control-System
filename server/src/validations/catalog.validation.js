import { z } from 'zod';

/**
 * RN-CAT-04 / RN-SOL-01: la cantidad siempre viaja con un rango de fechas. El rango se
 * interpreta como días de calendario inclusivos (RN-NEG-04). Si no se envía, se usa el día
 * de hoy para ambos extremos, que es la fecha de retiro más temprana que admite la regla.
 * Un rango mal formado no está definido por la especificación: se rechaza con 400 para no
 * calcular cantidades sin rango válido.
 */
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD');

export const catalogQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    search: z.string().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) return true;
      return new Date(`${data.from}T00:00:00Z`) <= new Date(`${data.to}T00:00:00Z`);
    },
    { message: 'El rango de fechas está invertido', path: ['to'] }
  );
