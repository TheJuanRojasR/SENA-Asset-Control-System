import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listCategoriesQuerySchema = z.object({
  search: z.string().optional(),
});
