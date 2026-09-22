import { Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import { createReviewSchema, updateReviewSchema, reviewQuerySchema } from '../validators';
import { Types } from 'mongoose';

export const getProductReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const productId = String(req.params.productId);
    const validation = reviewQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, rating } = validation.data;
    const filter: any = { productId: new Types.ObjectId(productId), isApproved: true };

    if (rating) filter.rating = rating;

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name avatar'),
      Review.countDocuments(filter),
    ]);

    const ratings = await Review.aggregate([
      { $match: { productId: new Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
          distribution: { $push: '$rating' },
        },
      },
    ]);

    const ratingSummary = ratings.length > 0
      ? {
          average: Math.round(ratings[0].average * 10) / 10,
          total: ratings[0].count,
          distribution: [5, 4, 3, 2, 1].map(star => ({
            star,
            count: ratings[0].distribution.filter((r: number) => r === star).length,
          })),
        }
      : { average: 0, total: 0, distribution: [5, 4, 3, 2, 1].map(star => ({ star, count: 0 })) };

    sendSuccess(res, {
      data: reviews,
      ratingSummary,
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

    const product = await Product.findById(productId);
    if (!product) return sendError(res, 'Product not found', 404);

    const purchased = await Order.findOne({
      userId: new Types.ObjectId(req.user.userId),
      'items.productId': new Types.ObjectId(productId),
      status: { $in: ['delivered', 'returned'] },
    });

    if (!purchased) {
      return sendError(res, 'You can only review products you have purchased', 400);
    }

    const existing = await Review.findOne({
      userId: new Types.ObjectId(req.user.userId),
      productId: new Types.ObjectId(productId),
    });

    if (existing) {
      return sendError(res, 'You have already reviewed this product', 400);
    }

    const review = await Review.create({
      userId: new Types.ObjectId(req.user.userId),
      productId: new Types.ObjectId(productId),
      rating,
      title: title || undefined,
      comment,
      images: images || [],
      isApproved: false,
    });

    sendSuccess(res, { data: review, message: 'Review submitted for approval' }, 201);
  } catch (error) {
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

    Object.assign(review, validation.data, { isApproved: false });
    await review.save();

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

    await Review.findByIdAndDelete(req.params.id);

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
      { isApproved: true, approvedBy: new Types.ObjectId(req.user.userId), approvedAt: new Date() },
      { new: true }
    );

    if (!review) return sendError(res, 'Review not found', 404);

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
      .populate('userId', 'name email')
      .populate('productId', 'name slug');

    sendSuccess(res, { data: reviews });
  } catch (error) {
    next(error);
  }
};
