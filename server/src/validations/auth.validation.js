import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});
