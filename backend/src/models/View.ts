import mongoose, { Schema } from 'mongoose';

export interface IView extends mongoose.Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  productId: mongoose.Types.ObjectId;
  firstViewedAt: Date;
  lastViewedAt: Date;
}

const viewSchema = new Schema<IView>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  sessionId: { type: String, sparse: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  firstViewedAt: { type: Date, default: Date.now },
  lastViewedAt: { type: Date, default: Date.now },
});

viewSchema.index({ userId: 1, productId: 1 }, { unique: true, partialFilterExpression: { userId: { $exists: true } } });
viewSchema.index({ sessionId: 1, productId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $exists: true } } });
viewSchema.index({ productId: 1 });
viewSchema.index({ lastViewedAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

export const View = mongoose.model<IView>('View', viewSchema);
