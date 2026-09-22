import { Response, NextFunction } from 'express';
import { Payment } from '../models/Payment';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import {
  createPaymentOrderSchema,
  createDirectPaymentOrderSchema,
  verifyPaymentSchema,
  refundPaymentSchema,
} from '../validators';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  capturePayment,
  createRefund,
  verifyWebhookSignature,
} from '../services/razorpay.service';
import { generateOrderId, generateInvoiceNumber } from '../services/orderId.service';
import { reserveStock } from '../services/inventory.service';
import { Types } from 'mongoose';

import { mapAddressForDb } from './checkout.controller';
import { APPROVED_ORDER_STATUSES, logAnalyticsEvent } from '../services/regionalAnalytics.service';

export const createPaymentOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createPaymentOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { orderId, amount, currency } = validation.data;

    const order = await Order.findById(orderId);
    if (!order) return sendError(res, 'Order not found', 404);
    if (order.userId.toString() !== req.user.userId) {
      return sendError(res, 'Not authorized', 403);
    }

    const razorpayOrder = await createRazorpayOrder(amount, currency, `ord_${orderId}`);

    const payment = await Payment.create({
      userId: new Types.ObjectId(req.user.userId),
      orderId: new Types.ObjectId(orderId),
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: currency || 'INR',
      status: 'created',
    });

    sendSuccess(res, {
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        key: process.env.RAZORPAY_KEY_ID,
        paymentDbId: payment._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDirectPaymentOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log(`[CREATE DIRECT PAYMENT] Called - user: ${req.user?.userId}, body keys: ${Object.keys(req.body).join(', ')}`);

    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createDirectPaymentOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { amount, currency, items, shippingAddress, subtotal, shippingCharges, discountAmount, promoCode, promoDiscount, coupon } = validation.data;

    const userId = new Types.ObjectId(req.user.userId);

    // SECURITY / DATA-INTEGRITY: never trust the client for what product was
    // actually bought. Every item must resolve to a real, active product in
    // MongoDB via productId — the order snapshot (name/image/category) is
    // built from that authoritative record, not from whatever the browser
    // happened to send. This is what previously let a stale/placeholder cart
    // payload silently create an order for the wrong product.
    const productIds = (items || []).map(item => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
      isDeleted: false,
    });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const missing = productIds.filter(id => !productMap.has(id));
    if (missing.length > 0) {
      return sendError(res, 'One or more items in your order are no longer available. Please refresh your cart and try again.', 400);
    }

    const orderItems = (items || []).map(item => {
      const product = productMap.get(item.productId)!;
      return {
        productId: product._id,
        name: product.name,
        image: product.images?.[0]?.url || item.image || '',
        sku: product.sku || '',
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        mrpPrice: item.sellingPrice,
        gstRate: product.gstRate ?? 5,
        gstAmount: Math.round((item.sellingPrice * item.quantity * (product.gstRate ?? 5)) / 100),
        lineTotal: item.sellingPrice * item.quantity,
      };
    });

    const totalGst = orderItems.reduce((s, i: any) => s + i.gstAmount, 0);

    const order = await Order.create({
      orderId: generateOrderId(),
      userId,
      customerName: shippingAddress?.fullName || 'Customer',
      items: orderItems,
      shippingAddress: mapAddressForDb(shippingAddress),
      billingAddress: mapAddressForDb(shippingAddress),
      shippingMethod: 'standard',
      shippingAmount: shippingCharges || 0,
      subtotal: subtotal || amount,
      totalDiscount: discountAmount + promoDiscount,
      scratchDiscount: discountAmount ? { discountAmount } : null,
      promoDiscount: promoCode ? { code: promoCode, discountAmount: promoDiscount } : null,
      cgst: Math.round(totalGst / 2),
      sgst: Math.round(totalGst / 2),
      igst: 0,
      totalGst,
      orderTotal: amount,
      totalAmount: amount,
      paymentStatus: 'Pending',
      paymentMethod: 'razorpay',
      orderStatus: 'Pending Approval',
      status: 'pending_approval',
      statusHistory: [{ status: 'pending_approval', changedBy: userId }],
      invoiceNumber: generateInvoiceNumber(),
    } as any);

    if (coupon?.couponId) {
      try {
        await Coupon.findByIdAndUpdate(coupon.couponId, { $inc: { usedCount: 1 } });
      } catch (couponErr: any) {
        console.error(`[CREATE DIRECT PAYMENT] Failed to increment coupon usedCount for ${coupon.couponId}:`, couponErr?.message || couponErr);
      }
    }

    const razorpayOrder = await createRazorpayOrder(amount, currency, `ord_${order._id}`);

    const payment = await Payment.create({
      userId,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: currency || 'INR',
      status: 'created',
    });

    sendSuccess(res, {
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        key: process.env.RAZORPAY_KEY_ID,
        paymentDbId: payment._id,
        orderDbId: order._id,
        orderId: order.orderId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validation = verifyPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = validation.data;

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { status: 'failed', failureReason: 'Signature verification failed' }
      );

      await Order.findByIdAndUpdate(orderId, { orderStatus: 'Cancelled', status: 'cancelled', paymentStatus: 'Failed' });
      return sendError(res, 'Payment verification failed', 400);
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        status: 'captured',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      { new: true }
    );

    const order = await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'Paid',
      status: 'pending_approval',
      orderStatus: 'Pending Approval',
      paidAt: new Date(),
    }, { new: true });

    if (order) {
      for (const item of order.items) {
        if (item.productId) {
          try {
            await reserveStock(item.productId, item.quantity, item.variantSize, `payment_${order._id}`);
          } catch (stockErr: any) {
            console.error(`[VERIFY PAYMENT] reserveStock failed for product ${item.productId}:`, stockErr?.message || stockErr);
          }
        }
      }

      // Analytics and stock-commit moved to order.controller.ts
      // updateOrderStatus (the 'accepted' transition) — stock must NOT
      // change on payment, only when the seller confirms the order.
    }

    sendSuccess(res, { data: payment, message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
};

export const initiateRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const validation = refundPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { paymentId, amount, reason } = validation.data;

    const payment = await Payment.findById(paymentId);
    if (!payment) return sendError(res, 'Payment not found', 404);
    if (payment.status !== 'captured') {
      return sendError(res, `Payment is in ${payment.status} status, cannot refund`, 400);
    }

    const refund = await createRefund(payment.razorpayPaymentId!, amount);

    payment.status = 'refunded';
    payment.refundId = refund.id;
    payment.refundAmount = amount || payment.amount;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    await payment.save();

    const order = await Order.findById(payment.orderId);
    if (order) {
      const wasApproved = APPROVED_ORDER_STATUSES.includes(order.status);
      if (wasApproved || order.paymentMethod === 'cod') {
        const refundAmt = amount || payment.amount || order.totalAmount || order.orderTotal || 0;
        await logAnalyticsEvent(
          order._id,
          order.orderId,
          order.shippingAddress?.state || 'Unknown',
          'order_refunded',
          order.status,
          'refunded',
          -refundAmt,
          req.user?.userId
        );
      }
      order.paymentStatus = 'Refunded';
      order.status = 'refunded';
      await order.save();
    }

    sendSuccess(res, { data: payment, message: 'Refund initiated' });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return sendError(res, 'Payment not found', 404);

    if (payment.userId.toString() !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 'Not authorized', 403);
    }

    sendSuccess(res, { data: payment });
  } catch (error) {
    next(error);
  }
};

export const getPaymentByOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) return sendError(res, 'Payment not found for this order', 404);

    if (payment.userId.toString() !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 'Not authorized', 403);
    }

    sendSuccess(res, { data: payment });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    const isValid = verifyWebhookSignature(JSON.stringify(req.body), signature, secret);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case 'payment.captured': {
        const paymentData = payload.payment.entity;
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: paymentData.id },
          {
            status: 'captured',
            amount: paymentData.amount / 100,
            method: paymentData.method,
            paidAt: new Date(paymentData.created_at * 1000),
            bank: paymentData.bank,
            wallet: paymentData.wallet,
            vpa: paymentData.vpa,
          }
        );
        break;
      }

      case 'payment.failed': {
        const failedPayment = payload.payment.entity;
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: failedPayment.id },
          {
            status: 'failed',
            failureReason: failedPayment.error_description || 'Payment failed',
          }
        );
        break;
      }

      case 'refund.created': {
        const refundData = payload.refund.entity;
        await Payment.findOneAndUpdate(
          { razorpayPaymentId: refundData.payment_id },
          { status: 'refunded', refundId: refundData.id }
        );
        break;
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};
