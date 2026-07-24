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

export const authService = {
  async login({ email, password }) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError('Credenciales inválidas', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Usuario inactivo', HTTP_STATUS.UNAUTHORIZED, 'USER_INACTIVE');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Credenciales inválidas', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    await userRepository.updateLastLogin(user.id);

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

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

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new AppError('Usuario no encontrado o inactivo', HTTP_STATUS.UNAUTHORIZED, 'USER_INVALID');
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    return {
      user: publicUserFields(user),
      ...tokens,
    };
  },

  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }
    return { user: publicUserFields(user) };
  },
};
