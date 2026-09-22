import mongoose, { Schema } from 'mongoose';

export interface IRefreshToken extends mongoose.Document {
  token: string;
  user: mongoose.Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  userIp?: string;
  userAgent?: string;
}

const refreshTokenSchema = new Schema({
  token: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  replacedByToken: { type: String },
  userIp: String,
  userAgent: String
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
