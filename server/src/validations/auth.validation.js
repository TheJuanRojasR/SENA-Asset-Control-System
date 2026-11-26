import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * El token de refresco puede llegar por cookie (camino normal del cliente) o por cuerpo.
 * Por eso el campo es opcional: su ausencia la resuelve el servicio con `MISSING_TOKEN`
 * (AC-AUTH-02-2). Si llega, tiene que ser texto: un número no es «sesión inválida», es
 * «petición mal formada» (AC-AUTH-02-5).
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});
