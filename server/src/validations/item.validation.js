import { z } from 'zod';

const componentSchema = z.object({
  childItemId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
  isRequired: z.boolean().default(true),
});

export const createItemSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(100),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  description: z.string().optional(),
  categoryId: z.number().int().positive('La categoría es requerida'),
  minStock: z.number().int().nonnegative().default(0),
  unit: z.string().min(1).max(50).default('UNIDAD'),
  isConsumable: z.boolean().default(false),
  imageUrl: z.string().url('URL de imagen inválida').optional(),
  initialQty: z.number().int().positive().default(1),
  components: z.array(componentSchema).optional(),
});

export const updateItemSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  minStock: z.number().int().nonnegative().optional(),
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
