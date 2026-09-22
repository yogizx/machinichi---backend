import mongoose, { Schema } from 'mongoose';

export interface IBusiness extends mongoose.Document {
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
  logo?: string;
  coverBanner?: string;
  email?: string;
  phone?: string;
  website?: string;
  ownerName?: string;
  ownerDesignation?: string;
  ownerLinkedin?: string;
  ownerWebsite?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  socialTwitter?: string;
  socialWhatsapp?: string;
  socialYoutube?: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedBy?: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const businessSchema = new Schema<IBusiness>({
  name: { type: String, required: true, trim: true },
  tagline: { type: String, trim: true },
  description: { type: String, trim: true },
  category: { type: String, trim: true },
  logo: { type: String },
  coverBanner: { type: String },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  website: { type: String, trim: true },
  ownerName: { type: String, trim: true },
  ownerDesignation: { type: String, trim: true },
  ownerLinkedin: { type: String, trim: true },
  ownerWebsite: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  socialFacebook: { type: String, trim: true },
  socialInstagram: { type: String, trim: true },
  socialLinkedin: { type: String, trim: true },
  socialTwitter: { type: String, trim: true },
  socialWhatsapp: { type: String, trim: true },
  socialYoutube: { type: String, trim: true },
  images: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

businessSchema.index({ status: 1, createdAt: -1 });
businessSchema.index({ name: 'text', tagline: 'text', description: 'text' });

export const Business = mongoose.model<IBusiness>('Business', businessSchema);
