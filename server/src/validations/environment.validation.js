import { z } from 'zod';

export const createEnvironmentSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(50, 'El código no puede superar 50 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre no puede superar 255 caracteres'),
  location: z.string().max(255, 'La ubicación no puede superar 255 caracteres').optional(),
});

export const updateEnvironmentSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  location: z.string().max(255).optional(),
});

export const environmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listEnvironmentsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
