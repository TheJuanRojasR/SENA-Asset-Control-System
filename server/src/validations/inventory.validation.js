import { z } from 'zod';

export const createInventorySchema = z.object({
  itemId: z.number().int().positive('El ítem es obligatorio'),
  // RN-INV-40 / AC-INV-01-3: el serial lo registra el administrador; no se autogenera y
  // no puede venir vacío ni de solo espacios.
  serialNumber: z
    .string()
    .trim()
    .min(1, 'El serial es obligatorio')
    .max(255, 'El serial no puede superar 255 caracteres'),
  environmentId: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado de unidad inválido' }),
  }).optional(),
  // RN-INV-30: lista cerrada de seis estados físicos.
  physicalState: z.enum(['OPERATIVO', 'DESCARGADO_AGOTADO', 'CON_FALLA', 'AVERIADO', 'EN_MANTENIMIENTO', 'DADO_DE_BAJA'], {
    errorMap: () => ({ message: 'Estado físico inválido' }),
  }).optional(),
  notes: z.string().optional(),
  // RN-INV-20: tenencia de la unidad física (por defecto SENA).
  ownership: z.enum(['SENA', 'DONATED']).optional(),
});

export const updateInventorySchema = z.object({
  environmentId: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'LOANED', 'MAINTENANCE', 'DISPOSED'], {
    errorMap: () => ({ message: 'Estado de unidad inválido' }),
  }).optional(),
  // RN-INV-30: lista cerrada de seis estados físicos.
  physicalState: z.enum(['OPERATIVO', 'DESCARGADO_AGOTADO', 'CON_FALLA', 'AVERIADO', 'EN_MANTENIMIENTO', 'DADO_DE_BAJA'], {
    errorMap: () => ({ message: 'Estado físico inválido' }),
  }).optional(),
  notes: z.string().optional(),
  ownership: z.enum(['SENA', 'DONATED']).optional(),
});

export const incompleteAssembliesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
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
  physicalState: z.enum(['OPERATIVO', 'DESCARGADO_AGOTADO', 'CON_FALLA', 'AVERIADO', 'EN_MANTENIMIENTO', 'DADO_DE_BAJA']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
