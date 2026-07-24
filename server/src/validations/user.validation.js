import { z } from 'zod';

export const createUserSchema = z
  .object({
    fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    email: z.string().email('Correo inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: z.enum(['ADMIN', 'INSTRUCTOR'], {
      errorMap: () => ({ message: 'Rol inválido' }),
    }),
    shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
      errorMap: () => ({ message: 'Jornada inválida' }),
    }).optional(),
    imageUrl: z.string().url('URL de imagen inválida').optional(),
    phone: z.string().optional(),
    document: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => data.role !== 'INSTRUCTOR' || data.shift !== undefined,
    {
      message: 'La jornada es obligatoria para instructores',
      path: ['shift'],
    }
  );

export const updateUserSchema = z.object({
  fullName: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
    errorMap: () => ({ message: 'Jornada inválida' }),
  }).optional(),
  imageUrl: z.string().url('URL de imagen inválida').optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'INSTRUCTOR']).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
