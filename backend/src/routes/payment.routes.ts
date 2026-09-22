import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPaymentOrder,
  createDirectPaymentOrder,
  verifyPayment,
  initiateRefund,
  getPaymentById,
  getPaymentByOrder,
  handleWebhook,
} from '../controllers/payment.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

console.log('[PAYMENT ROUTES] Registering payment routes...');
router.get('/order/:orderId', authMiddleware, getPaymentByOrder);
router.get('/:id', authMiddleware, getPaymentById);
router.post('/create-order', authMiddleware, createPaymentOrder);
router.post('/create-direct', authMiddleware, createDirectPaymentOrder);
router.post('/verify', authMiddleware, verifyPayment);
router.post('/refund', authMiddleware, adminMiddleware, initiateRefund);
router.post('/webhook', handleWebhook);
console.log('[PAYMENT ROUTES] Registered: POST /create-direct');

export default router;
