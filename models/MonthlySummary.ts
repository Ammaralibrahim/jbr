import mongoose, { Schema, model, models } from 'mongoose';

export interface IMonthlySummary {
  _id?: string;
  year: number;
  month: number;
  unitId: mongoose.Types.ObjectId;
  totalOperatingHours: number;
  totalGeneration: number;
  netGeneration: number;
  totalConsumption: number;
  averagePMax: number;
  averagePMin: number;
  averageQMax: number;
  averageQMin: number;
  totalBT01Consumption: number;
  totalBT02Consumption: number;
  totalBL01Consumption: number;
  totalBM01Consumption: number;
  totalExcitationConsumption: number;
  capacityFactor: number;
  availabilityFactor: number;
  netGenerationRate: number;
  loadFactor: number;
  utilizationRate: number;
  daysInOperation: number;
  generatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlySummarySchema = new Schema<IMonthlySummary>(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    totalOperatingHours: { type: Number, default: 0 },
    totalGeneration: { type: Number, default: 0 },
    netGeneration: { type: Number, default: 0 },
    totalConsumption: { type: Number, default: 0 },
    averagePMax: { type: Number, default: 0 },
    averagePMin: { type: Number, default: 0 },
    averageQMax: { type: Number, default: 0 },
    averageQMin: { type: Number, default: 0 },
    totalBT01Consumption: { type: Number, default: 0 },
    totalBT02Consumption: { type: Number, default: 0 },
    totalBL01Consumption: { type: Number, default: 0 },
    totalBM01Consumption: { type: Number, default: 0 },
    totalExcitationConsumption: { type: Number, default: 0 },
    capacityFactor: { type: Number, default: 0 },
    availabilityFactor: { type: Number, default: 0 },
    netGenerationRate: { type: Number, default: 0 },
    loadFactor: { type: Number, default: 0 },
    utilizationRate: { type: Number, default: 0 },
    daysInOperation: { type: Number, default: 0 },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

MonthlySummarySchema.index({ year: 1, month: 1, unitId: 1 }, { unique: true });

export const MonthlySummary = models.MonthlySummary || model<IMonthlySummary>('MonthlySummary', MonthlySummarySchema);