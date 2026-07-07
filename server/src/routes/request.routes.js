import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createRequestSchema,
  rejectRequestSchema,
  requestIdParamSchema,
  listRequestsQuerySchema,
} from '../validations/request.validation.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('INSTRUCTOR'), validateBody(createRequestSchema), requestController.create);
router.get(
  '/',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(listRequestsQuerySchema),
  requestController.list
);
router.get(
  '/:id',
  authorize('ADMIN', 'INSTRUCTOR'),
  validateRequest(requestIdParamSchema),
  requestController.getById
);
router.put(
  '/:id/approve',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  requestController.approve
);
router.put(
  '/:id/reject',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  validateBody(rejectRequestSchema),
  requestController.reject
);
router.put(
  '/:id/pack',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  requestController.pack
);
router.put(
  '/:id/deliver',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  requestController.deliver
);
router.put(
  '/:id/complete',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  requestController.complete
);
router.delete(
  '/:id',
  authorize('INSTRUCTOR'),
  validateRequest(requestIdParamSchema),
  requestController.cancel
);

export default router;
