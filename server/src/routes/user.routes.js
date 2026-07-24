import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from '../validations/user.validation.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.post('/', validateBody(createUserSchema), userController.create);
router.get('/', validateRequest(listUsersQuerySchema), userController.list);
router.get('/:id', validateRequest(userIdParamSchema), userController.getById);
router.put('/:id', validateRequest(userIdParamSchema), validateBody(updateUserSchema), userController.update);
router.delete('/:id', validateRequest(userIdParamSchema), userController.remove);

export default router;
