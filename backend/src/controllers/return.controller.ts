import { Response, NextFunction } from 'express';
import { ReturnRequest } from '../models/ReturnRequest';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendSuccess, sendError, sendPaginated } from '../services/apiResponse';
import {
  createReturnRequestSchema,
  returnActionSchema,
  createFullReturnSchema,
  eligibilityCheckSchema,
  returnDecisionSchema,
  returnRejectSchema,
  schedulePickupSchema,
  pickupFailedSchema,
  confirmReceiptSchema,
  inspectReturnSchema,
  processRefundSchema,
  refundFailedSchema,
  completeReturnSchema,
  returnNoteSchema,
  refundReturnSchema,
} from '../validators';
import { Types } from 'mongoose';
import { generateReturnId, generateRmaNumber } from '../services/orderId.service';
import {
  checkItemEligibility,
  decideApproval,
  calculateRefund,
  fetchOrderForReturn,
  DEFAULT_RETURN_WINDOW_DAYS,
  type ItemEligibility,
} from '../services/returnPolicy.service';
import { releaseStock } from '../services/inventory.service';
import { createNotification } from '../services/notification.service';
import { Payment } from '../models/Payment';
import { createRefund } from '../services/razorpay.service';
import { REFUNDABLE_STATUSES, resolveRefundAmount, isFullRefund } from '../services/returnRefund.service';

/* ── State machine ──────────────────────────────────────────── */

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['pickup_scheduled', 'refund_processing', 'rejected', 'cancelled'],
  pickup_scheduled: ['item_received', 'pickup_failed', 'refund_processing', 'cancelled'],
  pickup_failed: ['pickup_scheduled', 'cancelled'],
  item_received: ['inspection_completed', 'on_hold', 'refund_processing'],
  inspection_completed: ['refund_processing', 'on_hold', 'rejected'],
  on_hold: ['inspection_completed', 'rejected', 'refund_processing'],
  refund_processing: ['completed', 'refund_failed'],
  refund_failed: ['refund_processing', 'completed'],
  rejected: [],
  completed: [],
  cancelled: [],
  // legacy aliases resolve to canonical targets below
  Requested: ['under_review', 'approved', 'rejected', 'cancelled'],
  Processing: ['approved', 'rejected', 'completed'],
  Approved: ['pickup_scheduled', 'rejected', 'cancelled'],
  pending: ['under_review', 'approved', 'rejected', 'cancelled'],
  processing: ['approved', 'rejected', 'completed'],
  escalated: ['approved', 'rejected', 'pickup_scheduled'],
  picked_up: ['inspection_completed', 'completed'],
};

const LEGACY_STATUS_MAP: Record<string, string> = {
  approved: 'approved',
  rejected: 'rejected',
  picked_up: 'item_received',
  refunded: 'completed',
  pending: 'submitted',
  processing: 'under_review',
  escalated: 'under_review',
  cancelled: 'cancelled',
};

const CANCELLABLE_BY_CUSTOMER = ['draft', 'submitted', 'under_review', 'approved', 'Requested', 'pending', 'approved'];

const actorOf = (req: AuthRequest) => ({
  id: new Types.ObjectId(req.user!.userId),
  role: req.user!.isAdmin ? 'admin' : 'customer',
});

const pushHistory = (doc: any, from: string, to: string, actor: Types.ObjectId, role: string, comment?: string) => {
  doc.statusHistory.push({ from, to, actor, actorRole: role, timestamp: new Date(), comment: comment || '' });
};

const applyTransition = (
  doc: any,
  to: string,
  actor: Types.ObjectId,
  role: string,
  comment?: string,
) => {
  const from = doc.status as string;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false as const, message: `Cannot move return from '${from}' to '${to}'.` };
  }
  doc.status = to;
  pushHistory(doc, from, to, actor, role, comment);
  const now = new Date();
  if (to === 'approved') doc.approvedAt = now;
  if (to === 'pickup_scheduled' && !doc.rmaNumber) doc.rmaNumber = generateRmaNumber();
  if (to === 'item_received') {
    doc.pickedUpAt = doc.pickedUpAt || now;
    doc.shipment.receiptDate = doc.shipment.receiptDate || now;
  }
  if (to === 'refund_processing') {
    doc.refund.initiatedAt = doc.refund.initiatedAt || now;
    doc.refund.transactionStatus = 'processing';
  }
  if (to === 'completed') {
    doc.completedAt = now;
    if (doc.refund.amount > 0 && doc.refund.transactionStatus !== 'failed') {
      doc.refund.transactionStatus = 'completed';
      doc.refund.completedAt = now;
      doc.refundedAt = now;
    }
  }
  return { ok: true as const };
};

const notify = async (
  userId: Types.ObjectId,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  try {
    await createNotification({ userId, type, title, message, data, channel: 'in_app' });
  } catch {
    // Notifications must never break the return pipeline.
  }
};

/**
 * Runs the existing admin refund handler in-process, so an automatic refund goes through exactly
 * the same guards, over-refund checks, idempotency claim and gateway call as the "Refund Amount"
 * button, and captures its response instead of writing it to the HTTP client.
 */
const runRefundInternally = async (req: AuthRequest, returnId: string) => {
  let statusCode = 200;
  let payload: any = null;
  let thrown: any = null;
  const capture: any = {
    status(code: number) {
      statusCode = code;
      return capture;
    },
    json(body: any) {
      payload = body;
      return capture;
    },
  };
  const internalReq = { user: req.user, params: { id: returnId }, body: {} } as unknown as AuthRequest;
  await refundReturnRequest(
    internalReq,
    capture as Response,
    ((err?: unknown) => {
      thrown = err;
    }) as unknown as NextFunction,
  );
  if (thrown) return { statusCode: 500, payload: { message: thrown?.message || 'Refund failed' } };
  return { statusCode, payload };
};

const pickupInstructions = (doc: any): string => {
  if (doc.pickupMode === 'dropoff') {
    return 'Drop off the packed item(s) at the nearest Machinichi collection point with your RMA number written on the package.';
  }
  const addr = doc.pickupAddress;
  const addrLine = addr
    ? `${addr.addressLine1 || addr.streetAddress || ''}, ${addr.city || ''} ${addr.pincode || addr.zipCode || ''}`.trim()
    : 'your saved address';
  return `Keep the item(s) packed and ready. Our courier partner${doc.shipment.courier ? ` (${doc.shipment.courier})` : ''} will collect from ${addrLine}. Quote RMA ${doc.rmaNumber || doc.returnId} at handover.`;
};

/* ── Customer: eligibility preview ──────────────────────────── */

export const checkEligibility = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return sendError(res, 'Authentication required', 401);
    const validation = eligibilityCheckSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);

    const order = await fetchOrderForReturn(validation.data.orderId);
    if (!order) return sendError(res, 'Order not found', 404);
    if (order.userId.toString() !== req.user.userId) return sendError(res, 'Not authorized', 403);

    const deliveredAt = (order as any).deliveredAt ?? (order as any).createdAt;
    const items: any[] = [];
    for (const item of (order as any).items || []) {
      const result = await checkItemEligibility(order as any, item, item.quantity);
      items.push({
        orderItemId: String(item._id),
        name: item.name,
        sku: item.sku,
        image: item.image,
        purchasedQuantity: item.quantity,
        unitPrice: item.sellingPrice,
        eligible: result.eligible,
        windowDays: result.windowDays,
        daysSinceDelivery: result.daysSinceDelivery,
        maxReturnableQuantity: result.maxReturnableQuantity,
        checks: result.checks,
      });
    }

    sendSuccess(res, {
      data: {
        orderId: order._id,
        orderRef: (order as any).orderId,
        status: (order as any).status,
        purchasedAt: (order as any).createdAt,
        deliveredAt,
        defaultWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ── Customer: eligible (returnable) delivered orders ───────── */

export const getEligibleOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return sendError(res, 'Authentication required', 401);
    const { Order } = await import('../models/Order');
    const orders = await Order.find({ userId: new Types.ObjectId(req.user.userId), status: 'delivered' })
      .sort({ deliveredAt: -1, createdAt: -1 })
      .limit(50)
      .populate('items.productId', 'name returnPolicy sku images')
      .lean();

    const now = new Date();
    const eligible: any[] = [];
    for (const order of orders as any[]) {
      const deliveredAt = order.deliveredAt ?? order.createdAt;
      const items: any[] = [];
      for (const item of order.items || []) {
        const windowDays = item.productId?.returnPolicy?.returnPeriodDays ?? DEFAULT_RETURN_WINDOW_DAYS;
        const returnable = item.productId?.returnPolicy?.isReturnable ?? true;
        const days = Math.floor((now.getTime() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
        const withinWindow = days <= windowDays;
        items.push({
          orderItemId: String(item._id),
          name: item.name,
          sku: item.sku,
          image: item.image,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          eligible: withinWindow && returnable,
          windowDays,
          daysSinceDelivery: days,
          returnable,
        });
      }
      // List every delivered order that is still inside its return window. Items that fail the
      // policy (e.g. a non-returnable product) are shown disabled with the reason, instead of the
      // whole order silently disappearing from the Return Request page.
      if (items.some((i) => i.daysSinceDelivery <= i.windowDays)) {
        eligible.push({
          _id: order._id,
          orderId: order.orderId,
          createdAt: order.createdAt,
          deliveredAt,
          orderTotal: order.orderTotal,
          items,
        });
      }
    }
    sendSuccess(res, { data: eligible });
  } catch (error) {
    next(error);
  }
};

/* ── Customer: create return request ────────────────────────── */

export const createReturnRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return sendError(res, 'Authentication required', 401);

    // Legacy single-item payload → normalise to the full shape.
    const legacy = createReturnRequestSchema.safeParse(req.body);
    let body = req.body;
    if (legacy.success && !Array.isArray((req.body as any).items)) {
      const l = legacy.data;
      body = {
        orderId: l.orderId,
        items: [{ orderItemId: l.orderItemId, quantity: l.quantity, reason: l.reason, description: l.description }],
        resolution: 'refund',
        pickupMode: 'pickup',
        description: l.description,
        images: l.images || [],
        pickupAddress: l.pickupAddress,
        agreeTerms: true,
      };
    }

    const validation = createFullReturnSchema.safeParse(body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const data = validation.data;

    const order = await fetchOrderForReturn(data.orderId);
    if (!order) return sendError(res, 'Order not found', 404);
    if ((order as any).userId.toString() !== req.user.userId) return sendError(res, 'Not authorized', 403);

    const orderItems = ((order as any).items || []) as any[];
    const builtItems: any[] = [];
    const eligibilities: ItemEligibility[] = [];
    for (const input of data.items) {
      const orderItem = orderItems.find((i) => String(i._id) === String(input.orderItemId));
      if (!orderItem) return sendError(res, `Order item ${input.orderItemId} not found in this order.`, 404);
      const productId = orderItem.productId?._id || orderItem.productId;
      const elig = await checkItemEligibility(order as any, orderItem, input.quantity);
      eligibilities.push(elig);
      builtItems.push({
        orderItemId: String(orderItem._id),
        productId,
        sku: orderItem.sku || '',
        name: orderItem.name,
        image: orderItem.image,
        unitPrice: orderItem.sellingPrice,
        purchasedQuantity: orderItem.quantity,
        returnQuantity: input.quantity,
        reason: input.reason,
        description: input.description || data.description || '',
        quantity: input.quantity,
        images: data.images || [],
      });
    }

    const { decision, reason: decisionReason } = decideApproval(
      eligibilities,
      data.items.map((i) => i.reason),
    );

    const refundAmount = calculateRefund(
      builtItems.map((b) => ({ unitPrice: b.unitPrice, returnQuantity: b.returnQuantity })),
    );

    const actor = new Types.ObjectId(req.user.userId);
    const now = new Date();
    const firstElig = eligibilities[0];

    const doc = await ReturnRequest.create({
      returnId: generateReturnId(),
      orderId: new Types.ObjectId(data.orderId),
      orderItemId: builtItems.length === 1 && Types.ObjectId.isValid(builtItems[0].orderItemId)
        ? new Types.ObjectId(builtItems[0].orderItemId)
        : undefined,
      userId: actor,
      items: builtItems,
      reason: data.items[0]?.reason,
      description: data.description,
      quantity: data.items.reduce((s, i) => s + i.quantity, 0),
      images: data.images || [],
      evidence: (data.images || []).map((url) => ({ url, uploadedAt: now, uploadedBy: actor, kind: 'photo' })),
      resolution: data.resolution,
      pickupMode: data.pickupMode,
      pickupAddress: data.pickupAddress,
      shipment: { mode: data.pickupMode },
      eligibility: {
        checkedAt: now,
        windowDays: firstElig?.windowDays ?? DEFAULT_RETURN_WINDOW_DAYS,
        daysSinceDelivery: firstElig?.daysSinceDelivery ?? 0,
        eligible: eligibilities.every((e) => e.eligible),
        checks: eligibilities.flatMap((e) => e.checks.map((c) => ({ ...c, item: e.orderItemId }))),
        autoDecision: decision,
      },
      orderSnapshot: {
        orderRef: (order as any).orderId,
        purchasedAt: (order as any).createdAt,
        deliveredAt: (order as any).deliveredAt,
      },
      status: 'submitted',
      statusHistory: [
        { from: 'draft', to: 'submitted', actor, actorRole: 'customer', timestamp: now, comment: 'Return request submitted by customer.' },
      ],
      refundAmount,
      refundType: builtItems.length === orderItems.length ? 'Full' : 'Partial',
      refund: { amount: refundAmount, method: 'original_payment', transactionStatus: 'pending' },
      slaDueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      timeline: [{ stage: 'Submitted', completedAt: now, isActive: true }],
    });

    if (decision === 'reject') {
      const t = applyTransition(doc, 'rejected', actor, 'system', decisionReason);
      if (t.ok) {
        doc.rejectionReason = decisionReason;
        doc.decisionReason = decisionReason;
        await doc.save();
      }
      await notify(actor, 'return_rejected', 'Return request rejected', `Your return ${doc.returnId} was rejected: ${decisionReason}`, { returnId: doc._id });
      return sendSuccess(res, { data: doc, message: 'Return request rejected: eligibility failed.', rejected: true }, 201);
    }

    if (decision === 'auto_approve') {
      doc.status = 'approved';
      doc.statusHistory.push({ from: 'submitted', to: 'approved', actor, actorRole: 'system', timestamp: new Date(), comment: 'Auto-approved by return policy engine.' } as any);
      doc.rmaNumber = generateRmaNumber();
      doc.approvedAt = new Date();
      doc.decisionReason = 'Auto-approved: eligible items with qualifying reason.';
      await doc.save();
      await notify(actor, 'return_approved', 'Return approved', `Your return ${doc.returnId} is approved. RMA: ${doc.rmaNumber}. ${pickupInstructions(doc)}`, { returnId: doc._id, rmaNumber: doc.rmaNumber });
      return sendSuccess(res, { data: doc, message: 'Return request auto-approved. RMA and pickup instructions issued.', autoApproved: true }, 201);
    }

    await doc.save();
    await notify(actor, 'return_submitted', 'Return request received', `Your return ${doc.returnId} is under review. We will update you within 48 hours.`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Return request submitted and queued for review.' }, 201);
  } catch (error) {
    next(error);
  }
};

/* ── Customer: list / detail / cancel ───────────────────────── */

export const getMyReturnRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return sendError(res, 'Authentication required', 401);
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(req.user.userId) };
    if (status && typeof status === 'string') filter.status = status;
    const skip = (pageNum - 1) * limitNum;
    const [returns, total] = await Promise.all([
      ReturnRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate('orderId', 'orderId orderTotal createdAt deliveredAt status'),
      ReturnRequest.countDocuments(filter),
    ]);
    sendPaginated(res, returns, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

export const getAllReturnRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const { page = '1', limit = '20', status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const filter: Record<string, unknown> = {};
    if (status && typeof status === 'string') filter.status = status;
    if (search && typeof search === 'string' && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ returnId: rx }, { rmaNumber: rx }, { reason: rx }];
    }
    const skip = (pageNum - 1) * limitNum;
    const [returns, total] = await Promise.all([
      ReturnRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email phone')
        .populate('orderId', 'orderId orderTotal paymentMethod paymentStatus'),
      ReturnRequest.countDocuments(filter),
    ]);
    sendPaginated(res, returns, total, pageNum, limitNum);
  } catch (error) {
    next(error);
  }
};

export const getReturnStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const agg = await ReturnRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, refundTotal: { $sum: '$refundAmount' } } },
    ]);
    const byStatus: Record<string, { count: number; refundTotal: number }> = {};
    let total = 0;
    for (const row of agg) {
      byStatus[row._id || 'unknown'] = { count: row.count, refundTotal: row.refundTotal || 0 };
      total += row.count;
    }
    const completedRefunds = await ReturnRequest.find({ status: 'completed', refundedAt: { $ne: null }, completedAt: { $ne: null } })
      .select('refundedAt completedAt createdAt approvedAt')
      .lean();
    let avgTurnaroundHours = 0;
    if (completedRefunds.length > 0) {
      const sum = completedRefunds.reduce((s, r: any) => {
        const end = new Date(r.completedAt).getTime();
        const start = new Date(r.createdAt).getTime();
        return s + Math.max(0, end - start);
      }, 0);
      avgTurnaroundHours = Math.round((sum / completedRefunds.length / (1000 * 60 * 60)) * 10) / 10;
    }
    const slaBreaches = await ReturnRequest.countDocuments({
      slaDueAt: { $lt: new Date() },
      status: { $nin: ['completed', 'rejected', 'cancelled', 'Completed', 'Rejected', 'Cancelled'] },
    });
    sendSuccess(res, { data: { total, byStatus, avgTurnaroundHours, slaBreaches } });
  } catch (error) {
    next(error);
  }
};

export const getReturnById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('orderId', 'orderId items orderTotal paymentMethod paymentStatus createdAt deliveredAt status');
    if (!returnRequest) return sendError(res, 'Return request not found', 404);
    const ownerId = String((returnRequest.userId as any)?._id ?? returnRequest.userId);
    if (ownerId !== req.user?.userId && !req.user?.isAdmin) return sendError(res, 'Not authorized', 403);
    sendSuccess(res, { data: { ...returnRequest.toObject(), shippingInstructions: pickupInstructions(returnRequest) } });
  } catch (error) {
    next(error);
  }
};

/** Legacy generic status endpoint — retained for existing clients; maps to the canonical lifecycle. */
export const updateReturnStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = returnActionSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const { status, adminNote, refundAmount } = validation.data;
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const target = LEGACY_STATUS_MAP[status];
    const t = applyTransition(doc, target, id, role, adminNote || `Admin set status to ${status}.`);
    if (!t.ok) return sendError(res, t.message, 400);
    if (adminNote) {
      doc.adminNote = adminNote;
      doc.adminNotes.push({ note: adminNote, addedBy: id, addedAt: new Date() });
    }
    if (status === 'rejected') doc.rejectionReason = adminNote || 'Rejected by admin.';
    if (status === 'refunded') {
      if (refundAmount) {
        doc.refundAmount = refundAmount;
        doc.refund.amount = refundAmount;
      }
      doc.refund.transactionStatus = 'completed';
      doc.refund.completedAt = new Date();
      doc.refundedAt = new Date();
      doc.completedAt = new Date();
    }
    doc.handledBy = id;
    await doc.save();
    await notify(doc.userId, `return_${target}`, `Return ${target.replace(/_/g, ' ')}`, `Your return ${doc.returnId} is now: ${target}.${adminNote ? ` Note: ${adminNote}` : ''}`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: `Return ${status}` });
  } catch (error) {
    next(error);
  }
};

export const cancelReturnRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userId) return sendError(res, 'Authentication required', 401);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    if (doc.userId.toString() !== req.user.userId && !req.user.isAdmin) return sendError(res, 'Not authorized', 403);
    if (!CANCELLABLE_BY_CUSTOMER.includes(doc.status)) {
      return sendError(res, `Cannot cancel a return in '${doc.status}' stage. Contact support for help.`, 400);
    }
    const { id, role } = actorOf(req);
    const t = applyTransition(doc, 'cancelled', id, role, 'Return request cancelled by customer.');
    if (!t.ok) return sendError(res, t.message, 400);
    await doc.save();
    sendSuccess(res, { data: doc, message: 'Return request cancelled' });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: review decisions ────────────────────────────────── */

export const moveToReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const t = applyTransition(doc, 'under_review', id, role, 'Moved to manual review.');
    if (!t.ok) return sendError(res, t.message, 400);
    await doc.save();
    sendSuccess(res, { data: doc, message: 'Return moved to review.' });
  } catch (error) {
    next(error);
  }
};

export const approveReturn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = returnDecisionSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);

    // Allow approving straight from submitted (skip explicit under_review).
    if (doc.status === 'submitted') {
      const t1 = applyTransition(doc, 'under_review', id, role, 'Auto-moved to review prior to approval.');
      if (!t1.ok) return sendError(res, t1.message, 400);
    }
    const t = applyTransition(doc, 'approved', id, role, validation.data.comment || 'Approved by admin.');
    if (!t.ok) return sendError(res, t.message, 400);
    if (validation.data.refundAmount) {
      doc.refundAmount = validation.data.refundAmount;
      doc.refund.amount = validation.data.refundAmount;
    }
    doc.decisionReason = validation.data.comment || 'Approved by admin.';
    doc.handledBy = id;
    doc.timeline.push({ stage: 'Approved', completedAt: new Date(), isActive: true });
    await doc.save();
    await notify(doc.userId, 'return_approved', 'Return approved', `Your return ${doc.returnId} is approved. RMA: ${doc.rmaNumber}. ${pickupInstructions(doc)}`, { returnId: doc._id, rmaNumber: doc.rmaNumber });
    sendSuccess(res, { data: { ...doc.toObject(), shippingInstructions: pickupInstructions(doc) }, message: 'Return approved. RMA issued.' });
  } catch (error) {
    next(error);
  }
};

export const rejectReturn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = returnRejectSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    if (doc.status === 'submitted') {
      const t1 = applyTransition(doc, 'under_review', id, role, 'Auto-moved to review prior to decision.');
      if (!t1.ok) return sendError(res, t1.message, 400);
    }
    const t = applyTransition(doc, 'rejected', id, role, validation.data.reason);
    if (!t.ok) return sendError(res, t.message, 400);
    doc.rejectionReason = validation.data.reason;
    doc.decisionReason = validation.data.reason;
    doc.handledBy = id;
    await doc.save();
    await notify(doc.userId, 'return_rejected', 'Return request rejected', `Your return ${doc.returnId} was rejected: ${validation.data.reason}. Contact support to appeal.`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Return rejected with reason.' });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: logistics ───────────────────────────────────────── */

export const schedulePickup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = schedulePickupSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const t = applyTransition(doc, 'pickup_scheduled', id, role, `Pickup scheduled via ${validation.data.courier}.`);
    if (!t.ok) return sendError(res, t.message, 400);
    doc.shipment.courier = validation.data.courier;
    doc.shipment.trackingNumber = validation.data.trackingNumber;
    if (validation.data.pickupDate) doc.shipment.pickupDate = new Date(validation.data.pickupDate);
    if (validation.data.pickupMode) {
      doc.shipment.mode = validation.data.pickupMode;
      doc.pickupMode = validation.data.pickupMode;
    }
    doc.shipment.instructions = validation.data.instructions || pickupInstructions(doc);
    doc.timeline.push({ stage: 'Pickup Scheduled', completedAt: new Date(), isActive: true });
    await doc.save();
    await notify(doc.userId, 'return_pickup', 'Return pickup scheduled', `Pickup for return ${doc.returnId} (RMA ${doc.rmaNumber}) is scheduled${doc.shipment.pickupDate ? ` on ${doc.shipment.pickupDate.toDateString()}` : ''}. ${doc.shipment.instructions}`, { returnId: doc._id });
    sendSuccess(res, { data: { ...doc.toObject(), shippingInstructions: doc.shipment.instructions }, message: 'Pickup scheduled.' });
  } catch (error) {
    next(error);
  }
};

export const markPickupFailed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = pickupFailedSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const t = applyTransition(doc, 'pickup_failed', id, role, validation.data.reason);
    if (!t.ok) return sendError(res, t.message, 400);
    doc.shipment.pickupAttempts = (doc.shipment.pickupAttempts || 0) + 1;
    doc.shipment.lastFailureReason = validation.data.reason;
    await doc.save();
    await notify(doc.userId, 'return_pickup_failed', 'Return pickup failed', `Pickup for return ${doc.returnId} failed: ${validation.data.reason}. We will reschedule or arrange a drop-off alternative.`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Pickup marked as failed. Reschedule or offer drop-off.' });
  } catch (error) {
    next(error);
  }
};

export const confirmReceipt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = confirmReceiptSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    // Allow direct receipt from approved (courier handed over without explicit schedule record).
    if (doc.status === 'approved') {
      const t0 = applyTransition(doc, 'pickup_scheduled', id, role, 'Pickup recorded at receipt time.');
      if (!t0.ok) return sendError(res, t0.message, 400);
    }
    const t = applyTransition(doc, 'item_received', id, role, validation.data.notes || 'Item received at warehouse.');
    if (!t.ok) return sendError(res, t.message, 400);
    if (validation.data.receiptDate) doc.shipment.receiptDate = new Date(validation.data.receiptDate);
    doc.timeline.push({ stage: 'Item Received', completedAt: new Date(), isActive: true });
    await doc.save();
    // Product collected -> refund the customer automatically to the SAME account / payment method
    // that was used to pay (Razorpay refunds always go back to the original source). Only online
    // (gateway-captured) payments are refunded automatically; COD / manual returns stay open so the
    // admin can settle them by hand.
    const capturedPayment = doc.resolution === 'refund'
      ? await Payment.findOne({ orderId: doc.orderId, status: 'captured' }).sort({ createdAt: -1 })
      : null;
    const canAutoRefund = Boolean(capturedPayment && capturedPayment.razorpayPaymentId);

    if (!canAutoRefund) {
      await notify(doc.userId, 'return_received', 'Return item received', `We received your return ${doc.returnId} at the warehouse. Inspection starts now.`, { returnId: doc._id });
      return sendSuccess(res, { data: doc, message: 'Item receipt confirmed.' });
    }

    await notify(doc.userId, 'return_received', 'Return item collected', `We collected your return ${doc.returnId}. Your refund will be credited to your original payment method within 5 minutes.`, { returnId: doc._id });

    const refundResult = await runRefundInternally(req, String(doc._id));
    const latest = (await ReturnRequest.findById(doc._id)) ?? doc;
    if (refundResult.statusCode >= 400) {
      return sendSuccess(res, {
        data: latest,
        refundError: true,
        message: `Product collected, but the automatic refund failed: ${refundResult.payload?.message || 'unknown error'}`,
      });
    }
    sendSuccess(res, { data: latest, message: `Product collected. ${refundResult.payload?.message || 'Refund issued.'}` });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: inspection ──────────────────────────────────────── */

export const inspectReturn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = inspectReturnSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const v = validation.data;

    if (doc.status === 'on_hold') {
      // Re-inspection after hold: record findings then complete inspection.
      doc.inspection = {
        inspector: id,
        inspectedAt: new Date(),
        condition: v.condition,
        quantityReceived: v.quantityReceived,
        findings: v.findings,
        disposition: v.disposition,
        passed: v.passed,
        refundEligible: v.refundEligible ?? v.passed,
      };
      const t = applyTransition(doc, 'inspection_completed', id, role, v.findings || 'Re-inspection completed.');
      if (!t.ok) return sendError(res, t.message, 400);
    } else {
      const t = applyTransition(doc, v.passed ? 'inspection_completed' : 'on_hold', id, role, v.findings || (v.passed ? 'Inspection passed.' : 'Inspection failed — placed on hold per policy.'));
      if (!t.ok) return sendError(res, t.message, 400);
      doc.inspection = {
        inspector: id,
        inspectedAt: new Date(),
        condition: v.condition,
        quantityReceived: v.quantityReceived,
        findings: v.findings,
        disposition: v.disposition,
        passed: v.passed,
        refundEligible: v.refundEligible ?? v.passed,
      };
    }

    // Inventory treatment per published policy.
    for (const item of doc.items) {
      try {
        if (v.disposition === 'restock' && v.passed && item.productId) {
          await releaseStock(item.productId, Math.min(v.quantityReceived ?? item.returnQuantity, item.returnQuantity), undefined, `return_restock_${doc._id}`);
        }
        // quarantine / repair / write_off intentionally do NOT restock sellable quantity.
      } catch {
        // Inventory adjustment must not fail the inspection record.
      }
    }

    // Stamp per-item inspection outcome for the audit trail.
    for (const item of doc.items) {
      (item as any).inspectionOutcome = `${v.condition}; disposition=${v.disposition}; ${v.passed ? 'passed' : 'on hold'}`;
      (item as any).condition = v.condition;
    }

    if (v.passed) doc.timeline.push({ stage: 'Inspection Completed', completedAt: new Date(), isActive: true });
    await doc.save();
    await notify(
      doc.userId,
      v.passed ? 'return_inspected' : 'return_on_hold',
      v.passed ? 'Return inspection completed' : 'Return placed on hold',
      v.passed
        ? `Inspection passed for return ${doc.returnId}. Your ${doc.resolution.replace('_', ' ')} is being processed.`
        : `Return ${doc.returnId} is on hold after inspection: ${v.findings || v.condition}. Our team will apply the published policy and update you.`,
      { returnId: doc._id },
    );
    sendSuccess(res, { data: doc, message: v.passed ? 'Inspection completed.' : 'Inspection failed — request placed on hold.' });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: resolution / refund ─────────────────────────────── */

export const processRefund = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = processRefundSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);

    if (doc.status === 'inspection_completed' || doc.status === 'on_hold') {
      const eligible = doc.inspection?.refundEligible ?? true;
      if (!eligible && doc.status === 'on_hold') {
        return sendError(res, 'Refund is not eligible per inspection. Reject the request or re-inspect first.', 400);
      }
      const t0 = applyTransition(doc, 'refund_processing', id, role, 'Resolution execution started.');
      if (!t0.ok) return sendError(res, t0.message, 400);
    } else if (doc.status === 'refund_failed') {
      const t0 = applyTransition(doc, 'refund_processing', id, role, 'Refund retry initiated.');
      if (!t0.ok) return sendError(res, t0.message, 400);
    } else if (doc.status !== 'refund_processing') {
      return sendError(res, `Cannot process resolution from '${doc.status}'. Complete inspection first.`, 400);
    }

    const amount = validation.data.amount ?? doc.refundAmount ?? 0;
    doc.refundAmount = amount;
    doc.refund.amount = amount;
    doc.refund.method = validation.data.method ?? doc.refund.method ?? 'original_payment';
    doc.refund.initiatedBy = id;
    doc.refund.initiatedAt = new Date();
    doc.refund.transactionStatus = 'processing';
    if (validation.data.transactionRef) doc.refund.paymentReference = validation.data.transactionRef;
    doc.timeline.push({ stage: 'Refund Processing', completedAt: new Date(), isActive: true });

    // NOTE: production wiring initiates the payment-gateway refund against the
    // captured payment here and reconciles via webhook. To avoid touching
    // payment logic, this build records the traceable transaction and leaves
    // gateway settlement to finance; completion is explicit via completeReturn.
    await doc.save();
    await notify(doc.userId, 'return_refund_processing', 'Resolution in progress', `Your ${doc.resolution.replace('_', ' ')} of ₹${amount.toLocaleString('en-IN')} for return ${doc.returnId} is being processed.`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Resolution processing started.' });
  } catch (error) {
    next(error);
  }
};

export const markRefundFailed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = refundFailedSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);
    const t = applyTransition(doc, 'refund_failed', id, role, validation.data.reason);
    if (!t.ok) return sendError(res, t.message, 400);
    doc.refund.transactionStatus = 'failed';
    doc.refund.failureReason = validation.data.reason;
    await doc.save();
    await notify(doc.userId, 'return_refund_failed', 'Refund delayed', `The refund for return ${doc.returnId} needs attention: ${validation.data.reason}. It stays open in refund-pending and finance has been alerted.`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Refund marked as failed; request kept open in refund-pending.' });
  } catch (error) {
    next(error);
  }
};

export const completeReturn = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = completeReturnSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id).populate('orderId');
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);

    if (doc.status === 'inspection_completed' || doc.status === 'on_hold') {
      const t0 = applyTransition(doc, 'refund_processing', id, role, 'Resolution execution started.');
      if (!t0.ok) return sendError(res, t0.message, 400);
    }
    if (doc.status === 'refund_failed') {
      const t0 = applyTransition(doc, 'refund_processing', id, role, 'Refund recovered; completing.');
      if (!t0.ok) return sendError(res, t0.message, 400);
    }
    if (doc.status !== 'refund_processing') {
      return sendError(res, `Cannot complete a return in '${doc.status}' stage.`, 400);
    }
    const t = applyTransition(doc, 'completed', id, role, validation.data.comment || 'Return closed; customer notified.');
    if (!t.ok) return sendError(res, t.message, 400);
    doc.handledBy = id;
    doc.timeline.push({ stage: 'Completed', completedAt: new Date(), isActive: true });
    await doc.save();

    // Partial returns leave the order intact; only mark the order Returned
    // when every item was returned and refunded in full.
    try {
      const { Order } = await import('../models/Order');
      const order = await Order.findById(doc.orderId);
      if (order) {
        const allItemsReturned = (order as any).items.every((oi: any) =>
          doc.items.some((ri: any) => String(ri.orderItemId) === String(oi._id) && ri.returnQuantity >= oi.quantity),
        );
        if (allItemsReturned && doc.resolution === 'refund') {
          (order as any).status = 'returned';
          (order as any).orderStatus = 'Returned';
          (order as any).returnedAt = new Date();
          (order as any).paymentStatus = 'Refunded';
          await order.save();
        } else if (doc.resolution === 'refund' && doc.refund.amount > 0) {
          if ((order as any).paymentStatus === 'Paid') (order as any).paymentStatus = 'Partially Refunded';
          await order.save();
        }
      }
    } catch {
      // Order rollup must not fail return completion.
    }

    await notify(doc.userId, 'return_completed', 'Return completed', `Your return ${doc.returnId} is closed. ${doc.resolution === 'refund' ? `₹${doc.refund.amount.toLocaleString('en-IN')} will reach your ${doc.refund.method.replace('_', ' ')} shortly.` : `Your ${doc.resolution.replace('_', ' ')} is confirmed.`}`, { returnId: doc._id });
    sendSuccess(res, { data: doc, message: 'Return completed and customer notified.' });
  } catch (error) {
    next(error);
  }
};

/* ── Admin: direct gateway refund (post-approval) ───────────── */

/**
 * Refund a return request directly to the customer.
 *
 * Enterprise guarantees:
 *  - Only admin, only after the return has been approved by the admin.
 *  - Idempotent: a completed refund can never be issued twice; an
 *    in-progress refund blocks concurrent attempts.
 *  - Amount is server-clamped to the captured payment amount (no
 *    over-refund); partial refunds are supported.
 *  - The money actually moves through the payment gateway for online
 *    payments; COD / no-gateway orders are recorded as manual credit.
 *  - Every outcome (success or failure) is audited in statusHistory and
 *    the customer is notified; a gateway failure parks the request in
 *    'refund_failed' so finance can reconcile and retry.
 */
export const refundReturnRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);

    const validation = refundReturnSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);

    const doc = await ReturnRequest.findById(req.params.id).populate('orderId');
    if (!doc) return sendError(res, 'Return request not found', 404);
    const { id, role } = actorOf(req);

    // Guard 1 — refund is only allowed once the return is approved AND the product has been collected.
    if (!(REFUNDABLE_STATUSES as readonly string[]).includes(doc.status)) {
      return sendError(res, `Refund can only be issued after the product is collected. Current status: ${doc.status}.`, 400);
    }

    // Guard 2 — idempotency: prevent double refunds.
    if (doc.refund?.transactionStatus === 'completed') {
      return sendError(res, `Refund of ₹${Number(doc.refund.amount || 0).toLocaleString('en-IN')} was already completed${doc.refund.completedAt ? ` on ${new Date(doc.refund.completedAt).toDateString()}` : ''}.`, 400);
    }
    if (doc.refund?.transactionStatus === 'processing') {
      return sendError(res, 'A refund for this return is already in progress. Do not click again.', 409);
    }

    const orderIdRaw = (doc.orderId as any)?._id ?? doc.orderId;
    const captured = await Payment.findOne({ orderId: orderIdRaw, status: 'captured' }).sort({ createdAt: -1 });
    const onlinePayment = captured && captured.razorpayPaymentId ? captured : null;
    const isOnline = Boolean(onlinePayment);

    // Aggregate guard — sum every refund already settled on this order through
    // OTHER completed return requests, so partial returns can never be
    // over-refunded in total (e.g. two returns of ₹100 against ₹200 paid).
    const priorCompleted = await ReturnRequest.find({
      orderId: orderIdRaw,
      _id: { $ne: doc._id },
      'refund.transactionStatus': 'completed',
    }).select('refund.amount refundAmount').lean();
    const alreadyRefunded = priorCompleted.reduce(
      (sum: number, r: any) => sum + Number(r.refund?.amount ?? r.refundAmount ?? 0),
      0,
    );

    // Resolve + clamp the amount (never <= 0, never above the refundable balance).
    const resolved = resolveRefundAmount(
      validation.data.amount,
      Number(doc.refundAmount || 0),
      onlinePayment ? Number(onlinePayment.amount) : null,
      alreadyRefunded,
    );
    if (!resolved.ok) return sendError(res, resolved.message, 400);
    const amount = resolved.amount;

    const note = validation.data.note || `Return ${doc.returnId}`;

    // Atomic claim — flip the refund to 'processing' only if it is not already
    // processing/completed. This closes the concurrency window where two
    // simultaneous clicks could each pass the in-memory guard above.
    const claim = await ReturnRequest.updateOne(
      { _id: doc._id, 'refund.transactionStatus': { $nin: ['processing', 'completed'] } },
      { $set: { 'refund.transactionStatus': 'processing' } },
    );
    if (claim.modifiedCount === 0) {
      return sendError(res, 'A refund for this return is already in progress or completed.', 409);
    }

    // Move the lifecycle forward (audit) and persist the in-progress state
    // BEFORE touching the gateway.
    if (doc.status !== 'refund_processing') {
      const t0 = applyTransition(doc, 'refund_processing', id, role, `Refund initiated: ₹${amount.toLocaleString('en-IN')}${isOnline ? ' to original payment method' : ' (manual credit / COD)'}.`);
      if (!t0.ok) {
        // Release the atomic claim so the request is not stranded in 'processing'.
        await ReturnRequest.updateOne({ _id: doc._id }, { $set: { 'refund.transactionStatus': 'pending' } });
        return sendError(res, t0.message, 400);
      }
    }
    doc.refundAmount = amount;
    doc.refund.amount = amount;
    doc.refund.method = isOnline ? 'original_payment' : 'store_credit';
    doc.refund.initiatedBy = id;
    doc.refund.initiatedAt = new Date();
    doc.refund.transactionStatus = 'processing';
    doc.refund.failureReason = undefined;
    doc.refund.paymentReference = '';
    await doc.save();

    try {
      let refundEntity: any = null;
      if (onlinePayment) {
        // Real money movement via the payment gateway.
        refundEntity = await createRefund(onlinePayment.razorpayPaymentId!, amount, 'optimum');
        onlinePayment.refundId = refundEntity.id;
        onlinePayment.refundAmount = amount;
        onlinePayment.refundReason = note;
        onlinePayment.refundedAt = new Date();
        onlinePayment.status = isFullRefund(amount, Number(onlinePayment.amount)) ? 'refunded' : 'captured';
        await onlinePayment.save();
      }

      // Finalise the return lifecycle with a full audit entry.
      const t1 = applyTransition(doc, 'completed', id, role, `Refund of ₹${amount.toLocaleString('en-IN')} issued${isOnline ? ` (ref ${refundEntity?.id}${refundEntity?.speed_processed ? `, ${refundEntity.speed_processed} speed` : ''})` : ' as manual credit'}.`);
      if (!t1.ok) return sendError(res, t1.message, 400);
      doc.handledBy = id;
      doc.refund.transactionStatus = 'completed';
      doc.refund.completedAt = new Date();
      doc.refund.paymentReference = refundEntity?.id || '';
      doc.timeline.push({ stage: 'Refunded', completedAt: new Date(), isActive: true });
      await doc.save();

      // Keep the order's payment state consistent.
      try {
        const order = doc.orderId as any;
        if (order) {
          const capturedTotal = onlinePayment ? Number(onlinePayment.amount) : Number(order.orderTotal || order.totalAmount || 0);
          const allItemsReturned = (order.items || []).every((oi: any) =>
            doc.items.some((ri: any) => String(ri.orderItemId) === String(oi._id) && ri.returnQuantity >= oi.quantity),
          );
          const totalRefunded = alreadyRefunded + amount;
          if (doc.resolution === 'refund') {
            if (allItemsReturned || (capturedTotal > 0 && totalRefunded >= capturedTotal - 1e-6)) {
              order.status = 'returned';
              order.orderStatus = 'Returned';
              order.returnedAt = new Date();
              order.paymentStatus = 'Refunded';
            } else if (order.paymentStatus === 'Paid') {
              order.paymentStatus = 'Partially Refunded';
            }
            await order.save();
          }
        }
      } catch {
        // Order rollup must not fail the refund.
      }

      await notify(doc.userId, 'return_refunded', 'Refund issued', `₹${amount.toLocaleString('en-IN')} has been refunded for return ${doc.returnId}${isOnline ? ' to your original payment method.' : '.'}`, { returnId: doc._id });

      sendSuccess(res, { data: doc, message: `Refund of ₹${amount.toLocaleString('en-IN')} issued successfully.` });
    } catch (err: any) {
      // Gateway failure — park in refund-pending so finance can retry after reconciling.
      const reason = err?.message || 'Payment gateway error';
      doc.refund.transactionStatus = 'failed';
      doc.refund.failureReason = reason;
      doc.refund.paymentReference = '';
      const tf = applyTransition(doc, 'refund_failed', id, role, `Refund failed: ${reason}`);
      void tf;
      await doc.save();
      await notify(doc.userId, 'return_refund_failed', 'Refund failed', `The refund for return ${doc.returnId} failed: ${reason}. It stays open in refund-pending and finance has been alerted.`, { returnId: doc._id });
      return sendError(res, `Refund failed: ${reason}. The request is held in refund-pending for retry.`, 502);
    }
  } catch (error) {
    next(error);
  }
};

export const addReturnNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.isAdmin) return sendError(res, 'Admin access required', 403);
    const validation = returnNoteSchema.safeParse(req.body);
    if (!validation.success) return sendError(res, 'Validation failed', 400, validation.error.issues);
    const doc = await ReturnRequest.findById(req.params.id);
    if (!doc) return sendError(res, 'Return request not found', 404);
    doc.adminNotes.push({ note: validation.data.note, addedBy: new Types.ObjectId(req.user.userId), addedAt: new Date() });
    doc.adminNote = validation.data.note;
    await doc.save();
    sendSuccess(res, { data: doc, message: 'Note added to audit trail.' });
  } catch (error) {
    next(error);
  }
};
