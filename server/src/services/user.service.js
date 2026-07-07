import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.js';
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
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const userService = {
  async createUser(adminId, data) {
    const exists = await userRepository.existsActiveEmail(data.email);
    if (exists) {
      throw new AppError('Ya existe un usuario con ese correo', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
    }

    const { password, ...userData } = data;
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      ...userData,
      passwordHash,
    });

    return { user: publicUserFields(user) };
  },

  async listUsers(filters, pagination) {
    const [users, total] = await Promise.all([
      userRepository.findMany(filters, pagination),
      userRepository.count(filters),
    ]);

    return {
      data: users.map(publicUserFields),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }
    return { user: publicUserFields(user) };
  },

  async updateUser(id, data) {
    if (data.email) {
      const exists = await userRepository.existsActiveEmail(data.email, id);
      if (exists) {
        throw new AppError('Ya existe un usuario con ese correo', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
      }
    }

    const updateData = { ...data };
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
      delete updateData.password;
    }

    const user = await userRepository.update(id, updateData);
    return { user: publicUserFields(user) };
  },

  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    if (user.role === 'ADMIN') {
      const adminCount = await userRepository.count({ role: 'ADMIN', isActive: true });
      if (adminCount <= 1) {
        throw new AppError(
          'No se puede eliminar el único administrador activo',
          HTTP_STATUS.CONFLICT,
          'LAST_ADMIN'
        );
      }
    }

    await userRepository.softDelete(id);
    return { message: 'Usuario eliminado correctamente' };
  },
};
