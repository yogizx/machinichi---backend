import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getSavedItems,
  saveForLater,
  moveToCart,
  removeSavedItem,
} from '../controllers/savedForLater.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', getSavedItems);
router.post('/save', saveForLater);
router.post('/move-to-cart/:productId', moveToCart);
router.delete('/item/:productId', removeSavedItem);

export default router;
