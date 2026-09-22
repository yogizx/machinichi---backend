import mongoose, { Schema } from 'mongoose';

export interface ICategory extends mongoose.Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: mongoose.Types.ObjectId;
  isActive: boolean;
  displayOrder: number;
  productCount: number;
  seo: { metaTitle?: string; metaDescription?: string };
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  image: { type: String },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'Category', sparse: true, index: true },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 },
  seo: {
    metaTitle: String,
    metaDescription: String,
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

categorySchema.index({ isActive: 1 });
categorySchema.index({ displayOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
