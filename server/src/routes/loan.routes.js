import { Router } from 'express';
import { loanController } from '../controllers/loan.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { returnUnitsSchema } from '../validations/loan.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'INSTRUCTOR'), loanController.list);
router.post(
  '/return',
  authorize('ADMIN'),
  validateBody(returnUnitsSchema),
  loanController.returnUnits
);

export default router;
