import { Router } from 'express';
import { movementController } from '../controllers/movement.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { listMovementsQuerySchema } from '../validations/movement.validation.js';

const router = Router();

// RN-MOV-02: el historial es consulta del administrador; el instructor recibe 403.
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateRequest(listMovementsQuerySchema),
  movementController.list
);

export default router;
