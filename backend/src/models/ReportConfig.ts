import mongoose, { Schema } from 'mongoose';

export interface IReportConfig extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  reportType: string;
  startDate?: string;
  endDate?: string;
  format: string;
  frequency: string;
  recipientEmail: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const reportConfigSchema = new Schema<IReportConfig>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reportType: { type: String, required: true },
  startDate: { type: String },
  endDate: { type: String },
  format: { type: String, required: true },
  frequency: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  status: { type: String, required: true, default: 'Active' },
}, { timestamps: true });

export const ReportConfig = mongoose.model<IReportConfig>('ReportConfig', reportConfigSchema);
