import { Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import {
  createOrderSchema,
  orderStatusUpdateSchema,
  orderHistoryQuerySchema,
} from '../validators';
import { deductStock, releaseStock, releaseReservation } from '../services/inventory.service';
import { bulkRecordPurchases } from '../services/analytics.service';
import { Types } from 'mongoose';
import { mapAddressForDb } from './checkout.controller';
import { APPROVED_ORDER_STATUSES, logAnalyticsEvent } from '../services/regionalAnalytics.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending_approval': ['accepted', 'cancelled'],
  'accepted': ['packed', 'delayed', 'cancelled'],
  'packed': ['shipped', 'delayed', 'cancelled'],
  'shipped': ['in_transit', 'out_for_delivery', 'delayed'],
  'in_transit': ['out_for_delivery', 'delayed'],
  'out_for_delivery': ['delivered', 'delayed'],
  'delivered': [],
  'cancelled': [],
  'returned': [],
};

const STATUS_DISPLAY: Record<string, string> = {
  'pending_approval': 'Pending Approval',
  'accepted': 'Accepted',
  'packed': 'Packed',
  'shipped': 'Shipped',
  'in_transit': 'In Transit',
  'out_for_delivery': 'Out For Delivery',
  'delivered': 'Delivered',
  'delayed': 'Delayed',
  'cancelled': 'Cancelled',
  'returned': 'Returned',
};

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const orderData = validation.data;
    const subtotal = orderData.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);

    const order = await Order.create({
      userId: new Types.ObjectId(req.user.userId),
      customerName: orderData.shippingAddress?.fullName || 'Customer',
      items: orderData.items.map((item: any) => ({
        productId: new Types.ObjectId(item.productId),
        name: item.name,
        image: item.image,
        variantSize: item.variantSize,
        quantity: item.quantity,
        mrpPrice: item.mrp,
        sellingPrice: item.sellingPrice,
        gstRate: item.gstRate,
        lineTotal: item.sellingPrice * item.quantity,
      })),
      shippingAddress: mapAddressForDb(orderData.shippingAddress),
      billingAddress: mapAddressForDb(orderData.billingAddress || orderData.shippingAddress),
      paymentMethod: orderData.paymentMethod,
      subtotal,
      totalDiscount: orderData.coupon?.discountAmount || 0,
      couponCode: orderData.coupon?.code || undefined,
      couponId: orderData.coupon?.couponId ? new Types.ObjectId(orderData.coupon.couponId) : undefined,
      shippingCharges: orderData.shippingCharges || 0,
      isIntraState: orderData.isIntraState,
      notes: orderData.notes,
      orderTotal: subtotal + (orderData.shippingCharges || 0) - (orderData.coupon?.discountAmount || 0),
      totalAmount: subtotal + (orderData.shippingCharges || 0) - (orderData.coupon?.discountAmount || 0),
    } as any);

    await order.populate('items.productId', 'name slug images');

    sendSuccess(res, { data: order }, 201);
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = orderHistoryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, status, startDate, endDate, search } = validation.data;
    const filter: any = { userId: new Types.ObjectId(req.user.userId) };

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (search && search.trim()) {
      const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { orderId: regex },
        { 'items.name': regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.productId', 'name slug images'),
      Order.countDocuments(filter),
    ]);

    sendPaginated(res, orders, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let order;
    if (req.params.orderId) {
      order = await Order.findOne({ orderId: req.params.orderId })
        .populate('userId', 'fullName email phone createdAt')
        .populate('items.productId', 'name slug images');
    } else {
      order = await Order.findById(req.params.id)
        .populate('userId', 'fullName email phone createdAt')
        .populate('items.productId', 'name slug images');
    }

    if (!order) return sendError(res, 'Order not found', 404);

    if (req.params.orderId) {
      // Public tracking endpoint — return limited fields for guest access
      return sendSuccess(res, {
        data: {
          orderId: order.orderId,
          status: order.status,
          orderStatus: order.orderStatus,
          statusHistory: order.statusHistory,
          estimatedDelivery: order.estimatedDelivery,
          delayHistory: order.delayHistory,
          items: order.items.map(i => ({ name: i.name, image: i.image, quantity: i.quantity, sku: i.sku })),
          shippingAddress: order.shippingAddress,
          trackingNumber: order.trackingNumber,
          courierName: order.courierName,
          deliveredAt: order.deliveredAt,
          cancelledAt: order.cancelledAt,
          cancellationReason: order.cancellationReason,
        },
      });
    }

    if (req.user?.userId && order.userId.toString() !== req.user.userId && !req.user?.isAdmin) {
      return sendError(res, 'Not authorized to view this order', 403);
    }

    let customerTotalOrders = 0;
    let customerLifetimeSpend = 0;

    if (order.userId) {
      const uId = (order.userId as any)._id || order.userId;
      customerTotalOrders = await Order.countDocuments({ userId: uId });
      
      const lifetimeResult = await Order.aggregate([
        {
          $match: {
            userId: uId,
            status: { $in: APPROVED_ORDER_STATUSES }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$totalAmount', '$orderTotal'] } }
          }
        }
      ]);
      customerLifetimeSpend = lifetimeResult[0]?.total || 0;
    }

    const orderObj = order.toObject();
    (orderObj as any).customerTotalOrders = customerTotalOrders;
    (orderObj as any).customerLifetimeSpend = customerLifetimeSpend;

    sendSuccess(res, { data: orderObj });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);

    if (order.userId.toString() !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 'Not authorized to cancel this order', 403);
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return sendError(res, `Cannot cancel order in ${order.status} status`, 400);
    }

    const originalStatus = order.status;
    const { reason, refundRequired } = req.body;

    order.status = 'cancelled';
    order.orderStatus = 'Cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user.isAdmin ? 'admin' : 'user';
    order.cancellationReason = reason || '';
    order.refundRequired = refundRequired || false;
    if (reason) order.cancelReason = reason;
    order.statusHistory.push({ status: 'cancelled', changedBy: new Types.ObjectId(req.user.userId), notes: reason } as any);
    await order.save();

    const wasApproved = APPROVED_ORDER_STATUSES.includes(originalStatus);
    if (wasApproved || order.paymentMethod === 'cod') {
      await logAnalyticsEvent(
        order._id,
        order.orderId,
        order.shippingAddress?.state || 'Unknown',
        'order_cancelled',
        originalStatus,
        'cancelled',
        -(order.totalAmount || order.orderTotal || 0),
        req.user?.userId
      );
    }

    for (const item of order.items) {
      if (item.productId) {
        // COD orders had stock deducted at placeOrder (checkout.controller.ts),
        // so releaseStock always restores the quantity regardless of status.
        // Online-payment orders: pending_approval only had stock reserved
        // (quantity untouched), so releaseReservation is correct;
        // accepted+ orders had stock committed via deductStock.
        if (order.paymentMethod === 'cod') {
          await releaseStock(item.productId, item.quantity, item.variantSize, `cancel_${order._id}`);
        } else if (originalStatus === 'pending_approval') {
          await releaseReservation(item.productId, item.quantity, item.variantSize, `cancel_${order._id}`);
        } else {
          await releaseStock(item.productId, item.quantity, item.variantSize, `cancel_${order._id}`);
        }
      }
    }

    sendSuccess(res, { data: order, message: 'Order cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const { status, trackingNumber, notes, courierName, packageWeight } = req.body;
    if (!status) return sendError(res, 'Status is required', 400);

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      if (status === 'delayed' && allowed.includes('delayed')) {
        // delayed is handled by delayOrder endpoint
      } else {
        return sendError(res, `Cannot transition from ${STATUS_DISPLAY[order.status] || order.status} to ${STATUS_DISPLAY[status] || status}`, 400);
      }
    }

    const oldStatus = order.status;

    order.status = status;
    order.orderStatus = STATUS_DISPLAY[status] || status;

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (courierName) order.courierName = courierName;
    if (packageWeight) order.packageWeight = packageWeight;

    if (status === 'accepted') {
      order.acceptedAt = new Date();
    }
    if (status === 'packed') order.packedAt = new Date();
    if (status === 'shipped') order.shippedAt = new Date();
    if (status === 'in_transit') order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    if (status === 'out_for_delivery') order.outForDeliveryAt = new Date();
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.reviewEligible = true;
    }
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelledBy = 'admin';
    }

    if (notes) {
      if (!order.notes) order.notes = [];
      order.notes.push({ text: notes, addedBy: new Types.ObjectId(req.user.userId), addedAt: new Date() });
    }

    order.statusHistory.push({
      status,
      changedBy: new Types.ObjectId(req.user.userId),
      notes,
    } as any);

    await order.save();

    // Log regional analytics audit events
    if (status === 'accepted') {
      await logAnalyticsEvent(
        order._id,
        order.orderId,
        order.shippingAddress?.state || 'Unknown',
        'order_approved',
        oldStatus,
        status,
        order.totalAmount || order.orderTotal || 0,
        req.user?.userId
      );
    } else if (status === 'cancelled') {
      const wasApproved = APPROVED_ORDER_STATUSES.includes(oldStatus);
      if (wasApproved || order.paymentMethod === 'cod') {
        await logAnalyticsEvent(
          order._id,
          order.orderId,
          order.shippingAddress?.state || 'Unknown',
          'order_cancelled',
          oldStatus,
          status,
          -(order.totalAmount || order.orderTotal || 0),
          req.user?.userId
        );
      }
    } else if (status === 'delivered') {
      await logAnalyticsEvent(
        order._id,
        order.orderId,
        order.shippingAddress?.state || 'Unknown',
        'order_delivered',
        oldStatus,
        status,
        0,
        req.user?.userId
      );
    }

    // Enterprise commitment point: inventory is deducted and analytics
    // recorded only when the seller confirms the order (accepted).
    // Payment only reserved stock; this is where it becomes real.
    // COD orders are committed at placeOrder (checkout.controller.ts), so
    // stock and analytics must NOT be touched again here.
    if (status === 'accepted' && order.paymentMethod !== 'cod') {
      for (const item of order.items) {
        if (item.productId) {
          await deductStock(item.productId, item.quantity, item.variantSize, `accept_${order._id}`, new Types.ObjectId(req.user!.userId));
        }
      }

      const purchaseItems = order.items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId!.toString(),
          quantity: item.quantity,
          price: item.sellingPrice,
        }));
      if (purchaseItems.length) {
        await bulkRecordPurchases(purchaseItems, order.userId.toString());
      }
    }

    sendSuccess(res, { data: order, message: `Order ${STATUS_DISPLAY[status] || status}` });
  } catch (error) {
    next(error);
  }
};

export const delayOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const { reason, expectedDate, customerNote } = req.body;
    if (!reason || !expectedDate) {
      return sendError(res, 'Delay reason and expected date are required', 400);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 'Order not found', 404);

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes('delayed')) {
      return sendError(res, `Cannot delay order in ${STATUS_DISPLAY[order.status] || order.status}`, 400);
    }

    if (!order.delayHistory) order.delayHistory = [];
    order.delayHistory.push({
      reason,
      expectedDate: new Date(expectedDate),
      customerNote: customerNote || '',
      createdAt: new Date(),
    });

    if (expectedDate) order.estimatedDelivery = new Date(expectedDate);

    order.status = order.status;
    order.statusHistory.push({
      status: 'delayed',
      changedBy: new Types.ObjectId(req.user.userId),
      notes: `Delayed: ${reason}${customerNote ? ` - ${customerNote}` : ''}`,
    } as any);

    await order.save();

    sendSuccess(res, { data: order, message: 'Order delayed' });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const validation = orderHistoryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { page, limit, status, startDate, endDate } = validation.data;
    const filter: any = {};

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email phone createdAt')
        .populate('items.productId', 'name slug images'),
      Order.countDocuments(filter),
    ]);

    sendPaginated(res, orders, total, page, limit);
  } catch (error) {
    next(error);
  }
};

// Enterprise tab counts (Admin Orders tabs: All Orders, Pending, Confirmed,
// Packed, Shipped, In Transit, Out For Delivery, Delivered, Cancelled,
// Returned). Calculated entirely from the backend via a single aggregation
// over the full Order collection — not from a paginated/limited fetch — so
// counts stay accurate regardless of how many orders exist, and tab
// filtering/pagination/search on the client can keep using the existing
// /orders/admin/all endpoint untouched.
const TAB_TO_MACHINE_STATUS: Record<string, string> = {
  'Pending': 'pending_approval',
  'Confirmed': 'accepted',
  'Packed': 'packed',
  'Shipped': 'shipped',
  'In Transit': 'in_transit',
  'Out For Delivery': 'out_for_delivery',
  'Delivered': 'delivered',
  'Cancelled': 'cancelled',
  'Returned': 'returned',
};

export const getOrderStatusCounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const agg = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const rawCounts: Record<string, number> = {};
    let allOrders = 0;
    for (const row of agg) {
      const status = row._id || 'pending_approval';
      rawCounts[status] = row.count;
      allOrders += row.count;
    }

    const counts: Record<string, number> = { 'All Orders': allOrders };
    for (const [tabLabel, machineStatus] of Object.entries(TAB_TO_MACHINE_STATUS)) {
      counts[tabLabel] = rawCounts[machineStatus] || 0;
    }

    sendSuccess(res, { data: counts });
  } catch (error) {
    next(error);
  }
};

export const addTracking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const { trackingNumber, carrier } = req.body;
    if (!trackingNumber) return sendError(res, 'Tracking number is required', 400);

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { trackingNumber, carrier: carrier || 'Shiprocket' },
      { new: true }
    );

    if (!order) return sendError(res, 'Order not found', 404);
    sendSuccess(res, { data: order, message: 'Tracking updated' });
  } catch (error) {
    next(error);
  }
};
