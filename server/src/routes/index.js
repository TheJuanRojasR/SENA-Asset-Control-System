import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente' });
});

export default router;
