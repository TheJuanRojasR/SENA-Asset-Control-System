import { Router } from 'express';
import { itemController } from '../controllers/item.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import {
  createItemSchema,
  updateItemSchema,
  itemIdParamSchema,
  listItemsQuerySchema,
  adjustStockSchema,
} from '../validations/item.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'INSTRUCTOR'), validateRequest(listItemsQuerySchema), itemController.list);
router.get('/:id', authorize('ADMIN', 'INSTRUCTOR'), validateRequest(itemIdParamSchema), itemController.getById);
router.post('/', authorize('ADMIN'), validateBody(createItemSchema), itemController.create);
router.put(
  '/:id',
  authorize('ADMIN'),
  validateRequest(itemIdParamSchema),
  validateBody(updateItemSchema),
  itemController.update
);
// RN-MOV-01: ajuste de cantidad de un consumible (deja movimiento solo si cambia).
router.patch(
  '/:id/stock',
  authorize('ADMIN'),
  validateRequest(itemIdParamSchema),
  validateBody(adjustStockSchema),
  itemController.adjustStock
);

// RN-INV-45: el elemento no se elimina físicamente; esta operación es la baja (estado).
router.delete('/:id', authorize('ADMIN'), validateRequest(itemIdParamSchema), itemController.remove);

export default router;
