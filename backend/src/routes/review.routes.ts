import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getProductReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  approveReview,
  getPendingReviews,
} from '../controllers/review.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my', authMiddleware, getMyReviews);
router.get('/product/:productId', getProductReviews);
router.get('/pending', authMiddleware, adminMiddleware, getPendingReviews);
router.post('/', authMiddleware, createReview);
router.put('/:id', authMiddleware, updateReview);
router.put('/approve/:id', authMiddleware, adminMiddleware, approveReview);
router.delete('/:id', authMiddleware, deleteReview);

export default router;
