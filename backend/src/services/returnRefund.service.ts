/**
 * Return refund settlement helpers.
 *
 * Kept pure and side-effect free so the money-critical amount math can be
 * unit-tested in isolation from the database and the payment gateway.
 */

/** Statuses from which a refund may be issued, i.e. only once the product has been collected. */
export const REFUNDABLE_STATUSES = [
  'item_received',
  'inspection_completed',
  'on_hold',
  'refund_failed',
] as const;

export type RefundAmountResult =
  | { ok: true; amount: number }
  | { ok: false; message: string };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Resolve the refund amount for a return.
 *
 * @param requested      Admin-supplied amount (optional). Falls back to `base`.
 * @param base           The calculated/agreed refund for this return.
 * @param capturedAmount Captured gateway amount, or null for COD / manual.
 * @param alreadyRefunded Sum of refunds already settled for the SAME order
 *                        via other completed return requests (prevents
 *                        aggregate over-refund across partial returns).
 */
export const resolveRefundAmount = (
  requested: number | undefined,
  base: number,
  capturedAmount: number | null,
  alreadyRefunded = 0,
): RefundAmountResult => {
  const raw = requested ?? base;
  const amount = round2(Number.isFinite(Number(raw)) ? Number(raw) : 0);

  if (amount <= 0) {
    return { ok: false, message: 'Refund amount must be greater than zero.' };
  }

  if (capturedAmount != null) {
    const remaining = round2(Math.max(0, capturedAmount - alreadyRefunded));
    if (remaining <= 0) {
      return { ok: false, message: 'This payment has already been fully refunded.' };
    }
    if (amount > remaining + 1e-6) {
      return {
        ok: false,
        message: `Refund amount ₹${amount.toLocaleString('en-IN')} exceeds the refundable balance of ₹${remaining.toLocaleString('en-IN')}.`,
      };
    }
  }

  return { ok: true, amount };
};

/** True when a fully-refunded payment should be marked `refunded`. */
export const isFullRefund = (amount: number, capturedAmount: number): boolean =>
  amount >= capturedAmount - 1e-6;
