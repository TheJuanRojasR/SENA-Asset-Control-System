import { Router } from 'express';
import { environmentController } from '../controllers/environment.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  environmentIdParamSchema,
  listEnvironmentsQuerySchema,
} from '../validations/environment.validation.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(listEnvironmentsQuerySchema),
  environmentController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(environmentIdParamSchema),
  environmentController.getById
);
router.post('/', authorize('ADMIN'), validateBody(createEnvironmentSchema), environmentController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validateRequest(environmentIdParamSchema),
  validateBody(updateEnvironmentSchema),
  environmentController.update
);
router.delete('/:id', authorize('ADMIN'), validateRequest(environmentIdParamSchema), environmentController.remove);

export default router;
