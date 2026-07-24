import { environmentRepository } from '../repositories/environment.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

const publicEnvironmentFields = (environment) => ({
  id: environment.id,
  code: environment.code,
  name: environment.name,
  location: environment.location,
  isActive: environment.isActive,
  createdAt: environment.createdAt,
  updatedAt: environment.updatedAt,
});

export const environmentService = {
  async createEnvironment(data) {
    const exists = await environmentRepository.existsActiveCode(data.code);
    if (exists) {
      throw new AppError('Ya existe un ambiente con ese código', HTTP_STATUS.CONFLICT, 'CODE_EXISTS');
    }

    const environment = await environmentRepository.create(data);
    return { environment: publicEnvironmentFields(environment) };
  },

  async listEnvironments(filters, pagination) {
    const [environments, total] = await Promise.all([
      environmentRepository.findMany(filters, pagination),
      environmentRepository.count(filters),
    ]);

    return {
      data: environments.map(publicEnvironmentFields),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  },

  async getEnvironmentById(id) {
    const environment = await environmentRepository.findById(id);
    if (!environment) {
      throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
    }
    return { environment: publicEnvironmentFields(environment) };
  },

  async updateEnvironment(id, data) {
    const environment = await environmentRepository.findById(id);
    if (!environment) {
      throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
    }

    if (data.code) {
      const exists = await environmentRepository.existsActiveCode(data.code, id);
      if (exists) {
        throw new AppError('Ya existe un ambiente con ese código', HTTP_STATUS.CONFLICT, 'CODE_EXISTS');
      }
    }

    const updated = await environmentRepository.update(id, data);
    return { environment: publicEnvironmentFields(updated) };
  },

  async deleteEnvironment(id) {
    const environment = await environmentRepository.findById(id);
    if (!environment) {
      throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
    }

    const unitsCount = await environmentRepository.countInventoryUnits(id);
    if (unitsCount > 0) {
      throw new AppError(
        'No se puede eliminar un ambiente con unidades de inventario asociadas',
        HTTP_STATUS.CONFLICT,
        'ENVIRONMENT_HAS_UNITS'
      );
    }

    await environmentRepository.softDelete(id);
    return { message: 'Ambiente eliminado correctamente' };
  },
};
