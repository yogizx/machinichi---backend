import mongoose, { Schema } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variantSize?: string;
  name: string;
  image?: string;
  mrpPrice: number;
  sellingPrice: number;
  quantity: number;
  reservedAt?: Date;
}

export interface ICart extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: ICartItem[];
  appliedCoupon?: string;
  scratchCardDiscount?: { discountType: string; discountValue: number; discountAmount?: number; label?: string };
  subtotal: number;
  totalDiscount: number;
  shippingAmount: number;
  total: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, unique: true },
  sessionId: { type: String, sparse: true, unique: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSize: String,
    name: { type: String, required: true },
    image: String,
    mrpPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reservedAt: { type: Date, default: Date.now },
  }],
  appliedCoupon: { type: String },
  scratchCardDiscount: {
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    label: String,
  },
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  shippingAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  expiresAt: { type: Date },
}, { timestamps: true });

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ updatedAt: -1 });

export const Cart = mongoose.model<ICart>('Cart', cartSchema);
