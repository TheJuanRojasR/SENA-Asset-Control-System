import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createRequestSchema,
  updateRequestSchema,
  approveRequestSchema,
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
// RN-SOL-05: el instructor modifica su solicitud mientras está PENDIENTE.
router.put(
  '/:id',
  authorize('INSTRUCTOR'),
  validateRequest(requestIdParamSchema),
  validateBody(updateRequestSchema),
  requestController.update
);
router.put(
  '/:id/approve',
  authorize('ADMIN'),
  validateRequest(requestIdParamSchema),
  validateBody(approveRequestSchema),
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
