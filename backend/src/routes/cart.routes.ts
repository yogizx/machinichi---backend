import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
  getCartCount,
} from '../controllers/cart.controller';

const router = Router();

router.get('/', optionalAuth, getCart);
router.get('/count', optionalAuth, getCartCount);
router.post('/add', optionalAuth, addToCart);
router.post('/merge', authMiddleware, mergeCart);
router.put('/item/:productId', optionalAuth, updateCartItem);
router.delete('/item/:productId', optionalAuth, removeFromCart);
router.delete('/clear', optionalAuth, clearCart);

export default router;
