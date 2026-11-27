import { Router } from 'express';
import { loanController } from '../controllers/loan.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/role.js';
import { validateBody, validateRequest } from '../middlewares/validateRequest.js';
import { returnUnitsSchema, listReturnsQuerySchema } from '../validations/loan.validation.js';

const router = Router();

router.use(authenticate);

// Consulta de préstamos activos: ADMIN ve todos; INSTRUCTOR solo los suyos (RN-PRE-17).
router.get('/', authorize('ADMIN', 'INSTRUCTOR'), loanController.list);

// RN-PRE-04 / RN-PRE-05: registrar devolución es acción del administrador.
router.post('/return', authorize('ADMIN'), validateBody(returnUnitsSchema), loanController.returnUnits);

// RN-MOV-01 / US-PRE-06: historial de devoluciones (administrador).
router.get('/returns', authorize('ADMIN'), validateRequest(listReturnsQuerySchema), loanController.listReturns);

// AC-PRE-02-10: unidades por devolver de una solicitud.
router.get('/pending', authorize('ADMIN'), loanController.listPending);

export default router;
