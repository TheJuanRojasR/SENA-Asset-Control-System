import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import environmentRoutes from './environment.routes.js';
import categoryRoutes from './category.routes.js';
import itemRoutes from './item.routes.js';
import inventoryRoutes from './inventory.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/environments', environmentRoutes);
router.use('/categories', categoryRoutes);
router.use('/items', itemRoutes);
router.use('/inventory', inventoryRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente' });
});

export default router;
