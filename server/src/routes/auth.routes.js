import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validateRequest.js';
import { loginSchema, refreshTokenSchema } from '../validations/auth.validation.js';

const router = Router();

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
