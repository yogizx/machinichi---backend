import mongoose, { Schema } from 'mongoose';

export interface INotification extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  channel: { type: String, enum: ['in_app', 'email', 'sms', 'whatsapp'], default: 'in_app' },
  readAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
