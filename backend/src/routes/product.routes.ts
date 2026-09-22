import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware';
import {
  getProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  searchProducts,
  getSuggestions,
  getRelatedProducts,
  getTrendingProducts,
} from '../controllers/product.controller';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/search', searchProducts);
router.get('/suggestions', getSuggestions);
router.get('/slug/:slug', getProductBySlug);
router.get('/related/:id', getRelatedProducts);
router.get('/:id', getProductById);

export default router;
