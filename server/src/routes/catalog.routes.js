import { Router } from 'express';
import { catalogController } from '../controllers/catalog.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { catalogQuerySchema } from '../validations/catalog.validation.js';

const router = Router();

// RN-CTX-05: los dos actores consultan el catálogo; la escritura no vive en este módulo.
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(catalogQuerySchema),
  catalogController.list
);

export default router;
