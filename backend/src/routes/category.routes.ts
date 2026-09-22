import { Router } from 'express';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware';
import {
  getCategories,
  getAllCategories,
  getCategoryBySlug,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { adminMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getCategories);
router.get('/all', getAllCategories);
router.get('/slug/:slug', getCategoryBySlug);
router.get('/:id/products', authMiddleware, adminMiddleware, getCategoryProducts);

router.post('/', authMiddleware, adminMiddleware, createCategory);
router.put('/:id', authMiddleware, adminMiddleware, updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCategory);

export default router;
