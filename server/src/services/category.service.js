import { categoryRepository } from '../repositories/category.repository.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';

export const categoryService = {
  async listCategories(search) {
    const categories = await categoryRepository.findManyActive(search);
    return { data: categories };
  },

  async getCategoryById(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Categoría no encontrada', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
    }
    return { category };
  },

  async createCategory(data) {
    const exists = await categoryRepository.findByName(data.name);
    if (exists) {
      throw new AppError('Ya existe una categoría con ese nombre', HTTP_STATUS.CONFLICT, 'CATEGORY_NAME_EXISTS');
    }

    const category = await categoryRepository.create(data);
    return { category };
  },

  async updateCategory(id, data) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Categoría no encontrada', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
    }

    if (data.name) {
      const exists = await categoryRepository.findByName(data.name, id);
      if (exists) {
        throw new AppError('Ya existe una categoría con ese nombre', HTTP_STATUS.CONFLICT, 'CATEGORY_NAME_EXISTS');
      }
    }

    const updated = await categoryRepository.update(id, data);
    return { category: updated };
  },

  async deleteCategory(id) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Categoría no encontrada', HTTP_STATUS.NOT_FOUND, 'CATEGORY_NOT_FOUND');
    }

    const itemsCount = await categoryRepository.countItems(id);
    if (itemsCount > 0) {
      throw new AppError(
        'No se puede eliminar la categoría porque tiene ítems asociados',
        HTTP_STATUS.CONFLICT,
        'CATEGORY_HAS_ITEMS'
      );
    }

    await categoryRepository.softDelete(id);
    return { message: 'Categoría eliminada correctamente' };
  },
};
