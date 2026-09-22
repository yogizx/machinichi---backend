import mongoose, { Schema } from 'mongoose';

export interface IProductViewEvent extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  viewedAt: Date;
  referrer?: string;
  source?: string;
  ip?: string;
  userAgent?: string;
}

const productViewEventSchema = new Schema<IProductViewEvent>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  sessionId: { type: String, sparse: true },
  viewedAt: { type: Date, default: Date.now },
  referrer: { type: String },
  source: { type: String, default: 'direct' },
  ip: { type: String },
  userAgent: { type: String },
});

productViewEventSchema.index({ productId: 1, viewedAt: -1 });
productViewEventSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });
export const ProductViewEvent = mongoose.model<IProductViewEvent>('ProductViewEvent', productViewEventSchema);
