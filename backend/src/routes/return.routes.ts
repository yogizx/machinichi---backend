import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createReturnRequest,
  getMyReturnRequests,
  getAllReturnRequests,
  getReturnById,
  updateReturnStatus,
  cancelReturnRequest,
} from '../controllers/return.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-requests', authMiddleware, getMyReturnRequests);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllReturnRequests);
router.get('/:id', authMiddleware, getReturnById);
router.post('/', authMiddleware, createReturnRequest);
router.put('/status/:id', authMiddleware, adminMiddleware, updateReturnStatus);
router.put('/cancel/:id', authMiddleware, cancelReturnRequest);

export default router;
