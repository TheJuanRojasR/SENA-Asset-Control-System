import { z } from 'zod';

const componentSchema = z.object({
  childItemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  isRequired: z.boolean().default(true),
});

export const createItemSchema = z
  .object({
    code: z.string().min(1, 'El código es requerido').max(100),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
    description: z.string().optional(),
    categoryId: z.number().int().positive('La categoría es requerida'),
    // RN-INV-44: el umbral es opcional; sin umbral no hay alerta ni valor por defecto.
    minStock: z.number().int().nonnegative().nullable().optional(),
    // RN-INV-12: el consumible declara su unidad de medida (obligatoria solo para él).
    unit: z.string().min(1).max(50).optional(),
    isConsumable: z.boolean().default(false),
    // RN-INV-07 / RN-INV-46: tenencia del elemento; solo DONATED puede ser consumible.
    ownership: z.enum(['SENA', 'DONATED']).optional().default('SENA'),
    imageUrl: z.string().url('URL de imagen inválida').optional(),
    // RN-INV-06: cantidad inicial del consumible. Un serializable NO autogenera unidades
    // (RN-INV-40), así que este valor no crea seriales.
    initialQty: z.number().int().nonnegative().default(0),
    components: z.array(componentSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isConsumable && (!data.unit || !data.unit.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: 'La unidad de medida es obligatoria para un consumible',
      });
    }
  });

export const updateItemSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  minStock: z.number().int().nonnegative().nullable().optional(),
  unit: z.string().min(1).max(50).optional(),
  isConsumable: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  components: z.array(componentSchema).optional(),
});

export const itemIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listItemsQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
