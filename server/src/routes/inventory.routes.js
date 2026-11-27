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
  incompleteAssembliesQuerySchema,
  disposalSchema,
  disposalStartSchema,
  lossSchema,
} from '../validations/inventory.validation.js';

const router = Router();

const readAccess = [authenticate, authorize('ADMIN', 'INSTRUCTOR')];
const writeAccess = [authenticate, authorize('ADMIN')];

router.get('/low-stock', ...readAccess, inventoryController.lowStock);
// RN-INV-10: conjuntos funcionalmente incompletos (antes de /:id).
router.get(
  '/incomplete-assemblies',
  ...writeAccess,
  validateRequest(incompleteAssembliesQuerySchema),
  inventoryController.incompleteAssemblies
);
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
router.post(
  '/:id/restore',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.restore
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
  validateBody(disposalSchema),
  inventoryController.remove
);

// RN-INV-19 / US-INV-09: trámite de baja del equipo del SENA (inicio y confirmación).
router.post(
  '/:id/disposal/start',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  validateBody(disposalStartSchema),
  inventoryController.startDisposal
);
router.post(
  '/:id/disposal/confirm',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  inventoryController.confirmDisposal
);

// RN-INV-13 / AC-INV-08-5: pérdida de una unidad que no está prestada.
router.post(
  '/:id/loss',
  ...writeAccess,
  validateRequest(inventoryIdParamSchema),
  validateBody(lossSchema),
  inventoryController.registerLoss
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
