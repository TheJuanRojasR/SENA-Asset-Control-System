import { userRepository } from '../repositories/user.repository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
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
  documentType: user.documentType,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const userNotFound = () =>
  new AppError('Usuario no encontrado', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');

/**
 * RN-USR-10 / AC-USR-06-1: el último administrador activo no se puede desactivar ni eliminar.
 * El conteo excluye al propio usuario: si no queda ningún otro ADMIN activo, la operación se
 * rechaza con 409. Un instructor nunca pasa por esta comprobación.
 */
async function assertNotLastActiveAdmin(user) {
  if (user.role !== 'ADMIN' || !user.isActive) return;

  const otherActiveAdmins = await userRepository.countActiveAdmins(user.id);
  if (otherActiveAdmins === 0) {
    throw new AppError(
      'No se puede desactivar el único administrador activo',
      HTTP_STATUS.CONFLICT,
      'LAST_ADMIN'
    );
  }
}

export const userService = {
  async createUser(adminId, data) {
    // RN-USR-01 / RN-USR-09 / AC-USR-06-2: la aplicación nunca crea administradores.
    // El primer ADMIN nace fuera de la aplicación (seed o base de datos).
    if (data.role === 'ADMIN') {
      throw new AppError(
        'La aplicación no crea administradores',
        HTTP_STATUS.FORBIDDEN,
        'ADMIN_CREATION_NOT_ALLOWED'
      );
    }

    const exists = await userRepository.existsActiveEmail(data.email);
    if (exists) {
      throw new AppError('Ya existe un usuario con ese correo', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
    }

    const { password, role, ...userData } = data;
    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      ...userData,
      role: 'INSTRUCTOR',
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
    if (!user) throw userNotFound();
    return { user: publicUserFields(user) };
  },

  async updateUser(id, data) {
    const existing = await userRepository.findById(id);
    if (!existing) throw userNotFound();

    if (data.email) {
      const exists = await userRepository.existsActiveEmail(data.email, id);
      if (exists) {
        throw new AppError(
          'Ya existe un usuario con ese correo',
          HTTP_STATUS.CONFLICT,
          'EMAIL_EXISTS'
        );
      }
    }

    // AC-USR-02-3: la edición del padrón no toca la contraseña ni la sesión.
    const user = await userRepository.update(id, data);
    return { user: publicUserFields(user) };
  },

  /**
   * AC-USR-04-1 y AC-USR-04-2: el cambio propio exige la contraseña actual. RN-USR-06: al
   * aceptarse, cierra todas las sesiones del usuario, incluida la actual (RN-AUTH-05).
   */
  async changeOwnPassword(userId, { currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw userNotFound();

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError(
        'La contraseña actual no coincide',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_CURRENT_PASSWORD'
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePasswordAndInvalidateSessions(userId, passwordHash);

    return { message: 'Contraseña actualizada correctamente' };
  },

  /**
   * AC-USR-05-1: el administrador fija una contraseña nueva sin conocer la anterior.
   * AC-USR-05-2: no se envía ningún correo; la operación no depende de un canal externo.
   * RN-USR-07 / RN-AUTH-05: cierra todas las sesiones del instructor.
   */
  async resetPassword(targetId, { newPassword }) {
    const user = await userRepository.findById(targetId);
    if (!user) throw userNotFound();

    const passwordHash = await hashPassword(newPassword);
    const updated = await userRepository.updatePasswordAndInvalidateSessions(targetId, passwordHash);

    return { user: publicUserFields(updated) };
  },

  /**
   * AC-USR-03-4 / AC-USR-03-1: reactivar devuelve el acceso; desactivar lo quita y corta las
   * sesiones vigentes, sin tocar préstamos ni solicitudes (RN-USR-05 / RN-USR-11).
   */
  async setUserStatus(id, { isActive }) {
    const user = await userRepository.findById(id);
    if (!user) throw userNotFound();

    if (user.isActive === isActive) {
      return { user: publicUserFields(user) };
    }

    if (!isActive) {
      await assertNotLastActiveAdmin(user);
    }

    const updated = await userRepository.setActive(id, isActive);
    return { user: publicUserFields(updated) };
  },

  /**
   * RN-USR-08 / AC-USR-02-4: un instructor con historial no se elimina, se desactiva y sigue
   * figurando en el padrón. Sin historial se conserva el borrado lógico actual.
   * RN-USR-10: el último administrador activo no se elimina.
   */
  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw userNotFound();

    await assertNotLastActiveAdmin(user);

    const hasHistory = await userRepository.hasHistory(id);
    if (hasHistory) {
      const updated = await userRepository.setActive(id, false);
      return {
        user: publicUserFields(updated),
        deactivated: true,
        message:
          'El instructor tiene historial: se desactivó en lugar de eliminarse',
      };
    }

    await userRepository.softDelete(id);
    return {
      deleted: true,
      message: 'Usuario eliminado correctamente',
    };
  },
};
