import { environmentRepository } from '../repositories/environment.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

// RN-CTX-09: el Ambiente 104 es el inventario base y no se elimina. El seed lo crea con
// este código (RN-CTX-08: es la ubicación por defecto de toda unidad nueva).
export const BASE_ENVIRONMENT_CODE = '104';

const publicEnvironmentFields = (environment) => ({
  id: environment.id,
  code: environment.code,
  name: environment.name,
  location: environment.location,
  isActive: environment.isActive,
  // AC-AMB-02-2: cantidad de unidades ubicadas actualmente en el ambiente.
  unitsCount: environment._count?.inventoryUnits ?? 0,
  createdAt: environment.createdAt,
  updatedAt: environment.updatedAt,
});

export const environmentService = {
  async createEnvironment(data) {
    const exists = await environmentRepository.existsActiveCode(data.code);
    if (exists) {
      throw new AppError('Ya existe un ambiente con ese código', HTTP_STATUS.CONFLICT, 'CODE_EXISTS');
    }

    const name = data.name.trim();
    // RN-CTX-11: el nombre del ambiente es único.
    if (await environmentRepository.existsActiveName(name)) {
      throw new AppError(
        'Ya existe un ambiente con ese nombre',
        HTTP_STATUS.CONFLICT,
        'ENVIRONMENT_NAME_EXISTS'
      );
    }

    const environment = await environmentRepository.create({ ...data, name });
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

    const updateData = { ...data };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
      // RN-CTX-11 / AC-AMB-04-2: renombrar a un nombre ya usado se rechaza.
      if (await environmentRepository.existsActiveName(updateData.name, id)) {
        throw new AppError(
          'Ya existe un ambiente con ese nombre',
          HTTP_STATUS.CONFLICT,
          'ENVIRONMENT_NAME_EXISTS'
        );
      }
    }

    const updated = await environmentRepository.update(id, updateData);
    return { environment: publicEnvironmentFields(updated) };
  },

  async deleteEnvironment(id) {
    const environment = await environmentRepository.findById(id);
    if (!environment) {
      throw new AppError('Ambiente no encontrado', HTTP_STATUS.NOT_FOUND, 'ENVIRONMENT_NOT_FOUND');
    }

    // RN-CTX-09 / AC-AMB-03-2: el ambiente base no se elimina.
    if (environment.code === BASE_ENVIRONMENT_CODE) {
      throw new AppError(
        'No se puede eliminar el ambiente base del inventario',
        HTTP_STATUS.CONFLICT,
        'BASE_ENVIRONMENT'
      );
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
