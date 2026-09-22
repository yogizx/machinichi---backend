import mongoose, { Schema } from 'mongoose';

export interface IAnalyticsSettings extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  fromDate: string;
  toDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSettingsSchema = new Schema<IAnalyticsSettings>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
}, { timestamps: true });

export const AnalyticsSettings = mongoose.model<IAnalyticsSettings>('AnalyticsSettings', analyticsSettingsSchema);
