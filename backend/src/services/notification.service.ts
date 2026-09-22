import { Notification } from '../models/Notification';
import { Types } from 'mongoose';

interface INotificationData {
  userId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channel?: 'in_app' | 'email' | 'sms' | 'whatsapp';
}

export const createNotification = async (payload: INotificationData) => {
  return Notification.create({
    ...payload,
    channel: payload.channel || 'in_app',
  });
};

export const sendOrderConfirmationNotifications = async (
  userId: Types.ObjectId,
  orderId: Types.ObjectId,
  orderRef: string
) => {
  await createNotification({
    userId,
    type: 'order_placed',
    title: 'Order Confirmed!',
    message: `Your order #${orderRef} has been placed successfully.`,
    data: { orderId, orderRef },
    channel: 'in_app',
  });
};

export const sendOrderShippedNotification = async (
  userId: Types.ObjectId,
  orderId: Types.ObjectId,
  orderRef: string,
  trackingNumber?: string
) => {
  await createNotification({
    userId,
    type: 'order_shipped',
    title: 'Order Shipped',
    message: `Your order #${orderRef} has been shipped.${trackingNumber ? ` Track: ${trackingNumber}` : ''}`,
    data: { orderId, orderRef, trackingNumber },
    channel: 'in_app',
  });
};

export const sendOrderDeliveredNotification = async (
  userId: Types.ObjectId,
  orderId: Types.ObjectId,
  orderRef: string
) => {
  await createNotification({
    userId,
    type: 'order_delivered',
    title: 'Order Delivered',
    message: `Your order #${orderRef} has been delivered. Enjoy your Machinichi products!`,
    data: { orderId, orderRef },
    channel: 'in_app',
  });
};

export const sendWelcomeNotification = async (userId: Types.ObjectId, name: string) => {
  await createNotification({
    userId,
    type: 'welcome',
    title: `Welcome to Machinichi, ${name}!`,
    message: 'We are thrilled to have you on board. Start exploring our curated collection.',
    channel: 'in_app',
  });
};
