import { Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { createReviewSchema, updateReviewSchema, reviewQuerySchema } from '../validators';
import { Types } from 'mongoose';

/**
 * Recompute a product's denormalised averageRating / reviewCount from its
 * approved reviews. Keeps the catalog, listings and detail page in sync
 * without scanning reviews on every read.
 */
export const refreshProductRating = async (productId: Types.ObjectId | string) => {
  const [agg] = await Review.aggregate([
    { $match: { productId: new Types.ObjectId(String(productId)), isApproved: true } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        averageRating: agg ? Math.round(agg.average * 10) / 10 : 0,
        reviewCount: agg ? agg.count : 0,
      },
    }
  ).lean();
};

/** Approved-review summary used by product detail pages. */
export async function buildRatingSummary(productId: string, variantSku?: string) {
  const match: any = { productId: new Types.ObjectId(productId), isApproved: true };
  if (variantSku) match['variant.sku'] = variantSku;

  const [ratings] = await Review.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
        distribution: { $push: '$rating' },
      },
    },
  ]);

  return ratings
    ? {
        average: Math.round(ratings.average * 10) / 10,
        total: ratings.count,
        distribution: [5, 4, 3, 2, 1].map((star) => ({
          star,
          count: ratings.distribution.filter((r: number) => r === star).length,
        })),
      }
    : { average: 0, total: 0, distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })) };
}

/** Best-effort map of an order-item size/label back to the product's variant. */
function resolveVariant(product: any, variantSize: string) {
  const normalize = (value: any) => String(value ?? '').trim().toLowerCase();
  const sizeNorm = normalize(variantSize);
  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];

  const hit = variants.find((v: any) =>
    [v?.size, v?.name, v?.sku, v?.colorName, v?.colorValue, v?.color, v?.material, v?.unit, v?.unitValue]
      .some((val) => val !== undefined && val !== null && normalize(val) === sizeNorm)
  );

  if (!hit) return { sku: variantSize, name: variantSize, size: variantSize };
  return {
    sku: hit.sku || variantSize,
    name: hit.name || variantSize,
    size: variantSize,
    ...(hit.color || hit.colorValue ? { color: hit.color || hit.colorValue } : {}),
  };
}

export const getProductReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.productId);
    if (!Types.ObjectId.isValid(productId)) {
      return sendError(res, 'Invalid product id', 400);
    }

    const validation = reviewQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, rating, variant } = validation.data;
    const filter: any = { productId: new Types.ObjectId(productId), isApproved: true };

    if (rating) filter.rating = rating;
    if (variant) filter['variant.sku'] = variant;

    const skip = (page - 1) * limit;
    const [reviews, total, ratingSummary] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName avatar'),
      Review.countDocuments(filter),
      buildRatingSummary(productId, variant),
    ]);

    sendSuccess(res, {
      data: reviews,
      ratingSummary,
      variant,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { productId, rating, title, comment, images } = validation.data;
    const userObjectId = new Types.ObjectId(req.user.userId);
    const productObjectId = new Types.ObjectId(productId);

    const product = await Product.findById(productObjectId).select('_id name variants');
    if (!product) return sendError(res, 'Product not found', 404);

    // Only customers who had this product delivered (or returned) may review it.
    const purchased = await Order.findOne({
      userId: userObjectId,
      'items.productId': productObjectId,
      status: { $in: ['delivered', 'returned'] },
    })
      .sort({ createdAt: -1 })
      .select({ _id: 1, status: 1, 'items.productId': 1, 'items.variantSize': 1 });

    if (!purchased) {
      return sendError(res, 'You can only review products you have purchased and received', 400);
    }

    const purchasedItem =
      (purchased.items || []).find(
        (it: any) => String(it.productId) === String(productObjectId)
      ) ||
      (purchased.items || [])[0];

    const variant = purchasedItem?.variantSize
      ? resolveVariant(product, String(purchasedItem.variantSize))
      : undefined;

    const existing = await Review.findOne({
      userId: userObjectId,
      productId: productObjectId,
    });

    if (existing) {
      return sendError(res, 'You have already reviewed this product', 400);
    }

    // Verified, delivered purchases are auto-published (enterprise standard);
    // reviews tied to returned orders stay in moderation.
    const isVerified = purchased.status === 'delivered';

    const review = await Review.create({
      userId: userObjectId,
      productId: productObjectId,
      orderId: purchased._id,
      rating,
      title: title || undefined,
      comment,
      body: comment,
      images: images || [],
      ...(variant ? { variant } : {}),
      isVerifiedPurchase: isVerified,
      isApproved: isVerified,
      status: isVerified ? 'Approved' : 'Pending',
    });

    if (isVerified) {
      await refreshProductRating(productObjectId);
    }

    sendSuccess(
      res,
      {
        data: review,
        message: isVerified ? 'Review submitted successfully' : 'Review submitted for approval',
      },
      201
    );
  } catch (error) {
    // Surface DB duplicate-key errors as a clean 400 instead of a 500.
    if ((error as any)?.code === 11000) {
      return sendError(res, 'You have already reviewed this product', 400);
    }
    next(error);
  }
};

export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = updateReviewSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const review = await Review.findById(req.params.id);
    if (!review) return sendError(res, 'Review not found', 404);

    if (review.userId.toString() !== req.user.userId) {
      return sendError(res, 'Not authorized to edit this review', 403);
    }

    const { comment, ...rest } = validation.data;
    Object.assign(review, rest, {
      ...(comment !== undefined ? { comment, body: comment } : {}),
      isApproved: false,
      status: 'Pending',
    });
    await review.save();

    await refreshProductRating(review.productId);

    sendSuccess(res, { data: review, message: 'Review updated and pending approval' });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const review = await Review.findById(req.params.id);
    if (!review) return sendError(res, 'Review not found', 404);

    if (review.userId.toString() !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 'Not authorized to delete this review', 403);
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(req.params.id);

    await refreshProductRating(productId);

    sendSuccess(res, { message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

export const approveReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        status: 'Approved',
        approvedBy: new Types.ObjectId(req.user.userId),
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!review) return sendError(res, 'Review not found', 404);

    await refreshProductRating(review.productId);

    sendSuccess(res, { data: review, message: 'Review approved' });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const reviews = await Review.find({ userId: new Types.ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .populate('productId', 'name slug images sellingPrice');

    sendSuccess(res, { data: reviews });
  } catch (error) {
    next(error);
  }
};

export const getPendingReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const reviews = await Review.find({ isApproved: false })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email')
      .populate('productId', 'name slug');

    sendSuccess(res, { data: reviews });
  } catch (error) {
    next(error);
  }
};