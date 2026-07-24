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
router.delete('/:id', authorize('ADMIN'), validateRequest(itemIdParamSchema), itemController.remove);
router.delete('/:id/hard', authorize('ADMIN'), validateRequest(itemIdParamSchema), itemController.hardRemove);

export default router;
