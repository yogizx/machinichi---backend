import mongoose, { Schema } from 'mongoose';

export interface ICoupon extends mongoose.Document {
  name: string;
  code: string;
  description: string;
  offerType: 'coupon' | 'flash_sale' | 'bundle' | 'scratch_card';
  discountType: 'Percentage' | 'Free Delivery';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  minQuantity: number;
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

const couponSchema = new Schema<ICoupon>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  offerType: { type: String, enum: ['coupon', 'flash_sale', 'bundle', 'scratch_card'], default: 'coupon' },
  discountType: { type: String, enum: ['Percentage', 'Free Delivery'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  maxDiscountAmount: { type: Number },
  minOrderAmount: { type: Number, default: 0 },
  minQuantity: { type: Number, default: 1 },
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
