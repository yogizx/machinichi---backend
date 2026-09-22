import mongoose, { Schema } from 'mongoose';

export interface ISavedItem {
  productId: mongoose.Types.ObjectId;
  variantSize?: string;
  name: string;
  image?: string;
  sellingPrice: number;
  quantity: number;
  savedAt: Date;
}

export interface ISavedForLater extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  items: ISavedItem[];
  createdAt: Date;
  updatedAt: Date;
}

const savedForLaterSchema = new Schema<ISavedForLater>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSize: String,
    name: String,
    image: String,
    sellingPrice: Number,
    quantity: { type: Number, default: 1 },
    savedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export const SavedForLater = mongoose.model<ISavedForLater>('SavedForLater', savedForLaterSchema);
