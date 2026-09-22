import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getCoupons,
  getActiveCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/coupon.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/active', getActiveCoupons);
router.get('/', authMiddleware, adminMiddleware, getCoupons);
router.get('/:id', authMiddleware, adminMiddleware, getCouponById);
router.post('/', authMiddleware, adminMiddleware, createCoupon);
router.put('/:id', authMiddleware, adminMiddleware, updateCoupon);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCoupon);

export default router;
