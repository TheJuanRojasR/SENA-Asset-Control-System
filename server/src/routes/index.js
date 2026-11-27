import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import environmentRoutes from './environment.routes.js';
import categoryRoutes from './category.routes.js';
import itemRoutes from './item.routes.js';
import catalogRoutes from './catalog.routes.js';
import inventoryRoutes from './inventory.routes.js';
import requestRoutes from './request.routes.js';
import loanRoutes from './loan.routes.js';
import movementRoutes from './movement.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/environments', environmentRoutes);
router.use('/categories', categoryRoutes);
router.use('/items', itemRoutes);
router.use('/catalog', catalogRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/requests', requestRoutes);
router.use('/loans', loanRoutes);
router.use('/movements', movementRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente' });
});

export default router;
