import { Response, NextFunction } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendError } from '../services/apiResponse';
import { generateInvoice, generateShippingLabel } from '../services/pdf.service';

// Enterprise rule: Download Invoice / Download Shipping Label are only ever
// generated once an order has reached the Packed stage. We gate on
// `packedAt` (set exactly once, the moment updateOrderStatus transitions an
// order to 'packed') rather than the *current* status — that way an order
// that was packed and later cancelled or returned still keeps its invoice/
// label accessible, matching Amazon/Flipkart/Shopify behavior, instead of
// retroactively losing access because its current status fell outside a
// fixed status list.
const assertReachedPacked = (order: { packedAt?: Date | null }): string | null => {
  if (!order.packedAt) {
    return 'Invoice and shipping label are only available once the order has been packed';
  }
  return null;
};

export const downloadInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { sendError(res, 'Order not found', 404); return; }

    if (!req.user?.isAdmin && (!req.user?.userId || order.userId.toString() !== req.user.userId)) {
      sendError(res, 'Not authorized', 403); return;
    }

    const gateError = assertReachedPacked(order);
    if (gateError) { sendError(res, gateError, 400); return; }

    const pdf = await generateInvoice(order);
    const filename = `invoice-${order.invoiceNumber || order.orderId || order._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  } catch (error) {
    next(error);
  }
};

export const downloadShippingLabel = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) { sendError(res, 'Admin access required', 403); return; }

    const order = await Order.findById(req.params.id);
    if (!order) { sendError(res, 'Order not found', 404); return; }

    const gateError = assertReachedPacked(order);
    if (gateError) { sendError(res, gateError, 400); return; }

    const pdf = await generateShippingLabel(order);
    const filename = `label-${order.orderId || order._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  } catch (error) {
    next(error);
  }
};
