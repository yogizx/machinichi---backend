import mongoose, { Schema } from 'mongoose';

export interface ILoginAudit extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  email?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

const loginAuditSchema = new Schema<ILoginAudit>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  email: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, required: true },
  failureReason: String,
  timestamp: { type: Date, default: Date.now },
});

loginAuditSchema.index({ userId: 1 });
loginAuditSchema.index({ email: 1, timestamp: -1 });
loginAuditSchema.index({ timestamp: -1 });

export const LoginAudit = mongoose.model<ILoginAudit>('LoginAudit', loginAuditSchema);
