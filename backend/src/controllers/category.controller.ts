import { Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { createCategorySchema, updateCategorySchema } from '../validators';
import { Types } from 'mongoose';

export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          category: cat._id,
          isDeleted: false,
          isActive: true,
        });
        return { ...cat.toObject(), productCount };
      })
    );

    sendSuccess(res, { data: categoriesWithCount });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find()
      .sort({ displayOrder: 1, name: 1 })
      .populate('parentCategory', 'name slug');

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          category: cat._id,
          isDeleted: false,
        });
        return { ...cat.toObject(), productCount };
      })
    );

    sendSuccess(res, { data: categoriesWithCount });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug })
      .populate('parentCategory', 'name slug');
    if (!category) return sendError(res, 'Category not found', 404);
    sendSuccess(res, { data: category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = createCategorySchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const slug = validation.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Category.findOne({ slug });
    if (existing) return sendError(res, 'Category with this name already exists', 400);

    const category = await Category.create({
      ...validation.data,
      slug,
      createdBy: new Types.ObjectId(req.user!.userId),
    });

    sendSuccess(res, { data: category }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = updateCategorySchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const update: any = { ...validation.data };
    if (validation.data.name) {
      update.slug = validation.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { ...update, updatedBy: new Types.ObjectId(req.user!.userId) },
      { new: true }
    );

    if (!category) return sendError(res, 'Category not found', 404);
    sendSuccess(res, { data: category });
  } catch (error) {
    next(error);
  }
};

export const getCategoryProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return sendError(res, 'Category not found', 404);

    const products = await Product.find({
      category: req.params.id,
      isDeleted: false,
    })
      .select('name slug sku sellingPrice mrpPrice quantity images isActive status publishStatus')
      .sort({ createdAt: -1 });

    sendSuccess(res, { data: { category, products } });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productCount = await Product.countDocuments({ category: req.params.id, isDeleted: false });
    if (productCount > 0) {
      return sendError(res, `Cannot delete category with ${productCount} active products. Move products first.`, 400);
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedBy: new Types.ObjectId(req.user!.userId) },
      { new: true }
    );

    if (!category) return sendError(res, 'Category not found', 404);
    sendSuccess(res, { data: category, message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
};
