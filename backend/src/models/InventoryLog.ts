import mongoose, { Schema } from 'mongoose';

export interface IInventoryLog extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  variantSize?: string;
  type: 'restock' | 'sale' | 'reservation' | 'reservation_release' | 'adjustment' | 'admin_adjustment' | 'return';
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reference: string;
  note?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantSize: String,
  type: {
    type: String,
    enum: ['restock', 'sale', 'reservation', 'reservation_release', 'adjustment', 'admin_adjustment', 'return'],
    required: true,
  },
  quantityBefore: { type: Number, required: true },
  quantityChange: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  reference: { type: String, required: true },
  note: String,
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ type: 1 });
inventoryLogSchema.index({ createdAt: -1 });

export const InventoryLog = mongoose.model<IInventoryLog>('InventoryLog', inventoryLogSchema);
