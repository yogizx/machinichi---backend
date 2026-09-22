import mongoose, { Schema } from 'mongoose';

export interface IBanner extends mongoose.Document {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  image?: string;
  imageWebp: string;
  imageFallback: string;
  bigText?: string;
  smallText?: string;
  buttonText?: string;
  buttonURL?: string;
  contentPosition: 'Left Side' | 'Right Side';
  mobileImageUrl?: string;
  linkUrl?: string;
  link?: string;
  linkType: 'page' | 'external' | 'category' | 'product';
  position?: string;
  order: number;
  bgColor?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  clicks: number;
  impressions: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>({
  title: { type: String },
  subtitle: String,
  imageUrl: { type: String },
  image: { type: String },
  imageWebp: { type: String, required: true },
  imageFallback: { type: String, required: true },
  bigText: String,
  smallText: String,
  buttonText: String,
  buttonURL: String,
  contentPosition: { type: String, enum: ['Left Side', 'Right Side'], default: 'Left Side' },
  mobileImageUrl: String,
  linkUrl: String,
  link: String,
  linkType: { type: String, enum: ['page', 'external', 'category', 'product'], default: 'page' },
  position: { type: String },
  order: { type: Number, default: 0 },
  bgColor: { type: String },
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true },
  validFrom: Date,
  validUntil: Date,
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

bannerSchema.index({ position: 1, isActive: 1, order: 1 });
bannerSchema.index({ position: 1, isActive: 1, createdAt: -1 });
bannerSchema.index({ validUntil: 1 });

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
