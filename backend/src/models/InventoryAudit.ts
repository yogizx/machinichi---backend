import mongoose, { Schema } from 'mongoose';

export interface IInventoryAudit extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  variantSku?: string;
  auditType: 'opening' | 'adjustment' | 'cycle_count' | 'year_end';
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason?: string;
  reference?: string;
  performedBy: mongoose.Types.ObjectId;
  warehouse?: string;
  rackLocation?: string;
  batchNumber?: string;
  lotNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryAuditSchema = new Schema<IInventoryAudit>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantSku: { type: String, index: true },
  auditType: { type: String, enum: ['opening', 'adjustment', 'cycle_count', 'year_end'], required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  quantityChange: { type: Number, required: true },
  reason: { type: String, maxlength: 500 },
  reference: { type: String },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  warehouse: String,
  rackLocation: String,
  batchNumber: String,
  lotNumber: String,
}, { timestamps: true });

inventoryAuditSchema.index({ productId: 1, createdAt: -1 });
inventoryAuditSchema.index({ auditType: 1 });

export const InventoryAudit = mongoose.model<IInventoryAudit>('InventoryAudit', inventoryAuditSchema);
