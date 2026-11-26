import { userRepository } from '../repositories/user.repository.js';
import { comparePassword } from '../utils/password.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

const publicUserFields = (user) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  shift: user.shift,
  imageUrl: user.imageUrl,
  phone: user.phone,
  document: user.document,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
});

/**
 * RN-AUTH-05: el par de tokens lleva el identificador de sesión del usuario (`sv`).
 * Al cerrar sesión se incrementa en la base y todos los tokens anteriores dejan de valer.
 */
const tokenPayload = (user) => ({
  userId: user.id,
  email: user.email,
  role: user.role,
  fullName: user.fullName,
  sv: user.sessionVersion ?? 0,
});

const invalidCredentials = () =>
  new AppError('Credenciales inválidas', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');

export const authService = {
  async login({ email, password }) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw invalidCredentials();
    }

    const isValid = await comparePassword(password, user.passwordHash);

    // RN-AUTH-03: una cuenta desactivada se rechaza exactamente igual que una contraseña
    // incorrecta, para que el intento de acceso no revele que el correo existe.
    if (!isValid || !user.isActive) {
      throw invalidCredentials();
    }

    await userRepository.updateLastLogin(user.id);

    const tokens = generateTokens(tokenPayload(user));

    return {
      user: publicUserFields(user),
      ...tokens,
    };
  },

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token requerido', HTTP_STATUS.BAD_REQUEST, 'MISSING_TOKEN');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Refresh token inválido', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
    }

    const user = await userRepository.findAuthSession(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('Usuario no encontrado o inactivo', HTTP_STATUS.UNAUTHORIZED, 'USER_INVALID');
    }

    // RN-AUTH-05: un token emitido antes del último cierre de sesión ya no renueva.
    if ((decoded.sv ?? 0) !== user.sessionVersion) {
      throw new AppError('Refresh token inválido', HTTP_STATUS.UNAUTHORIZED, 'INVALID_TOKEN');
    }

    const tokens = generateTokens(tokenPayload(user));

    return {
      user: publicUserFields(user),
      ...tokens,
    };
  },

  /**
   * RN-AUTH-04: cerrar sesión termina el par de tokens en el servidor, no solo en el
   * navegador. Se identifica al usuario por su propia credencial de refresco para que
   * el cierre funcione aunque el token de acceso ya haya vencido, y un token ilegible
   * o vencido no revoca nada: no hay sesión que proteger.
   */
  async logout(refreshToken) {
    if (!refreshToken) return;

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    await userRepository.incrementSessionVersion(decoded.userId);
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }
    return { user: publicUserFields(user) };
  },
};
