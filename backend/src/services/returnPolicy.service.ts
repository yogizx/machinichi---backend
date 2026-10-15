import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { ReturnRequest } from '../models/ReturnRequest';

export const DEFAULT_RETURN_WINDOW_DAYS = 7;

export interface EligibilityCheck {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface ItemEligibility {
  orderItemId: string;
  eligible: boolean;
  windowDays: number;
  daysSinceDelivery: number;
  returnable: boolean;
  checks: EligibilityCheck[];
  maxReturnableQuantity: number;
  unitPrice: number;
}

const daysBetween = (from: Date, to: Date): number => {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const normaliseStatus = (s?: string): string => (s || '').toLowerCase();

/**
 * Already-returned quantities for an order item, excluding terminal
 * rejected/cancelled requests, so partial returns accumulate correctly.
 */
export const getAlreadyReturnedQty = async (
  orderId: Types.ObjectId,
  orderItemId: string,
  excludeReturnId?: Types.ObjectId,
): Promise<number> => {
  const filter: Record<string, unknown> = {
    orderId,
    status: { $nin: ['rejected', 'Rejected', 'cancelled', 'Cancelled'] },
  };
  if (excludeReturnId) filter._id = { $ne: excludeReturnId };
  const existing = await ReturnRequest.find(filter).select('items').lean();
  let total = 0;
  for (const r of existing as Array<{ items?: Array<{ orderItemId?: string; returnQuantity?: number; quantity?: number }> }>) {
    for (const it of r.items || []) {
      if (String(it.orderItemId) === String(orderItemId)) {
        total += it.returnQuantity ?? it.quantity ?? 0;
      }
    }
  }
  return total;
};

export const checkItemEligibility = async (
  order: {
    _id: Types.ObjectId;
    status?: string;
    deliveredAt?: Date;
    createdAt: Date;
  },
  orderItem: {
    _id?: unknown;
    productId?: Types.ObjectId;
    quantity: number;
    sellingPrice: number;
  },
  requestedQty: number,
): Promise<ItemEligibility> => {
  const checks: EligibilityCheck[] = [];
  const orderItemId = String((orderItem._id as { toString(): string })?.toString?.() ?? orderItem._id);

  // Rule 1 — eligible order status must be Delivered.
  const delivered = normaliseStatus(order.status) === 'delivered';
  checks.push({
    rule: 'order_status_delivered',
    passed: delivered,
    detail: delivered ? 'Order is delivered.' : `Order status is '${order.status ?? 'unknown'}'; only delivered orders can be returned.`,
  });

  // Rule 2 — delivery date + return window.
  const deliveryDate = order.deliveredAt ?? order.createdAt;
  const now = new Date();
  const daysSinceDelivery = daysBetween(new Date(deliveryDate), now);

  let windowDays = DEFAULT_RETURN_WINDOW_DAYS;
  let returnable = true;
  let returnCondition = '';
  if (orderItem.productId) {
    const product = await Product.findById(orderItem.productId)
      .select('returnPolicy name category')
      .lean();
    if (product) {
      windowDays = product.returnPolicy?.returnPeriodDays ?? DEFAULT_RETURN_WINDOW_DAYS;
      returnable = product.returnPolicy?.isReturnable ?? true;
      returnCondition = product.returnPolicy?.returnCondition ?? '';
    }
  }

  checks.push({
    rule: 'return_window',
    passed: daysSinceDelivery <= windowDays,
    detail:
      daysSinceDelivery <= windowDays
        ? `${daysSinceDelivery} day(s) since delivery; within the ${windowDays}-day window.`
        : `Return window expired: ${daysSinceDelivery} day(s) since delivery exceeds the ${windowDays}-day window.`,
  });

  // Rule 3 — product category / policy must allow returns.
  checks.push({
    rule: 'product_returnable',
    passed: returnable,
    detail: returnable
      ? 'Product category is returnable.'
      : `This product is non-returnable${returnCondition ? `: ${returnCondition}` : '.'}`,
  });

  // Rule 4 — quantity must be positive and within remaining quantity.
  const alreadyReturned = await getAlreadyReturnedQty(order._id, orderItemId);
  const remaining = Math.max(0, orderItem.quantity - alreadyReturned);
  const qtyOk = Number.isInteger(requestedQty) && requestedQty >= 1 && requestedQty <= remaining;
  checks.push({
    rule: 'quantity_within_purchased',
    passed: qtyOk,
    detail: qtyOk
      ? `Requested ${requestedQty} of ${remaining} remaining unit(s).`
      : `Invalid quantity: requested ${requestedQty}, but only ${remaining} unit(s) remain returnable (purchased ${orderItem.quantity}, already returned ${alreadyReturned}).`,
  });

  // Rule 5 — no duplicate open request beyond remaining quantity is
  // implicitly covered by rule 4; record it explicitly for audit clarity.
  checks.push({
    rule: 'no_duplicate_open_request',
    passed: remaining > 0,
    detail:
      remaining > 0
        ? 'No blocking duplicate request; remaining quantity available.'
        : 'All units of this item already have return requests.',
  });

  const eligible = checks.every((c) => c.passed);
  return {
    orderItemId,
    eligible,
    windowDays,
    daysSinceDelivery,
    returnable,
    checks,
    maxReturnableQuantity: remaining,
    unitPrice: orderItem.sellingPrice,
  };
};

export type AutoDecision = 'auto_approve' | 'manual_review' | 'reject';

export const decideApproval = (
  itemEligibilities: ItemEligibility[],
  _reasons: string[],
): { decision: AutoDecision; reason: string } => {
  if (itemEligibilities.length === 0) {
    return { decision: 'reject', reason: 'No returnable items in the request.' };
  }
  const failed = itemEligibilities.filter((e) => !e.eligible);
  if (failed.length > 0) {
    const details = failed
      .map((f) => {
        const blocker = f.checks.find((c) => !c.passed);
        return `item ${f.orderItemId}: ${blocker?.detail ?? 'ineligible'}`;
      })
      .join('; ');
    return { decision: 'reject', reason: details };
  }
  // Every eligible request waits for manual admin review: the admin approves
  // or rejects only after checking order details, reason and attached photos.
  // Until then the request stays Pending on both customer and admin pages.
  return { decision: 'manual_review', reason: 'Eligible items queued for manual admin review.' };
};

/** Refund = Σ(unitPrice × returnQty) − deductions (never negative). */
export const calculateRefund = (
  items: Array<{ unitPrice: number; returnQuantity: number }>,
  deductions = 0,
): number => {
  const gross = items.reduce((sum, i) => sum + i.unitPrice * i.returnQuantity, 0);
  return Math.max(0, Math.round((gross - Math.max(0, deductions)) * 100) / 100);
};

export const fetchOrderForReturn = async (orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) return null;
  return Order.findById(orderId).populate('items.productId', 'name returnPolicy sku images');
};
