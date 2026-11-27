import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { dashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

// RN-PAN-01 / RN-CTX-05: un panel por rol.
router.get('/admin', authorize('ADMIN'), dashboardController.admin);
router.get('/instructor', authorize('INSTRUCTOR'), dashboardController.instructor);

export default router;
