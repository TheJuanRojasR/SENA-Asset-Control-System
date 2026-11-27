import { z } from 'zod';

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato YYYY-MM-DD');

/**
 * RN-MOV-02: filtros por unidad, elemento, tipo y rango de fechas (cerrado en los dos
 * extremos y por días de calendario). La forma de los parámetros es decisión de
 * implementación; la paginación con total la fija RN-CTX-02.
 */
export const listMovementsQuerySchema = z.object({
  inventoryUnitId: z.coerce.number().int().positive().optional(),
  itemId: z.coerce.number().int().positive().optional(),
  type: z
    .enum([
      'ENTRY',
      'ASSEMBLY',
      'DISASSEMBLY',
      'RESERVATION',
      'LOAN',
      'RETURN',
      'DISPOSAL',
      'ADJUSTMENT',
      'RESTOCK',
    ])
    .optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
