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
