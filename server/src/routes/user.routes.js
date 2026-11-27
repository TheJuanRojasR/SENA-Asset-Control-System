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
  changeOwnPasswordSchema,
  resetPasswordSchema,
  userStatusSchema,
} from '../validations/user.validation.js';

const router = Router();

// AC-USR-04-1 / RN-USR-04: el cambio de la propia contraseña es del usuario autenticado,
// sea ADMIN o INSTRUCTOR. Por eso va antes del bloqueo administrativo.
router.patch(
  '/me/password',
  authenticate,
  validateBody(changeOwnPasswordSchema),
  userController.changeOwnPassword
);

// RN-CTX-05: escribir el padrón es acción administrativa; el instructor recibe 403.
router.use(authenticate, authorize('ADMIN'));

router.post('/', validateBody(createUserSchema), userController.create);
router.get('/', validateRequest(listUsersQuerySchema), userController.list);
router.get('/:id', validateRequest(userIdParamSchema), userController.getById);
router.put(
  '/:id',
  validateRequest(userIdParamSchema),
  validateBody(updateUserSchema),
  userController.update
);
// AC-USR-05-1: restablecimiento de contraseña por el administrador.
router.patch(
  '/:id/password',
  validateRequest(userIdParamSchema),
  validateBody(resetPasswordSchema),
  userController.resetPassword
);
// AC-USR-03-4 / AC-USR-06-1: activar o desactivar.
router.patch(
  '/:id/status',
  validateRequest(userIdParamSchema),
  validateBody(userStatusSchema),
  userController.updateStatus
);
router.delete('/:id', validateRequest(userIdParamSchema), userController.remove);

export default router;
