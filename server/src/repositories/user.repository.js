import { prisma } from '../config/database.js';

const defaultSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  shift: true,
  imageUrl: true,
  phone: true,
  document: true,
  documentType: true,
  isActive: true,
  isDeleted: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};

export const userRepository = {
  async findById(id) {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: defaultSelect,
    });
  },

  async findByIdWithPassword(id) {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
  },

  async findByEmail(email) {
    return prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  },

  async findByEmailWithPassword(email) {
    return prisma.user.findFirst({
      where: { email, isDeleted: false },
    });
  },

  /**
   * Incluye `sessionVersion` (RN-AUTH-05), que no se expone en las respuestas de la API.
   */
  async findAuthSession(id) {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        sessionVersion: true,
      },
    });
  },

  /**
   * Invalida el par de tokens emitido hasta ahora incrementando el identificador de
   * sesión del usuario (RN-AUTH-05, cierre de sesión).
   */
  async incrementSessionVersion(id) {
    return prisma.user.update({
      where: { id },
      data: { sessionVersion: { increment: 1 } },
      select: { id: true, sessionVersion: true },
    });
  },

  /**
   * RN-USR-06 / RN-USR-07 / RN-AUTH-05: cambiar o restablecer la contraseña cierra todas las
   * sesiones del usuario, incluida la actual. La fila se actualiza una sola vez.
   */
  async updatePasswordAndInvalidateSessions(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
      select: defaultSelect,
    });
  },

  /**
   * RN-USR-05 / RN-AUTH-05: desactivar impide nuevas sesiones y corta las vigentes.
   * Reactivar no incrementa la versión: los tokens viejos ya quedaron inválidos al desactivar.
   */
  async setActive(id, isActive) {
    return prisma.user.update({
      where: { id },
      data: {
        isActive,
        ...(isActive ? {} : { sessionVersion: { increment: 1 } }),
      },
      select: defaultSelect,
    });
  },

  async create(data) {
    return prisma.user.create({
      data,
      select: defaultSelect,
    });
  },

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: defaultSelect,
    });
  },

  async softDelete(id) {
    return prisma.user.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
      select: defaultSelect,
    });
  },

  async existsActiveEmail(email, excludeId) {
    const where = { email, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    const count = await prisma.user.count({ where });
    return count > 0;
  },

  async count(filters = {}) {
    return prisma.user.count({ where: buildWhere(filters) });
  },

  async countActiveAdmins(excludeId) {
    const where = { role: 'ADMIN', isActive: true, isDeleted: false };
    if (excludeId) where.id = { not: excludeId };
    return prisma.user.count({ where });
  },

  /**
   * RN-USR-08 / AC-USR-02-4: un instructor con historial no se elimina. El historial que
   * importa es el que lo ata a equipos: solicitudes hechas, movimientos y devoluciones.
   */
  async hasHistory(id) {
    const counts = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            requestsMade: true,
            movements: true,
            returnedUnits: true,
          },
        },
      },
    });
    if (!counts) return false;
    return (
      counts._count.requestsMade > 0 ||
      counts._count.movements > 0 ||
      counts._count.returnedUnits > 0
    );
  },

  async findMany(filters = {}, { page = 1, limit = 20 } = {}) {
    return prisma.user.findMany({
      where: buildWhere(filters),
      select: defaultSelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  async updateLastLogin(id) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
      select: defaultSelect,
    });
  },
};

function buildWhere(filters) {
  const where = { isDeleted: false };

  if (filters.role) where.role = filters.role;
  if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { document: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}
