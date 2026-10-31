import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createReturnRequest,
  checkEligibility,
  getEligibleOrders,
  getMyReturnRequests,
  getAllReturnRequests,
  getReturnStats,
  getReturnById,
  updateReturnStatus,
  cancelReturnRequest,
  moveToReview,
  approveReturn,
  rejectReturn,
  schedulePickup,
  markPickupFailed,
  confirmReceipt,
  inspectReturn,
  processRefund,
  markRefundFailed,
  completeReturn,
  refundReturnRequest,
  addReturnNote,
} from '../controllers/return.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';
import upload from '../middlewares/upload.middleware';

const router = Router();

/* Customer evidence upload — authenticated users only (any role).
 * Works with both Cloudinary and local-disk storage engines. */
router.post('/evidence', authMiddleware, upload.array('files', 5), (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }
  const base = `${req.protocol}://${req.get('host')}`;
  const urls = files.map((f: any) => {
    if (typeof f.path === 'string' && f.path.startsWith('http')) return f.path; // Cloudinary URL
    return `${base}/uploads/${f.filename}`;
  });
  return res.json({ success: true, urls });
});

/* Customer */
router.get('/eligible-orders', authMiddleware, getEligibleOrders);
router.post('/eligibility', authMiddleware, checkEligibility);
router.get('/my-requests', authMiddleware, getMyReturnRequests);

/* Admin */
router.get('/admin/stats', authMiddleware, adminMiddleware, getReturnStats);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllReturnRequests);
router.post('/:id/review', authMiddleware, adminMiddleware, moveToReview);
router.post('/:id/approve', authMiddleware, adminMiddleware, approveReturn);
router.post('/:id/reject', authMiddleware, adminMiddleware, rejectReturn);
router.post('/:id/schedule-pickup', authMiddleware, adminMiddleware, schedulePickup);
router.post('/:id/pickup-failed', authMiddleware, adminMiddleware, markPickupFailed);
router.post('/:id/confirm-receipt', authMiddleware, adminMiddleware, confirmReceipt);
router.post('/:id/inspect', authMiddleware, adminMiddleware, inspectReturn);
router.post('/:id/process-refund', authMiddleware, adminMiddleware, processRefund);
router.post('/:id/refund', authMiddleware, adminMiddleware, refundReturnRequest);
router.post('/:id/refund-failed', authMiddleware, adminMiddleware, markRefundFailed);
router.post('/:id/complete', authMiddleware, adminMiddleware, completeReturn);
router.post('/:id/notes', authMiddleware, adminMiddleware, addReturnNote);

/* Shared (auth-checked inside controller) */
router.get('/:id', authMiddleware, getReturnById);
router.post('/', authMiddleware, createReturnRequest);
router.put('/status/:id', authMiddleware, adminMiddleware, updateReturnStatus);
router.put('/cancel/:id', authMiddleware, cancelReturnRequest);

export default router;
