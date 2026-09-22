import { Response, NextFunction } from 'express';
import { ReturnRequest } from '../models/ReturnRequest';
import { Order } from '../models/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import { createReturnRequestSchema, returnActionSchema } from '../validators';
import { Types } from 'mongoose';
import { generateReturnId } from '../services/orderId.service';
import { APPROVED_ORDER_STATUSES, logAnalyticsEvent } from '../services/regionalAnalytics.service';

export const createReturnRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const validation = createReturnRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { orderId, orderItemId, reason, description, quantity, images, pickupAddress } = validation.data;

    const order = await Order.findById(orderId);
    if (!order) return sendError(res, 'Order not found', 404);
    if (order.userId.toString() !== req.user.userId) {
      return sendError(res, 'Not authorized', 403);
    }
    if (order.status !== 'delivered') {
      return sendError(res, 'Can only request return for delivered orders', 400);
    }

    const orderItem = (order.items as any).find((item: any) => item._id?.toString() === orderItemId);
    if (!orderItem) return sendError(res, 'Order item not found', 404);

    const existingReturn = await ReturnRequest.findOne({
      orderId: new Types.ObjectId(orderId),
      orderItemId: new Types.ObjectId(orderItemId),
      status: { $nin: ['Rejected', 'Cancelled'] },
    } as any);

    if (existingReturn) {
      return sendError(res, 'Return request already exists for this item', 400);
    }

    const returnRequest = await ReturnRequest.create({
      returnId: generateReturnId(),
      userId: new Types.ObjectId(req.user.userId),
      orderId: new Types.ObjectId(orderId),
      orderItemId: new Types.ObjectId(orderItemId),
      reason,
      description,
      quantity,
      images: images || [],
      pickupAddress,
    });

    sendSuccess(res, { data: returnRequest, message: 'Return request submitted' }, 201);
  } catch (error) {
    next(error);
  }
};

export const getMyReturnRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [returns, total] = await Promise.all([
      ReturnRequest.find({ userId: new Types.ObjectId(req.user.userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('orderId', 'orderId'),
      ReturnRequest.countDocuments({ userId: new Types.ObjectId(req.user.userId) }),
    ]);

    sendPaginated(res, returns, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

export const getAllReturnRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const { page = '1', limit = '20', status } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const filter: any = {};

    if (status) filter.status = status;

    const skip = (pageNum - 1) * limitNum;
    const [returns, total] = await Promise.all([
      ReturnRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email phone')
        .populate('orderId', 'orderId'),
      ReturnRequest.countDocuments(filter),
    ]);

    sendPaginated(res, returns, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

export const getReturnById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('orderId', 'orderId items');

    if (!returnRequest) return sendError(res, 'Return request not found', 404);

    if (returnRequest.userId.toString() !== req.user?.userId && !req.user?.isAdmin) {
      return sendError(res, 'Not authorized', 403);
    }

    sendSuccess(res, { data: returnRequest });
  } catch (error) {
    next(error);
  }
};

export const updateReturnStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) {
      return sendError(res, 'Admin access required', 403);
    }

    const validation = returnActionSchema.safeParse(req.body);
    if (!validation.success) {
      return sendError(res, 'Validation failed', 400, validation.error.issues);
    }

    const { status, adminNote, refundAmount } = validation.data;
    const update: any = {
      status,
      adminNote,
      handledBy: new Types.ObjectId(req.user.userId),
    };

    if (status === 'approved') update.approvedAt = new Date();
    if (status === 'picked_up') update.pickedUpAt = new Date();
    if (status === 'refunded') {
      update.refundedAt = new Date();
      if (refundAmount) update.refundAmount = refundAmount;
    }

    const returnRequest = await ReturnRequest.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    if (!returnRequest) return sendError(res, 'Return request not found', 404);

    if (status === 'refunded') {
      // Use the order-status vocabulary that already exists everywhere else
      // in the system (VALID_TRANSITIONS, MACHINE_TO_DISPLAY, APPROVED_ORDER_STATUSES)
      // instead of the ad-hoc 'refunded' value, and match the paymentStatus
      // enum's exact casing (['Pending','Paid','Failed','Refunded','Partially Refunded'])
      // so the order correctly drops out of revenue/regional analytics and
      // is correctly counted by the refund-rate metric.
      const orderBeforeRefund = await Order.findById(returnRequest.orderId);
      const wasApproved = orderBeforeRefund ? APPROVED_ORDER_STATUSES.includes(orderBeforeRefund.status) : false;

      await Order.findByIdAndUpdate(returnRequest.orderId, {
        status: 'returned',
        orderStatus: 'Returned',
        paymentStatus: 'Refunded',
        returnedAt: new Date(),
      });

      if (orderBeforeRefund && wasApproved) {
        await logAnalyticsEvent(
          orderBeforeRefund._id,
          orderBeforeRefund.orderId,
          orderBeforeRefund.shippingAddress?.state || 'Unknown',
          'order_refunded',
          orderBeforeRefund.status,
          'returned',
          -(refundAmount || orderBeforeRefund.totalAmount || orderBeforeRefund.orderTotal || 0),
          req.user?.userId
        );
      }
    }

    sendSuccess(res, { data: returnRequest, message: `Return ${status}` });
  } catch (error) {
    next(error);
  }
};

export const cancelReturnRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const returnRequest = await ReturnRequest.findById(req.params.id);
    if (!returnRequest) return sendError(res, 'Return request not found', 404);
    if (returnRequest.userId.toString() !== req.user.userId) {
      return sendError(res, 'Not authorized', 403);
    }
    if (!['pending', 'approved'].includes(returnRequest.status.toLowerCase())) {
      return sendError(res, 'Cannot cancel return request at this stage', 400);
    }

    returnRequest.status = 'Cancelled' as any;
    await returnRequest.save();

    sendSuccess(res, { data: returnRequest, message: 'Return request cancelled' });
  } catch (error) {
    next(error);
  }
};
