import mongoose, { Schema } from 'mongoose';

export interface IOTP extends mongoose.Document {
  identifier: string;
  otp: string;
  type: 'phone_verify' | 'email_verify' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  lockedUntil?: Date;
  ipAddress?: string;
  userAgent?: string;
  isVerified?: boolean;
}

const otpSchema = new Schema<IOTP>({
  identifier: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['phone_verify', 'email_verify', 'password_reset'], required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  lockedUntil: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
