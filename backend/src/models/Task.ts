import mongoose, { Schema } from 'mongoose';

export interface ITask extends mongoose.Document {
  title: string;
  status: 'Pending' | 'Completed';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>({
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Task = mongoose.model<ITask>('Task', taskSchema);
