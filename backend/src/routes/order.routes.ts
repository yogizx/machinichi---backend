import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  delayOrder,
  getAllOrders,
  getOrderStatusCounts,
  addTracking,
} from '../controllers/order.controller';
import { downloadInvoice, downloadShippingLabel } from '../controllers/orderPdf.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllOrders);
router.get('/admin/status-counts', authMiddleware, adminMiddleware, getOrderStatusCounts);
router.get('/track/:orderId', getOrderById); // public tracking by orderId string
router.get('/:id/invoice', authMiddleware, downloadInvoice);
router.get('/:id/label', authMiddleware, adminMiddleware, downloadShippingLabel);
router.get('/:id', authMiddleware, getOrderById);
router.put('/cancel/:id', authMiddleware, cancelOrder);
router.put('/status/:id', authMiddleware, adminMiddleware, updateOrderStatus);
router.post('/delay/:id', authMiddleware, adminMiddleware, delayOrder);
router.put('/tracking/:id', authMiddleware, adminMiddleware, addTracking);

export default router;
