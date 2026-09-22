import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export const createRazorpayOrder = async (amount: number, currency = 'INR', receipt?: string) => {
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    notes: { platform: 'machinichi' },
  });
  return order;
};

export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

export const verifyWebhookSignature = (body: string, signature: string, secret: string): boolean => {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === signature;
};

export const capturePayment = async (paymentId: string, amount: number) => {
  return razorpay.payments.capture(paymentId, amount * 100, 'INR');
};

export const createRefund = async (paymentId: string, amount?: number) => {
  return razorpay.payments.refund(paymentId, {
    ...(amount && { amount: Math.round(amount * 100) }),
  });
};

export const fetchPaymentById = async (paymentId: string) => {
  return razorpay.payments.fetch(paymentId);
};

export default razorpay;
