import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface ICertificate {
  name: string;
  size: number;
  uploadedAt: Date;
  url: string;
}

export interface ITwoStep {
  enabled: boolean;
  email?: string;
}

export interface IStoreInfo {
  brandName?: string;
  location?: string;
  city?: string;
  state?: string;
  storeEmail?: string;
}

export interface IProductCertification {
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}

export interface ICompliance {
  fssai?: string;
  bis?: string;
  ce?: string;
  iso?: string;
  fda?: string;
  rohs?: string;
  msds?: string;
  msdsUrl?: string;
  productCertifications?: IProductCertification[];
  certificateUrls?: string[];
}

export interface IUser extends mongoose.Document {
  fullName: string;
  email?: string;
  phone?: string;
  password?: string;
  avatar?: string;
  provider: 'local' | 'google' | 'firebase';
  googleId?: string;
  firebaseUid?: string;
  role: 'customer' | 'admin' | 'super_admin';
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  isDeleted: boolean;
  isBlocked: boolean;
  lastLogin?: Date;
  lastLoginIp?: string;
  lastLoginDevice?: string;
  failedLoginAttempts: number;
  lockUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts: number;
  passwordResetLockUntil?: Date;
  isLocked: boolean;
  gstCertificate?: ICertificate;
  fssaiCertificate?: ICertificate;
  compliance?: ICompliance;
  twoStep?: ITwoStep;
  storeInfo?: IStoreInfo;
  customerTier?: string;
  totalOrders?: number;
  totalSpend?: number;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  fullName:  { type: String, required: true, trim: true },
  email:     { type: String, lowercase: true, trim: true, sparse: true, index: true },
  phone:     { type: String, sparse: true, index: true },
  password:  { type: String, select: false, minlength: 8 },
  avatar:    { type: String },
  provider:  { type: String, enum: ['local', 'google', 'firebase'], default: 'local' },
  googleId:  { type: String, sparse: true, unique: true, index: true },
  firebaseUid: { type: String, sparse: true, unique: true, index: true },
  role:      { type: String, enum: ['customer', 'admin', 'super_admin'], default: 'customer' },
  isPhoneVerified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  isDeleted:       { type: Boolean, default: false },
  isBlocked:       { type: Boolean, default: false },
  lastLogin:       { type: Date },
  lastLoginIp:     { type: String },
  lastLoginDevice: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil:           { type: Date },
  passwordResetToken:   { type: String },
  passwordResetExpires: { type: Date },
  passwordResetAttempts: { type: Number, default: 0 },
  passwordResetLockUntil: { type: Date },
  gstCertificate: {
    name: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date },
    url: { type: String },
  },
  fssaiCertificate: {
    name: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date },
    url: { type: String },
  },
  compliance: {
    fssai: { type: String, trim: true },
    bis: { type: String, trim: true },
    ce: { type: String, trim: true },
    iso: { type: String, trim: true },
    fda: { type: String, trim: true },
    rohs: { type: String, trim: true },
    msds: { type: String, trim: true },
    msdsUrl: { type: String },
    productCertifications: [{
      name: { type: String, required: true, trim: true },
      url: { type: String, required: true },
      size: { type: Number },
      uploadedAt: { type: Date, default: Date.now },
    }],
    certificateUrls: [{ type: String }],
  },
  twoStep: {
    enabled: { type: Boolean, default: false },
    email: { type: String, lowercase: true, trim: true },
  },
  storeInfo: {
    brandName: { type: String, trim: true },
    location: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    storeEmail: { type: String, lowercase: true, trim: true },
  },
  customerTier: { type: String, default: 'Regular' },
  totalOrders: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.pre('save', async function (this: IUser) {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export const User = mongoose.model<IUser>('User', userSchema);
