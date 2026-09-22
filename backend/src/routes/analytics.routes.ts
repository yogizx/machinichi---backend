import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
import {
  getProductStats,
  getBulkStats,
  getDashboardOverview,
  getProductViewHistory,
  resetCartAnalytics,
} from '../controllers/analytics.controller';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/overview', getDashboardOverview);
router.get('/products/:productId', getProductStats);
router.get('/products', getBulkStats);
router.get('/products/:productId/history', getProductViewHistory);
router.delete('/products/:productId/reset-cart', resetCartAnalytics);
router.delete('/products/reset-all-carts', resetCartAnalytics);

export default router;
