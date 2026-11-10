import mongoose, { Schema } from 'mongoose';

export interface IOTP extends mongoose.Document {
  identifier: string;
  // For `email_verify` records this holds an HMAC of the code, never the plain code.
  otp: string;
  type: 'phone_verify' | 'email_verify' | 'password_reset';
  // TTL / cleanup deadline for the whole record (Mongo deletes the document after this date).
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  lockedUntil?: Date;
  ipAddress?: string;
  userAgent?: string;
  isVerified?: boolean;
  // Email OTP only: when the code itself stops being valid (5 minutes after it was sent).
  otpExpiresAt?: Date;
  // Email OTP only: how many codes were sent in the current round, when the last one went out,
  // and until when no further code may be requested (set after the 3rd code).
  sendCount?: number;
  lastSentAt?: Date;
  sendBlockedUntil?: Date;
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
  otpExpiresAt: { type: Date },
  sendCount: { type: Number, default: 0 },
  lastSentAt: { type: Date },
  sendBlockedUntil: { type: Date },
}, { timestamps: true });

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
