import { Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../validators';
import { Types } from 'mongoose';

function sanitizeSingleProductDoc(p: any) {
  if (!p) return p;
  // Filter out data URL images (base64) from product images - only keep permanent URLs
  if (Array.isArray(p.images)) {
    p.images = p.images
      .filter((img: any) => img?.url && !img.url.startsWith('data:'))
      .map((img: any) => ({
        ...img,
        url: img.url,
      }));
  }
  // Filter out data URL images from variants - only keep permanent URLs
  if (Array.isArray(p.variants)) {
    p.variants = p.variants.map((v: any) => ({
      ...v,
      images: Array.isArray(v.images)
        ? v.images.filter((img: any) => img?.url && !img.url.startsWith('data:'))
        : [],
    }));
  }
  return p;
}

export const getProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = productQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, sort, order, search, category, minPrice, maxPrice, isFeatured, tags, inStock } = validation.data;
    const filter: any = { isDeleted: false, publishStatus: 'published' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = new Types.ObjectId(category);
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.sellingPrice = {};
      if (minPrice !== undefined) filter.sellingPrice.$gte = minPrice;
      if (maxPrice !== undefined) filter.sellingPrice.$lte = maxPrice;
    }

    if (isFeatured !== undefined) filter.isFeatured = isFeatured;
    if (tags) filter.tags = { $in: tags.split(',').map(t => t.trim()) };

    if (inStock) {
      filter.$or = [
        { quantity: { $gt: 0 } },
        { 'variants.quantity': { $gt: 0 } },
      ];
    }

    const sortOption: any = {};
    if (sort) {
      const sortField = sort === 'createdAt' ? '_id' : sort;
      sortOption[sortField] = order === 'asc' ? 1 : -1;
    } else {
      sortOption._id = -1;
    }

    const skip = (page - 1) * limit;
    const rawProducts = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .select('name slug sku barcode brand category subCategory mrpPrice sellingPrice costPrice quantity warehouseStock reservedQuantity publishStatus status isFeatured thumbnail badges weight unitType createdAt updatedAt')
      .populate('category', 'name slug')
      .lean();
    const total = await Product.countDocuments(filter);

    const sanitizedProducts = rawProducts.map((p: any) => {
      p.images = p.thumbnail ? [{ url: p.thumbnail }] : [];
      p.variants = p.variants || [];
      return p;
    });

    sendPaginated(res, sanitizedProducts, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const rawProduct = await Product.findOne({ slug, isDeleted: false })
      .populate('category', 'name slug')
      .populate('relatedProductsCategory', 'name slug')
      .populate('createdBy', 'name')
      .populate('frequentlyBoughtTogether', 'name slug thumbnail sellingPrice mrpPrice averageRating')
      .populate('crossSell', 'name slug thumbnail sellingPrice mrpPrice averageRating')
      .populate('upSell', 'name slug thumbnail sellingPrice mrpPrice averageRating')
      .populate('bundle', 'name slug thumbnail sellingPrice mrpPrice averageRating')
      .lean();

    if (!rawProduct) return sendError(res, 'Product not found', 404);

    const reviews = await Review.find({ productId: rawProduct._id, isApproved: true })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const product = sanitizeSingleProductDoc(rawProduct);
    sendSuccess(res, { data: { ...product, reviews } });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false, publishStatus: 'published' })
      .populate('category', 'name slug')
      .populate('relatedProductsCategory', 'name slug');
    if (!product) return sendError(res, 'Product not found', 404);
    sendSuccess(res, { data: product });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await Product.find({ isFeatured: true, isDeleted: false, publishStatus: 'published' })
      .select('-seo')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(12);
    sendSuccess(res, { data: products });
  } catch (error) {
    next(error);
  }
};

export const searchProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    const products = await Product.find({
      isDeleted: false,
      publishStatus: 'published',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } },
        { hsnCode: { $regex: q, $options: 'i' } },
        { 'variants.sku': { $regex: q, $options: 'i' } },
      ],
    })
      .select('name slug images sellingPrice mrpPrice quantity variants')
      .limit(20);

    sendSuccess(res, { data: products });
  } catch (error) {
    next(error);
  }
};

export const getSuggestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 1) {
      return sendSuccess(res, { data: [] });
    }

    const products = await Product.find({
      isDeleted: false,
      publishStatus: 'published',
      name: { $regex: `^${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
    })
      .select('name')
      .limit(10)
      .lean();

    const suggestions = products.map((p) => p.name);
    sendSuccess(res, { data: suggestions });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id as string;
    const isObjId = Types.ObjectId.isValid(rawId);
    const product = await Product.findOne({
      $or: isObjId ? [{ _id: new Types.ObjectId(rawId) }, { slug: rawId }] : [{ slug: rawId }],
      isDeleted: false,
    });
    if (!product) return sendError(res, 'Product not found', 404);

    const targetCategory = product.relatedProductsCategory || product.category;

    let related = await Product.find({
      _id: { $ne: product._id },
      category: targetCategory,
      isDeleted: false,
      publishStatus: 'published',
    })
      .select('name slug images sellingPrice mrpPrice quantity averageRating reviewCount variants')
      .limit(10)
      .lean();

    if (related.length < 5) {
      const existingIds = [product._id.toString(), ...related.map((p) => p._id.toString())];
      const fallback = await Product.find({
        _id: { $nin: existingIds },
        isDeleted: false,
        publishStatus: 'published',
      })
        .select('name slug images sellingPrice mrpPrice quantity averageRating reviewCount variants')
        .limit(10 - related.length)
        .lean();

      related = [...related, ...fallback];
    }

    sendSuccess(res, { data: related });
  } catch (error) {
    next(error);
  }
};

export const getTrendingProducts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const topSalesFromOrders = await Order.aggregate([
      { $match: { orderStatus: { $nin: ['Cancelled', 'Returned'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', totalQty: { $sum: '$items.quantity' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 12 },
    ]);

    const orderProductIds = topSalesFromOrders.map((o) => o._id).filter(Boolean);

    let trending = await Product.find({
      _id: { $in: orderProductIds },
      isDeleted: false,
      publishStatus: 'published',
    })
      .select('name slug images sellingPrice mrpPrice quantity averageRating reviewCount variants totalSales salesCount')
      .lean();

    if (trending.length < 8) {
      const existingIds = trending.map((p) => p._id.toString());
      const fallback = await Product.find({
        _id: { $nin: existingIds },
        isDeleted: false,
        publishStatus: 'published',
      })
        .sort({ totalSales: -1, salesCount: -1, averageRating: -1, createdAt: -1 })
        .limit(12 - trending.length)
        .select('name slug images sellingPrice mrpPrice quantity averageRating reviewCount variants totalSales salesCount')
        .lean();

      trending = [...trending, ...fallback];
    }

    sendSuccess(res, { data: trending });
  } catch (error) {
    next(error);
  }
};
