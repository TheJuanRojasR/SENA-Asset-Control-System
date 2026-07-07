import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from '../validations/category.validation.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(listCategoriesQuerySchema),
  categoryController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(categoryIdParamSchema),
  categoryController.getById
);
router.post('/', authorize('ADMIN'), validateBody(createCategorySchema), categoryController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validateRequest(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  categoryController.update
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validateRequest(categoryIdParamSchema),
  categoryController.remove
);

export default router;
