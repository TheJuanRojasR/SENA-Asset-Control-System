import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { notificationController } from '../controllers/notification.controller.js';
import { listNotificationsQuerySchema } from '../validations/notification.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(listNotificationsQuerySchema), notificationController.list);

export default router;
