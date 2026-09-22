import { Response, NextFunction } from 'express';
import { Coupon } from '../models/Coupon';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { createCouponSchema, updateCouponSchema } from '../validators';
import { Types } from 'mongoose';

const mapDiscountType = (dt: string): 'Percentage' | 'Free Delivery' => {
  if (dt === 'free_delivery') return 'Free Delivery';
  return 'Percentage';
};

export const getCoupons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    sendSuccess(res, { data: coupons });
  } catch (error) {
    next(error);
  }
};

export const getActiveCoupons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      status: 'active',
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
      $expr: { $or: [{ $eq: ['$usageLimit', 0] }, { $lt: ['$usedCount', '$usageLimit'] }] },
    }).sort({ createdAt: -1 });
    sendSuccess(res, { data: coupons });
  } catch (error) {
    next(error);
  }
};

export const getCouponById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return sendError(res, 'Coupon not found', 404);
    sendSuccess(res, { data: coupon });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const validation = createCouponSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const data = validation.data;
    const existing = await Coupon.findOne({ code: data.code });
    if (existing) return sendError(res, 'Coupon code already exists', 400);

    const coupon = await Coupon.create({
      name: data.name,
      code: data.code,
      description: data.description,
      offerType: data.offerType,
      discountType: mapDiscountType(data.discountType),
      discountValue: data.discountValue,
      maxDiscountAmount: data.maxDiscountAmount,
      minOrderAmount: data.minOrderAmount,
      minQuantity: data.minQuantity,
      usageLimit: data.usageLimit,
      perUserLimit: data.perUserLimit,
      startsAt: new Date(data.startsAt),
      expiresAt: new Date(data.expiresAt),
      isActive: data.isActive,
      status: data.status,
      createdBy: new Types.ObjectId(req.user.userId),
    } as any);

    sendSuccess(res, { data: coupon }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const validation = updateCouponSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const data = validation.data;
    const update: any = { ...data };
    if (data.discountType) {
      update.discountType = mapDiscountType(data.discountType);
    }
    if (data.startsAt) update.startsAt = new Date(data.startsAt);
    if (data.expiresAt) update.expiresAt = new Date(data.expiresAt);

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!coupon) return sendError(res, 'Coupon not found', 404);
    sendSuccess(res, { data: coupon });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return sendError(res, 'Coupon not found', 404);
    sendSuccess(res, { message: 'Coupon deleted' });
  } catch (error) {
    next(error);
  }
};
