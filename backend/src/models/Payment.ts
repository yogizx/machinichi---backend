import mongoose, { Schema } from 'mongoose';

export interface IPayment extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted' | 'captured' | 'failed' | 'refunded';
  method?: string;
  vpa?: string;
  bank?: string;
  wallet?: string;
  cardId?: string;
  cardLastFour?: string;
  cardNetwork?: string;
  fee?: number;
  tax?: number;
  errorCode?: string;
  errorDescription?: string;
  webhookVerified: boolean;
  webhookId?: string;
  webhookTimestamp?: Date;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  refundStatus?: string;
  notes?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, sparse: true, unique: true },
  razorpaySignature: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'attempted', 'captured', 'failed', 'refunded'],
    default: 'created',
  },
  method: { type: String },
  vpa: { type: String },
  bank: { type: String },
  wallet: { type: String },
  cardId: { type: String },
  cardLastFour: { type: String },
  cardNetwork: { type: String },
  fee: { type: Number },
  tax: { type: Number },
  errorCode: { type: String },
  errorDescription: { type: String },
  webhookVerified: { type: Boolean, default: false },
  webhookId: { type: String },
  webhookTimestamp: { type: Date },
  refundId: { type: String },
  refundAmount: { type: Number },
  refundReason: { type: String },
  refundedAt: { type: Date },
  refundStatus: { type: String },
  notes: { type: Map, of: String },
}, { timestamps: true });

paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
