import mongoose, { Schema } from 'mongoose';

export interface ICouponScratchRule {
  basis: 'quantity' | 'order_amount';
  threshold: number;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  label?: string;
}

export interface ICoupon extends mongoose.Document {
  name: string;
  code: string;
  description: string;
  offerType: 'coupon' | 'flash_sale' | 'bundle' | 'scratch_card' | 'free_delivery';
  discountType: 'Percentage' | 'Free Delivery';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  minQuantity: number;
  scratchRules: ICouponScratchRule[];
  freeDeliveryDistricts: string[];
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  status: 'active' | 'draft' | 'expired' | 'disabled';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scratchRuleSchema = new Schema<ICouponScratchRule>({
  basis: { type: String, enum: ['quantity', 'order_amount'], required: true },
  threshold: { type: Number, required: true, min: 0 },
  discountType: { type: String, enum: ['Percentage', 'Fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  label: { type: String, trim: true, maxlength: 80 },
}, { _id: false });

const couponSchema = new Schema<ICoupon>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  offerType: { type: String, enum: ['coupon', 'flash_sale', 'bundle', 'scratch_card', 'free_delivery'], default: 'coupon' },
  discountType: { type: String, enum: ['Percentage', 'Free Delivery'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscountAmount: { type: Number },
  minOrderAmount: { type: Number, default: 0 },
  minQuantity: { type: Number, default: 1 },
  scratchRules: { type: [scratchRuleSchema], default: [] },
  freeDeliveryDistricts: { type: [String], default: [] },
  usageLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'draft', 'expired', 'disabled'], default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

couponSchema.index({ isActive: 1 });
couponSchema.index({ code: 1 });
couponSchema.index({ expiresAt: 1 });

export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
