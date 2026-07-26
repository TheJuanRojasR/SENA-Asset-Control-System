import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createInventorySchema,
  updateInventorySchema,
  inventoryIdParamSchema,
  listInventoryQuerySchema,
  assemblySchema,
} from '../validations/inventory.validation.js';

const router = Router();

const readAccess = [authenticate, authorize('ADMIN', 'INSTRUCTOR')];
const writeAccess = [authenticate, authorize('ADMIN')];

router.get('/low-stock', ...readAccess, inventoryController.lowStock);
router.get('/', ...readAccess, validateRequest(listInventoryQuerySchema), inventoryController.list);
router.get(
  '/:id',
  ...readAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.getById
);
router.post('/', ...writeAccess, validateBody(createInventorySchema), inventoryController.create);
router.put(
  '/:id',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  validateBody(updateInventorySchema),
  inventoryController.update
);
router.delete(
  '/:id/hard',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.hardRemove
);
router.delete(
  '/:id',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.remove
);
router.get(
  '/:id/detail',
  ...readAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.detail
);
router.post(
  '/:id/assemble',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  validateBody(assemblySchema),
  inventoryController.assemble
);
router.post(
  '/:id/disassemble',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  validateBody(assemblySchema),
  inventoryController.disassemble
);

export default router;
