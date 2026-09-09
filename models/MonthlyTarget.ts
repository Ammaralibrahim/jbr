import mongoose, { Schema, model, models } from 'mongoose';

export interface IMonthlyTarget {
  _id?: string;
  year: number;
  month: number;
  targetGeneration: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyTargetSchema = new Schema<IMonthlyTarget>(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    targetGeneration: { type: Number, required: true, min: 1 },
    notes: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

MonthlyTargetSchema.index({ year: 1, month: 1 }, { unique: true });

export const MonthlyTarget = models.MonthlyTarget || model<IMonthlyTarget>('MonthlyTarget', MonthlyTargetSchema);