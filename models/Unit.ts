import mongoose, { Schema, model, models } from 'mongoose';

export interface IUnit {
  _id?: string;
  unitCode: string;
  unitName: string;
  unitNameAr: string;
  unitType: 'Steam' | 'Gas';
  capacityMW: number;
  multiplier: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema = new Schema<IUnit>(
  {
    unitCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      enum: ['ST1', 'ST2', 'ST3', 'GT1', 'GT2', 'GT3', 'GT4'],
    },
    unitName: { type: String, required: true, trim: true },
    unitNameAr: { type: String, required: true, trim: true },
    unitType: { type: String, enum: ['Steam', 'Gas'], required: true },
    capacityMW: { type: Number, required: true, min: 0 },
    multiplier: {
      type: Number,
      required: true,
      default: 1,
      min: 0.001,
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Unit = models.Unit || model<IUnit>('Unit', UnitSchema);