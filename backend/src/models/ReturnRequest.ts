import mongoose, { Schema } from 'mongoose';

/**
 * Canonical return lifecycle statuses.
 * Lowercase snake_case is the canonical form used by all new code.
 * Capitalised legacy values ('Requested', 'Processing', 'Approved',
 * 'Rejected', 'Completed', 'Cancelled') are retained in the enum so
 * pre-existing documents remain valid and readable.
 */
export const RETURN_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'pickup_scheduled',
  'pickup_failed',
  'item_received',
  'inspection_completed',
  'on_hold',
  'refund_processing',
  'refund_failed',
  'completed',
  'cancelled',
  // legacy values (read-compatible)
  'Requested',
  'Processing',
  'Approved',
  'Rejected',
  'Completed',
  'Cancelled',
  'pending',
  'processing',
  'approved',
  'rejected',
  'refunded',
  'escalated',
  'cancelled',
  'picked_up',
] as const;

export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = [
  'Damaged product',
  'Defective or not working',
  'Wrong item delivered',
  'Item missing from package',
  'Size or fit issue',
  'Product not as described',
  'Changed mind',
  'Other',
] as const;

export const RETURN_RESOLUTIONS = ['refund', 'replacement', 'exchange', 'store_credit'] as const;

/** Reasons that qualify for automatic approval when otherwise eligible. */
export const AUTO_APPROVE_REASONS = [
  'Damaged product',
  'Defective or not working',
  'Wrong item delivered',
  'Item missing from package',
] as const;

export interface IReturnItem {
  orderItemId: string;
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  image?: string;
  unitPrice: number;
  purchasedQuantity: number;
  returnQuantity: number;
  reason: string;
  description?: string;
  condition?: string;
  inspectionOutcome?: string;
  // legacy shape support
  orderItemIndex?: number;
  quantity?: number;
  images?: string[];
}

export interface IReturnEvidence {
  url: string;
  uploadedAt: Date;
  uploadedBy?: mongoose.Types.ObjectId;
  kind?: string;
}

export interface IReturnShipment {
  mode: 'pickup' | 'dropoff';
  courier?: string;
  trackingNumber?: string;
  pickupDate?: Date;
  receiptDate?: Date;
  instructions?: string;
  pickupAttempts?: number;
  lastFailureReason?: string;
}

export interface IReturnInspection {
  inspector?: mongoose.Types.ObjectId;
  inspectedAt?: Date;
  condition?: 'excellent' | 'good' | 'damaged' | 'defective' | 'wrong' | 'missing_parts' | 'used';
  quantityReceived?: number;
  findings?: string;
  disposition?: 'restock' | 'quarantine' | 'repair' | 'write_off';
  passed?: boolean;
  refundEligible?: boolean;
}

export interface IRefundTransaction {
  amount: number;
  method: 'original_payment' | 'store_credit' | 'bank_transfer';
  paymentReference?: string;
  transactionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
  initiatedAt?: Date;
  completedAt?: Date;
  initiatedBy?: mongoose.Types.ObjectId;
}

export interface IReturnStatusHistory {
  from: string;
  to: string;
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  timestamp: Date;
  comment?: string;
}

export interface ITimelineStage {
  stage: string;
  completedAt?: Date;
  isActive: boolean;
}

export interface IReturnRequest extends mongoose.Document {
  returnId: string;
  rmaNumber?: string;
  orderId: mongoose.Types.ObjectId;
  orderItemId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: IReturnItem[];
  reason?: string;
  description?: string;
  quantity?: number;
  images?: string[];
  evidence: IReturnEvidence[];
  resolution: 'refund' | 'replacement' | 'exchange' | 'store_credit';
  pickupMode: 'pickup' | 'dropoff';
  pickupAddress?: any;
  shipment: IReturnShipment;
  inspection: IReturnInspection;
  refund: IRefundTransaction;
  eligibility?: {
    checkedAt: Date;
    windowDays: number;
    daysSinceDelivery: number;
    eligible: boolean;
    checks: { rule: string; passed: boolean; detail: string }[];
    autoDecision: 'auto_approve' | 'manual_review' | 'reject';
  };
  orderSnapshot?: {
    orderRef: string;
    purchasedAt?: Date;
    deliveredAt?: Date;
  };
  status: string;
  statusHistory: IReturnStatusHistory[];
  refundAmount: number;
  refundType: 'Full' | 'Partial';
  rejectionReason?: string;
  decisionReason?: string;
  assignedTo?: mongoose.Types.ObjectId;
  handledBy?: mongoose.Types.ObjectId;
  adminNote?: string;
  adminNotes: { note: string; addedBy: mongoose.Types.ObjectId; addedAt: Date }[];
  slaDueAt?: Date;
  approvedAt?: Date;
  pickedUpAt?: Date;
  refundedAt?: Date;
  completedAt?: Date;
  timeline: ITimelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<IReturnItem>(
  {
    orderItemId: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, default: '' },
    name: { type: String, default: '' },
    image: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    purchasedQuantity: { type: Number, required: true, min: 1 },
    returnQuantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    description: { type: String },
    condition: { type: String },
    inspectionOutcome: { type: String },
    orderItemIndex: { type: Number },
    quantity: { type: Number },
    images: [{ type: String }],
  },
  { _id: false },
);

const evidenceSchema = new Schema<IReturnEvidence>(
  {
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    kind: { type: String, default: 'photo' },
  },
  { _id: false },
);

const shipmentSchema = new Schema<IReturnShipment>(
  {
    mode: { type: String, enum: ['pickup', 'dropoff'], default: 'pickup' },
    courier: { type: String },
    trackingNumber: { type: String },
    pickupDate: { type: Date },
    receiptDate: { type: Date },
    instructions: { type: String },
    pickupAttempts: { type: Number, default: 0 },
    lastFailureReason: { type: String },
  },
  { _id: false },
);

const inspectionSchema = new Schema<IReturnInspection>(
  {
    inspector: { type: Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: { type: Date },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'damaged', 'defective', 'wrong', 'missing_parts', 'used'],
    },
    quantityReceived: { type: Number, min: 0 },
    findings: { type: String },
    disposition: { type: String, enum: ['restock', 'quarantine', 'repair', 'write_off'] },
    passed: { type: Boolean },
    refundEligible: { type: Boolean },
  },
  { _id: false },
);

const refundSchema = new Schema<IRefundTransaction>(
  {
    amount: { type: Number, default: 0, min: 0 },
    method: {
      type: String,
      enum: ['original_payment', 'store_credit', 'bank_transfer'],
      default: 'original_payment',
    },
    paymentReference: { type: String },
    transactionStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    failureReason: { type: String },
    initiatedAt: { type: Date },
    completedAt: { type: Date },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IReturnStatusHistory>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    comment: { type: String },
  },
  { _id: false },
);

const returnRequestSchema = new Schema<IReturnRequest>(
  {
    returnId: { type: String, required: true, unique: true },
    rmaNumber: { type: String, unique: true, sparse: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderItemId: { type: Schema.Types.ObjectId, ref: 'Order' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String },
    description: { type: String },
    quantity: { type: Number },
    images: [{ type: String }],
    evidence: { type: [evidenceSchema], default: [] },
    resolution: {
      type: String,
      enum: ['refund', 'replacement', 'exchange', 'store_credit'],
      default: 'refund',
    },
    pickupMode: { type: String, enum: ['pickup', 'dropoff'], default: 'pickup' },
    pickupAddress: { type: Schema.Types.Mixed },
    shipment: { type: shipmentSchema, default: () => ({}) },
    inspection: { type: inspectionSchema, default: () => ({}) },
    refund: { type: refundSchema, default: () => ({}) },
    eligibility: { type: Schema.Types.Mixed },
    orderSnapshot: { type: Schema.Types.Mixed },
    items: { type: [returnItemSchema], default: [] },
    status: {
      type: String,
      enum: RETURN_STATUSES as unknown as string[],
      default: 'submitted',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    refundAmount: { type: Number, default: 0 },
    refundType: { type: String, enum: ['Full', 'Partial'], default: 'Full' },
    rejectionReason: { type: String },
    decisionReason: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adminNote: { type: String },
    approvedAt: { type: Date },
    pickedUpAt: { type: Date },
    refundedAt: { type: Date },
    completedAt: { type: Date },
    slaDueAt: { type: Date },
    adminNotes: [
      {
        note: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        stage: { type: String, required: true },
        completedAt: Date,
        isActive: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ userId: 1 });
returnRequestSchema.index({ status: 1 });
returnRequestSchema.index({ rmaNumber: 1 });
returnRequestSchema.index({ createdAt: -1 });

export const ReturnRequest = mongoose.model<IReturnRequest>('ReturnRequest', returnRequestSchema);
