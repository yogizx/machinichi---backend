import mongoose, { Schema } from 'mongoose';

export interface IReview extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  body: string;
  images: string[];
  variant?: {
    sku?: string;
    name?: string;
    size?: string;
    color?: string;
  };
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulVotes: number;
  reportedCount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', sparse: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, maxlength: 200 },
  comment: { type: String, required: true, maxlength: 2000, trim: true },
  body: { type: String, maxlength: 2000 },
  images: [{ type: String }],
  variant: {
    sku: { type: String, trim: true },
    name: { type: String, trim: true },
    size: { type: String, trim: true },
    color: { type: String, trim: true },
  },
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  helpfulVotes: { type: Number, default: 0 },
  reportedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  rejectReason: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
}, { timestamps: true });

reviewSchema.index({ productId: 1, status: 1 });
// One approved review per product per customer (DB-level uniqueness guard).
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ 'variant.sku': 1 });
reviewSchema.index({ userId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
