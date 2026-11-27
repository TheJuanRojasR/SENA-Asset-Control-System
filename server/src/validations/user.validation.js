import { z } from 'zod';

/**
 * RN-USR-02: el alta exige seis datos obligatorios —nombre, tipo de documento, número de
 * documento, teléfono celular, turno y correo—; la foto es opcional.
 * RN-USR-09 / AC-USR-06-2: la aplicación nunca crea administradores; el rol ADMIN se rechaza
 * en el servicio con 403 (el esquema lo acepta para poder dar ese código y no un 400 genérico).
 * AC-USR-02-3: editar los datos del padrón no toca la contraseña; por eso `updateUserSchema`
 * no incluye `password` ni `isActive` (el estado tiene su propio endpoint).
 */
export const createUserSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z
    .enum(['ADMIN', 'INSTRUCTOR'], {
      errorMap: () => ({ message: 'Rol inválido' }),
    })
    .optional()
    .default('INSTRUCTOR'),
  shift: z.enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
    errorMap: () => ({ message: 'Jornada inválida' }),
  }),
  documentType: z.string().min(2, 'El tipo de documento es obligatorio'),
  document: z.string().min(1, 'El número de documento es obligatorio'),
  phone: z.string().min(1, 'El teléfono celular es obligatorio'),
  imageUrl: z.string().url('URL de imagen inválida').optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(3).optional(),
  email: z.string().email().optional(),
  shift: z
    .enum(['MORNING', 'AFTERNOON', 'NIGHT'], {
      errorMap: () => ({ message: 'Jornada inválida' }),
    })
    .optional(),
  documentType: z.string().min(2).optional(),
  document: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  imageUrl: z.string().url('URL de imagen inválida').optional(),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria'),
  newPassword: z.string().min(6, 'La contraseña nueva debe tener al menos 6 caracteres'),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'La contraseña nueva debe tener al menos 6 caracteres'),
});

export const userStatusSchema = z.object({
  isActive: z.boolean({ errorMap: () => ({ message: 'isActive debe ser booleano' }) }),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID inválido'),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'INSTRUCTOR']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
