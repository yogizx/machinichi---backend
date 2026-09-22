import mongoose, { Schema } from 'mongoose';
import { randomUUID } from 'crypto';

export interface ISupplier extends mongoose.Document {
  uuid: string;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms?: string;
  leadTimeDays?: number;
  isActive: boolean;
  isDeleted: boolean;
  rating?: number;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>({
  uuid: { type: String, default: () => randomUUID(), unique: true, index: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, maxlength: 500 },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, default: 'India', trim: true },
  gstNumber: { type: String, trim: true, uppercase: true },
  panNumber: { type: String, trim: true, uppercase: true },
  paymentTerms: { type: String },
  leadTimeDays: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false },
  rating: { type: Number, min: 0, max: 5 },
  notes: { type: String, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

supplierSchema.index({ isActive: 1, isDeleted: 1 });
supplierSchema.index({ deletedAt: 1 }, { sparse: true });
supplierSchema.index({ name: 'text', code: 'text' });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
