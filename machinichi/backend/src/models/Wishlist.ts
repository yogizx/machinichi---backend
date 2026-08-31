import mongoose, { Schema } from 'mongoose';

export interface IWishlistProduct {
  productId: mongoose.Types.ObjectId;
  variantSize?: string;
  addedAt: Date;
}

export interface IWishlist extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  products: IWishlistProduct[];
  createdAt: Date;
  updatedAt: Date;
}

// Enterprise note: userId is now OPTIONAL and sessionId (guestId) is
// supported, mirroring the Cart model, so anonymous shoppers can wishlist
// products before logging in. Exactly one of userId/sessionId is set per
// document — see wishlist.controller.ts for the guest→user merge flow.
const wishlistSchema = new Schema<IWishlist>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, unique: true },
  sessionId: { type: String, sparse: true, unique: true },
  products: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSize: String,
    addedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

wishlistSchema.index({ 'products.productId': 1 });

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);
