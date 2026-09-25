import { Response, NextFunction } from 'express';
import { Coupon } from '../models/Coupon';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { createCouponSchema, updateCouponSchema } from '../validators';
import { dedupeDistricts, mapScratchRuleInput } from '../services/offer.service';
import { Types } from 'mongoose';

const mapDiscountType = (dt: string): 'Percentage' | 'Free Delivery' => {
  if (dt === 'free_delivery') return 'Free Delivery';
  return 'Percentage';
};

const buildOfferFields = (data: any) => {
  const scratchRules = (data.scratchRules ?? []).map((rule: any) => mapScratchRuleInput(rule));
  const freeDeliveryDistricts = dedupeDistricts(data.freeDeliveryDistricts ?? []);

  if (data.offerType === 'scratch_card' && scratchRules.length === 0) {
    return { error: 'Add at least one scratch card discount rule' };
  }

  if (data.offerType === 'free_delivery' && data.discountType !== 'free_delivery') {
    return { error: 'Free delivery offers must use the Free Delivery discount type' };
  }

  if (data.offerType === 'scratch_card' && data.discountType === 'free_delivery') {
    return { error: 'Scratch card offers cannot use the Free Delivery discount type' };
  }

  const seen = new Set<string>();
  for (const rule of scratchRules) {
    const key = `${rule.basis}:${rule.threshold}`;
    if (seen.has(key)) return { error: 'Duplicate scratch card rule for the same condition' };
    seen.add(key);
    if (rule.discountType === 'Percentage' && (rule.discountValue <= 0 || rule.discountValue > 100)) {
      return { error: 'Scratch card percentage must be between 1 and 100' };
    }
    if (rule.basis === 'quantity' && rule.threshold < 1) {
      return { error: 'Product quantity rules must start at 1 item or more' };
    }
  }

  if (data.discountType === 'percentage' && Number(data.discountValue) > 100) {
    return { error: 'Percentage discount cannot exceed 100' };
  }

  return { scratchRules, freeDeliveryDistricts };
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

    const offerFields = buildOfferFields(data);
    if ('error' in offerFields && offerFields.error) {
      return sendError(res, offerFields.error, 400);
    }

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
      scratchRules: offerFields.scratchRules,
      freeDeliveryDistricts: offerFields.freeDeliveryDistricts,
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
    const current = await Coupon.findById(req.params.id);
    if (!current) return sendError(res, 'Coupon not found', 404);

    const merged = {
      offerType: data.offerType ?? current.offerType,
      discountType: data.discountType ?? (current.discountType === 'Free Delivery' ? 'free_delivery' : 'percentage'),
      discountValue: data.discountValue ?? current.discountValue,
      scratchRules: data.scratchRules ?? (current.scratchRules ?? []).map((rule: any) => ({
        basis: rule.basis,
        threshold: rule.threshold,
        discountType: rule.discountType === 'Fixed' ? 'fixed' : 'percentage',
        discountValue: rule.discountValue,
        label: rule.label,
      })),
      freeDeliveryDistricts: data.freeDeliveryDistricts ?? current.freeDeliveryDistricts ?? [],
    };

    const offerFields = buildOfferFields(merged);
    if ('error' in offerFields && offerFields.error) {
      return sendError(res, offerFields.error, 400);
    }

    const update: any = { ...data };
    if (data.discountType) {
      update.discountType = mapDiscountType(data.discountType);
    }
    if (data.scratchRules) {
      update.scratchRules = offerFields.scratchRules;
    }
    if (data.freeDeliveryDistricts) {
      update.freeDeliveryDistricts = offerFields.freeDeliveryDistricts;
    }
    if (data.maxDiscountAmount === null) {
      update.maxDiscountAmount = undefined;
      await Coupon.updateOne({ _id: current._id }, { $unset: { maxDiscountAmount: 1 } });
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
