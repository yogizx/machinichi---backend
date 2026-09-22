import mongoose, { Schema } from 'mongoose';

export interface IOrderItem {
  productId?: mongoose.Types.ObjectId;
  variantSize?: string;
  name: string;
  image?: string;
  sku: string;
  hsnCode?: string;
  mrpPrice: number;
  sellingPrice: number;
  quantity: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  returnStatus: 'None' | 'Requested' | 'Approved' | 'Rejected' | 'Refunded';
  returnReason?: string;
}

export interface IStatusHistory {
  status: string;
  changedBy: mongoose.Types.ObjectId;
  notes?: string;
  changedAt?: Date;
}

export interface IDelayEntry {
  reason: string;
  expectedDate: Date;
  customerNote?: string;
  createdAt: Date;
}

export interface IOrder extends mongoose.Document {
  orderId: string;
  userId: mongoose.Types.ObjectId;
  customerName?: string;
  items: IOrderItem[];
  shippingAddress: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
    state?: string;
    zipCode: string;
    country?: string;
    mobileNumber?: string;
    houseFlat?: string;
    streetArea?: string;
    landmark?: string;
    pincode?: string;
    deliveryInstructions?: string;
    isDefault?: boolean;
  };
  billingAddress?: {
    fullName: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
    state?: string;
    zipCode: string;
    country?: string;
  };
  shippingMethod: 'standard' | 'express';
  shippingAmount: number;
  subtotal: number;
  totalDiscount: number;
  totalMrp?: number;
  scratchDiscount: { discountType?: string; discountValue?: number; discountAmount?: number; label?: string } | null;
  promoDiscount: { code?: string; discountType?: string; discountValue?: number; discountAmount?: number; description?: string } | null;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  orderTotal: number;
  totalAmount?: number;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded' | 'Partially Refunded';
  paymentMethod: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  orderStatus: 'Pending Approval' | 'Accepted' | 'Packed' | 'Shipped' | 'In Transit' | 'Out For Delivery' | 'Delivered' | 'Cancelled' | 'Returned';
  status: string;
  statusHistory: IStatusHistory[];
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  shippedAt?: Date;
  returnedAt?: Date;
  paidAt?: Date;
  acceptedAt?: Date;
  packedAt?: Date;
  outForDeliveryAt?: Date;
  deliveryInstructions?: { notes?: string; preferredTime?: string; alternatePhone?: string };
  cancelReason?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: 'user' | 'admin';
  refundRequired?: boolean;
  returnRequestId?: mongoose.Types.ObjectId;
  couponCode?: string;
  couponId?: mongoose.Types.ObjectId;
  isIntraState?: boolean;
  shippingCharges?: number;
  invoiceUrl?: string;
  invoiceNumber?: string;
  shippingLabelUrl?: string;
  courierName?: string;
  packageWeight?: number;
  reviewEligible?: boolean;
  delayHistory?: IDelayEntry[];
  notes?: { text: string; addedBy: mongoose.Types.ObjectId; addedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  customerName: { type: String },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    variantSize: String,
    name: { type: String, required: true },
    image: String,
    sku: { type: String, default: '' },
    hsnCode: String,
    mrpPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    gstRate: { type: Number, default: 5 },
    gstAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
    returnStatus: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected', 'Refunded'], default: 'None' },
    returnReason: String,
  }],
  shippingAddress: {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    mobileNumber: String,
    houseFlat: String,
    streetArea: String,
    landmark: String,
    pincode: String,
    deliveryInstructions: String,
    isDefault: Boolean,
  },
  billingAddress: {
    fullName: String,
    phoneNumber: String,
    streetAddress: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  shippingMethod: { type: String, enum: ['standard', 'express'], default: 'standard' },
  shippingAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  scratchDiscount: {
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    label: String,
  },
  promoDiscount: {
    code: String,
    discountType: String,
    discountValue: Number,
    discountAmount: Number,
    description: String,
  },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalGst: { type: Number, default: 0 },
  orderTotal: { type: Number, required: true },
  totalAmount: { type: Number },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'], default: 'Pending' },
  paymentMethod: { type: String, default: 'razorpay' },
  razorpayOrderId: { type: String, sparse: true },
  razorpayPaymentId: { type: String, sparse: true },
  razorpaySignature: { type: String },
  orderStatus: {
    type: String,
    enum: ['Pending Approval', 'Accepted', 'Packed', 'Shipped', 'In Transit', 'Out For Delivery', 'Delivered', 'Cancelled', 'Returned'],
    default: 'Pending Approval',
  },
  status: { type: String, default: 'pending_approval' },
  statusHistory: [{ status: String, changedBy: { type: Schema.Types.ObjectId, ref: 'User' }, notes: String, changedAt: { type: Date, default: Date.now } }],
  trackingNumber: { type: String },
  trackingUrl: { type: String },
  estimatedDelivery: { type: Date },
  deliveredAt: { type: Date },
  shippedAt: { type: Date },
  returnedAt: { type: Date },
  paidAt: { type: Date },
  acceptedAt: { type: Date },
  packedAt: { type: Date },
  outForDeliveryAt: { type: Date },
  deliveryInstructions: {
    notes: String,
    preferredTime: String,
    alternatePhone: String,
  },
  cancelReason: { type: String },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  cancelledBy: { type: String, enum: ['user', 'admin'] },
  refundRequired: { type: Boolean, default: false },
  returnRequestId: { type: Schema.Types.ObjectId, ref: 'ReturnRequest' },
  couponCode: { type: String },
  couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  isIntraState: { type: Boolean },
  shippingCharges: { type: Number },
  invoiceUrl: { type: String },
  invoiceNumber: { type: String },
  shippingLabelUrl: { type: String },
  courierName: { type: String },
  packageWeight: { type: Number },
  reviewEligible: { type: Boolean, default: false },
  delayHistory: [{
    reason: { type: String, required: true },
    expectedDate: { type: Date, required: true },
    customerNote: String,
    createdAt: { type: Date, default: Date.now },
  }],
  notes: [{
    text: String,
    addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

orderSchema.index({ createdAt: -1 });

orderSchema.index({ 'shippingAddress.state': 1, status: 1, createdAt: -1 });
orderSchema.index({ 'shippingAddress.state': 1, userId: 1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
