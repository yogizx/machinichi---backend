import { Response, NextFunction } from 'express';
import { Cart } from '../models/Cart';
import { Order } from '../models/Order';
import { Coupon } from '../models/Coupon';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError } from '../services/apiResponse';
import { createOrderSchema, applyCouponSchema } from '../validators';
import { Types } from 'mongoose';
import { deductStock, releaseStock } from '../services/inventory.service';
import { calculateOrderTax, getGstRateForCategory } from '../services/tax.service';
import { generateOrderId, generateInvoiceNumber } from '../services/orderId.service';
import { sendOrderConfirmationNotifications } from '../services/notification.service';
import { bulkRecordPurchases } from '../services/analytics.service';

export const mapAddressForDb = (addr: any) => {
  if (!addr) return undefined;
  return {
    fullName: addr.fullName || 'Customer',
    phoneNumber: addr.phone || addr.phoneNumber || addr.mobileNumber || '0000000000',
    streetAddress: addr.addressLine1 || addr.streetAddress || '',
    city: addr.city || '',
    zipCode: addr.pincode || addr.zipCode || '000000',
    state: addr.state || '',
    country: addr.country || 'India',
    mobileNumber: addr.phone || addr.mobileNumber || addr.phoneNumber || '0000000000',
    houseFlat: addr.addressLine2 || addr.houseFlat || '',
    streetArea: addr.streetArea || addr.addressLine1 || addr.streetAddress || '',
    landmark: addr.landmark || '',
    pincode: addr.pincode || addr.zipCode || '000000',
    deliveryInstructions: addr.deliveryInstructions || '',
    isDefault: addr.isDefault || false,
  };
};

export const getCheckoutSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const cart = await Cart.findOne({ userId: new Types.ObjectId(req.user.userId) })
      .populate({
        path: 'items.productId',
        select: 'name slug images sellingPrice mrp quantity variants gstRate hsnCode isActive',
      });

    if (!cart || cart.items.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    const validItems = cart.items.filter((item: any) => {
      const product = item.productId;
      return product && product.isActive && !product.isDeleted;
    });

    if (validItems.length === 0) {
      return sendError(res, 'No valid items in cart', 400);
    }

    const items = validItems.map((item: any) => ({
      productId: item.productId._id,
      name: item.productId.name,
      image: item.productId.images?.[0] || '',
      variantSize: item.variantSize,
      quantity: item.quantity,
      mrp: item.mrp || item.productId.mrp,
      sellingPrice: item.sellingPrice || item.productId.sellingPrice,
      gstRate: item.productId.gstRate || 5,
      lineTotal: (item.sellingPrice || item.productId.sellingPrice) * item.quantity,
    }));

    const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
    const totalMrp = items.reduce((sum: number, item: any) => sum + item.mrp * item.quantity, 0);
    const totalDiscount = totalMrp - subtotal;
    const { cgst, sgst, igst, totalGst } = calculateOrderTax(items, true);
    const shippingCharges = subtotal >= 500 ? 0 : 40;

    sendSuccess(res, {
      data: {
        items,
        summary: {
          totalMrp,
          totalDiscount,
          subtotal,
          shippingCharges,
          cgst,
          sgst,
          igst,
          totalGst,
          totalPayable: subtotal + shippingCharges + totalGst,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const placeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const userId = new Types.ObjectId(req.user.userId);
    const orderData = validation.data;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: 'items.productId',
        select: 'name slug images sellingPrice mrp quantity variants gstRate hsnCode isActive',
      });

    if (!cart || cart.items.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    const validItems = cart.items.filter((item: any) => {
      const product = item.productId;
      return product && product.isActive && !product.isDeleted;
    });

    if (validItems.length === 0) {
      return sendError(res, 'No valid items in cart', 400);
    }

    const items = validItems.map((item: any) => {
      const product = item.productId;
      return {
        productId: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        variantSize: item.variantSize,
        quantity: item.quantity,
        mrp: item.mrp || product.mrp,
        sellingPrice: item.sellingPrice || product.sellingPrice,
        gstRate: product.gstRate || 5,
        lineTotal: (item.sellingPrice || product.sellingPrice) * item.quantity,
      };
    });

    const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotal, 0);
    const totalMrp = items.reduce((sum: number, item: any) => sum + item.mrp * item.quantity, 0);
    const totalDiscount = totalMrp - subtotal;
    const { cgst, sgst, igst, totalGst } = calculateOrderTax(items, orderData.isIntraState);
    const shippingCharges = orderData.shippingCharges ?? (subtotal >= 500 ? 0 : 40);

    const orderRef = generateOrderId();

    const orderTotal = subtotal + shippingCharges + totalGst;

    const order = await Order.create({
      orderId: orderRef,
      userId,
      customerName: orderData.shippingAddress?.fullName || 'Customer',
      items: items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        variantSize: item.variantSize,
        quantity: item.quantity,
        mrpPrice: item.mrp,
        sellingPrice: item.sellingPrice,
        gstRate: item.gstRate,
        lineTotal: item.lineTotal,
      })),
      shippingAddress: mapAddressForDb(orderData.shippingAddress),
      billingAddress: mapAddressForDb(orderData.billingAddress || orderData.shippingAddress),
      paymentMethod: orderData.paymentMethod,
      subtotal,
      totalMrp,
      totalDiscount,
      cgst,
      sgst,
      igst,
      totalGst,
      shippingCharges,
      totalAmount: orderTotal,
      orderTotal,
      couponCode: orderData.coupon?.code,
      couponId: orderData.coupon?.couponId ? new Types.ObjectId(orderData.coupon.couponId) : undefined,
      scratchDiscount: orderData.coupon?.discountAmount || 0,
      invoiceNumber: generateInvoiceNumber(),
      status: 'pending_approval',
      paymentStatus: 'Pending',
      orderStatus: 'Pending Approval',
      statusHistory: [{ status: 'pending_approval', changedBy: userId }],
    } as any);

    // Enterprise inventory rule: stock decreases ONLY after successful payment
    // *and* successful order creation. For COD there is no separate payment
    // capture step, so order creation IS the confirmed commitment and stock is
    // deducted immediately. For online payment methods, deduction must wait for
    // the payment-verification step (see payment.controller.ts verifyPayment) —
    // deducting here, before payment is even attempted, would let an abandoned
    // or failed online payment permanently understate stock.
    if (orderData.paymentMethod === 'cod') {
      for (const item of items) {
        await deductStock(item.productId, item.quantity, item.variantSize, `order_${order._id}`, userId);
      }
    }

    cart.items = [];
    await cart.save();

    if (orderData.coupon?.couponId) {
      await Coupon.findByIdAndUpdate(orderData.coupon.couponId, { $inc: { usedCount: 1 } });
    }

    // Same rule as inventory: a sale is only real once it's paid for (COD is
    // paid-on-delivery but the order itself is the confirmed commitment, so it
    // counts now; online orders don't count here — they're recorded in
    // verifyPayment once the payment actually captures).
    if (orderData.paymentMethod === 'cod') {
      const body = req.body as Record<string, unknown>;
      const reqGuestId = typeof body?.guestId === 'string' ? body.guestId
        : Array.isArray(req.headers['x-guest-id']) ? req.headers['x-guest-id'][0]
        : typeof req.headers['x-guest-id'] === 'string' ? req.headers['x-guest-id']
        : typeof body?.sessionId === 'string' ? body.sessionId
        : Array.isArray(req.headers['x-session-id']) ? req.headers['x-session-id'][0]
        : typeof req.headers['x-session-id'] === 'string' ? req.headers['x-session-id']
        : '';

      await bulkRecordPurchases(
        items.map((i: any) => ({ productId: i.productId, quantity: i.quantity, price: i.sellingPrice })),
        req.user!.userId,
        reqGuestId,
      );
    }

    await sendOrderConfirmationNotifications(userId, order._id, orderRef);

    sendSuccess(res, { data: order }, 201);
  } catch (error) {
    next(error);
  }
};

export const applyCoupon = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = applyCouponSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { code, orderAmount, totalQuantity, items } = validation.data;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      status: 'active',
      startsAt: { $lte: new Date() },
      expiresAt: { $gte: new Date() },
    });

    if (!coupon) return sendError(res, 'Invalid or expired coupon', 400);

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return sendError(res, 'Coupon usage limit reached', 400);
    }

    if (coupon.perUserLimit > 0) {
      const userOrderCount = await Order.countDocuments({
        userId: new Types.ObjectId(req.user.userId),
        couponId: coupon._id,
      });
      if (userOrderCount >= coupon.perUserLimit) {
        return sendError(res, 'You have already used this coupon', 400);
      }
    }

    if (coupon.minOrderAmount > 0 && orderAmount < coupon.minOrderAmount) {
      return sendError(res, `Minimum order amount of ₹${coupon.minOrderAmount} required`, 400);
    }

    if (coupon.minQuantity > 0) {
      const qty = totalQuantity || items.reduce((sum, item) => sum + item.quantity, 0);
      if (qty < coupon.minQuantity) {
        return sendError(res, `Minimum ${coupon.minQuantity} items required for this coupon`, 400);
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === 'Percentage') {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'Free Delivery') {
      discountAmount = 0;
    }

    sendSuccess(res, {
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        description: coupon.description,
        name: coupon.name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const validateCheckout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const cart = await Cart.findOne({ userId: new Types.ObjectId(req.user.userId) })
      .populate({
        path: 'items.productId',
        select: 'name slug sellingPrice quantity variants isActive',
      });

    if (!cart || cart.items.length === 0) {
      return sendError(res, 'Cart is empty', 400);
    }

    const errors: any[] = [];

    for (const item of cart.items) {
      const product: any = item.productId;
      if (!product) {
        errors.push({ productId: item.productId, message: 'Product not found' });
        continue;
      }
      if (!product.isActive || product.isDeleted) {
        errors.push({ productId: product._id, name: product.name, message: 'Product is no longer available' });
        continue;
      }
      if (item.variantSize) {
        const variant = product.variants?.find((v: any) => v.size === item.variantSize);
        if (!variant || variant.quantity < item.quantity) {
          errors.push({
            productId: product._id,
            name: product.name,
            variantSize: item.variantSize,
            available: variant?.quantity || 0,
            requested: item.quantity,
            message: `Insufficient stock for ${product.name} (${item.variantSize})`,
          });
        }
      } else {
        if (product.quantity < item.quantity) {
          errors.push({
            productId: product._id,
            name: product.name,
            available: product.quantity,
            requested: item.quantity,
            message: `Insufficient stock for ${product.name}`,
          });
        }
      }
    }

    sendSuccess(res, {
      data: {
        valid: errors.length === 0,
        errors,
        itemCount: cart.items.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
