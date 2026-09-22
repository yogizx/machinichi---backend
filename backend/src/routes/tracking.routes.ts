import { Router } from 'express';
import { optionalAuth, authMiddleware } from '../middlewares/auth.middleware';
import {
  registerView,
  registerCartAdd,
  registerCartRemove,
  mergeIdentity,
} from '../controllers/tracking.controller';

const router = Router();

router.post('/products/:productId/view', optionalAuth, registerView);
router.post('/products/:productId/cart-add', optionalAuth, registerCartAdd);
router.post('/products/:productId/cart-remove', optionalAuth, registerCartRemove);
router.post('/identity/merge', authMiddleware, mergeIdentity);

export default router;
