import { z } from 'zod';

export const createInventorySchema = z.object({
  itemId: z.number().int().positive('El ítem es obligatorio'),
  serialNumber: z.string().min(1, 'El serial no puede estar vacío').optional(),
  environmentId: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado de unidad inválido' }),
  }).optional(),
  physicalState: z.enum(['GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado físico inválido' }),
  }).optional(),
  notes: z.string().optional(),
});

export const updateInventorySchema = z.object({
  environmentId: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado de unidad inválido' }),
  }).optional(),
  physicalState: z.enum(['GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado físico inválido' }),
  }).optional(),
  notes: z.string().optional(),
});

export const inventoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const assemblySchema = z.object({
  childUnitIds: z.array(z.number().int().positive()).min(1),
});

export const listInventoryQuerySchema = z.object({
  itemId: z.coerce.number().int().positive().optional(),
  environmentId: z.coerce.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED']).optional(),
  physicalState: z.enum(['GOOD', 'REGULAR', 'DAMAGED', 'DISPOSED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
