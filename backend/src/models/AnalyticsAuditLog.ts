import mongoose, { Schema } from 'mongoose';

// Enterprise audit trail: records every order transition that changes what
// Regional Analytics reports (an order entering/leaving the approved-order
// set, or a payment being refunded). This lets an admin answer "why did
// Tamil Nadu's revenue change on this date" without re-deriving it from the
// raw Order collection. Follows the same lightweight pattern as LoginAudit.
export interface IAnalyticsAuditLog extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  orderCode?: string;
  state?: string;
  action: 'order_approved' | 'order_cancelled' | 'order_refunded' | 'order_delivered';
  previousStatus?: string;
  newStatus?: string;
  revenueImpact: number; // signed: +amount when revenue is added, -amount when removed
  changedBy?: mongoose.Types.ObjectId;
  timestamp: Date;
}

const analyticsAuditLogSchema = new Schema<IAnalyticsAuditLog>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  orderCode: { type: String },
  state: { type: String },
  action: {
    type: String,
    enum: ['order_approved', 'order_cancelled', 'order_refunded', 'order_delivered'],
    required: true,
  },
  previousStatus: { type: String },
  newStatus: { type: String },
  revenueImpact: { type: Number, required: true, default: 0 },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});

analyticsAuditLogSchema.index({ orderId: 1 });
analyticsAuditLogSchema.index({ state: 1, timestamp: -1 });
analyticsAuditLogSchema.index({ timestamp: -1 });

export const AnalyticsAuditLog = mongoose.model<IAnalyticsAuditLog>('AnalyticsAuditLog', analyticsAuditLogSchema);
