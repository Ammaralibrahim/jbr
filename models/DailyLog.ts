import mongoose, { Schema, model, models } from 'mongoose';

export interface IDailyLog {
  _id?: string;
  unitId: mongoose.Types.ObjectId;
  date: Date;
  operatingHours: number;
  pMax: number;
  pMin: number;
  qMax: number;
  qMin: number;
  generatorStart: number;
  generatorEnd: number;
  totalGeneration: number;
  bt01Start: number;
  bt01End: number;
  bt01Consumption: number;
  bt02Start: number;
  bt02End: number;
  bt02Consumption: number;
  bl01Start: number;
  bl01End: number;
  bl01Consumption: number;
  bm01Start: number;
  bm01End: number;
  bm01Consumption: number;
  excitationStart: number;
  excitationEnd: number;
  excitationConsumption: number;
  reactiveStart: number;
  reactiveEnd: number;
  reactiveGeneration: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DailyLogSchema = new Schema<IDailyLog>(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'Unit is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
    operatingHours: { type: Number, required: true, min: 0, max: 24, default: 24 },
    pMax: { type: Number, required: true, min: 0, default: 0 },
    pMin: { type: Number, required: true, min: 0, default: 0 },
    qMax: { type: Number, required: true, min: 0, default: 0 },
    qMin: { type: Number, required: true, min: 0, default: 0 },
    generatorStart: { type: Number, required: true, min: 0, default: 0 },
    generatorEnd: { type: Number, required: true, min: 0, default: 0 },
    totalGeneration: { type: Number, required: true, min: 0, default: 0 },
    bt01Start: { type: Number, default: 0 },
    bt01End: { type: Number, default: 0 },
    bt01Consumption: { type: Number, default: 0 },
    bt02Start: { type: Number, default: 0 },
    bt02End: { type: Number, default: 0 },
    bt02Consumption: { type: Number, default: 0 },
    bl01Start: { type: Number, default: 0 },
    bl01End: { type: Number, default: 0 },
    bl01Consumption: { type: Number, default: 0 },
    bm01Start: { type: Number, default: 0 },
    bm01End: { type: Number, default: 0 },
    bm01Consumption: { type: Number, default: 0 },
    excitationStart: { type: Number, default: 0 },
    excitationEnd: { type: Number, default: 0 },
    excitationConsumption: { type: Number, default: 0 },
    reactiveStart: { type: Number, default: 0 },
    reactiveEnd: { type: Number, default: 0 },
    reactiveGeneration: { type: Number, default: 0 },
    notes: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DailyLogSchema.index({ unitId: 1, date: 1 }, { unique: true });

export const DailyLog = models.DailyLog || model<IDailyLog>('DailyLog', DailyLogSchema);