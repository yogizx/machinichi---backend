import mongoose, { Schema } from 'mongoose';

export interface IAddress extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  fullName: string;
  phoneNumber?: string;
  streetAddress?: string;
  city: string;
  zipCode?: string;
  mobileNumber: string;
  country: string;
  state: string;
  pincode: string;
  streetArea: string;
  houseFlat: string;
  landmark?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  label?: string;
}

const addressSchema = new Schema<IAddress>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  phoneNumber: { type: String, trim: true },
  streetAddress: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  zipCode: { type: String, trim: true },
  mobileNumber: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  streetArea: { type: String, required: true, trim: true },
  houseFlat: { type: String, required: true, trim: true },
  landmark: { type: String, trim: true },
  deliveryInstructions: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
  label: { type: String, default: 'Home' },
}, { timestamps: true });

export const Address = mongoose.model<IAddress>('Address', addressSchema);

