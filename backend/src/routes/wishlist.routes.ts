import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} from '../controllers/wishlist.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.get('/check/:productId', checkWishlist);
router.delete('/item/:productId', removeFromWishlist);

export default router;
