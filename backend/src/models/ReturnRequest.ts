import mongoose, { Schema } from 'mongoose';

export interface IReturnItem {
  orderItemIndex: number;
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  reason: string;
  images: string[];
}

export interface ITimelineStage {
  stage: string;
  completedAt?: Date;
  isActive: boolean;
}

export interface IReturnRequest extends mongoose.Document {
  returnId: string;
  orderId: mongoose.Types.ObjectId;
  orderItemId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: IReturnItem[];
  reason?: string;
  description?: string;
  quantity?: number;
  images?: string[];
  pickupAddress?: any;
  status: 'Requested' | 'Processing' | 'Approved' | 'Rejected' | 'Completed';
  refundAmount: number;
  refundType: 'Full' | 'Partial';
  rejectionReason?: string;
  assignedTo?: mongoose.Types.ObjectId;
  handledBy?: mongoose.Types.ObjectId;
  adminNote?: string;
  adminNotes: { note: string; addedBy: mongoose.Types.ObjectId; addedAt: Date }[];
  approvedAt?: Date;
  pickedUpAt?: Date;
  refundedAt?: Date;
  timeline: ITimelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const returnRequestSchema = new Schema<IReturnRequest>({
  returnId: { type: String, required: true, unique: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderItemId: { type: Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  description: { type: String },
  quantity: { type: Number },
  images: [String],
  pickupAddress: { type: Schema.Types.Mixed },
  items: [{
    orderItemIndex: { type: Number, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    quantity: { type: Number, required: true },
    reason: { type: String, required: true },
    images: [String],
  }],
  status: {
    type: String,
    enum: ['Requested', 'Processing', 'Approved', 'Rejected', 'Completed'],
    default: 'Requested',
  },
  refundAmount: { type: Number, default: 0 },
  refundType: { type: String, enum: ['Full', 'Partial'], default: 'Full' },
  rejectionReason: String,
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  adminNote: { type: String },
  approvedAt: { type: Date },
  pickedUpAt: { type: Date },
  refundedAt: { type: Date },
  adminNotes: [{
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],
  timeline: [{
    stage: { type: String, required: true },
    completedAt: Date,
    isActive: { type: Boolean, default: false },
  }],
}, { timestamps: true });

returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ userId: 1 });
returnRequestSchema.index({ status: 1 });
returnRequestSchema.index({ createdAt: -1 });

export const ReturnRequest = mongoose.model<IReturnRequest>('ReturnRequest', returnRequestSchema);
