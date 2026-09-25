import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getCheckoutSummary,
  placeOrder,
  applyCoupon,
  validateCheckout,
  evaluateOffers,
} from '../controllers/checkout.controller';

const router = Router();

router.use(authMiddleware);

router.get('/summary', getCheckoutSummary);
router.post('/validate', validateCheckout);
router.post('/apply-coupon', applyCoupon);
router.post('/evaluate-offers', evaluateOffers);
router.post('/place-order', placeOrder);

export default router;
