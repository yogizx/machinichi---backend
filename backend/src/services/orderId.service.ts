import crypto from 'crypto';

const usedIds = new Set<string>();

export const generateOrderId = (): string => {
  const prefix = 'MAC';
  let id: string;
  do {
    const num = crypto.randomInt(10000, 99999);
    id = `${prefix}-${num}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
};

export const generateReturnId = (): string => {
  const prefix = 'RT';
  let id: string;
  do {
    const num = crypto.randomInt(1000, 9999);
    id = `${prefix}-${num}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
};

export const generateInvoiceNumber = (): string => {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const num = crypto.randomInt(1000, 9999);
  return `${prefix}-${year}-${num}`;
};

/**
 * Return Merchandise Authorisation number issued at approval time.
 * Format: RMA-2026-XXXXXX (year + 6 random alphanumeric chars).
 * Uniqueness within a process is guarded by the in-memory set; the
 * ReturnRequest.rmaNumber sparse-unique index is the durable guard.
 */
export const generateRmaNumber = (): string => {
  const year = new Date().getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  const id = `RMA-${year}-${suffix}`;
  if (usedIds.has(id)) return generateRmaNumber();
  usedIds.add(id);
  return id;
};
