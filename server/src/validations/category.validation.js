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
  // RN-CTX-02 / AC-CATEG-02-5: todo listado es paginado con su total. El tamaño de página
  // no lo fija la especificación; se usa 100 por defecto para no romper la carga del
  // catálogo completo que hace el cliente, con límite máximo de 100.
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});
