import mongoose, { Schema, model, models } from 'mongoose';

export interface ITransformerLog {
  _id?: string;
  unitId: mongoose.Types.ObjectId;
  date: Date;
  transformerCode: string;
  transformerName: string;
  transformerType: 'Auxiliary' | 'Grid' | 'Internal';
  startReading: number;
  endReading: number;
  consumption: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransformerLogSchema = new Schema<ITransformerLog>(
  {
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    transformerCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    transformerName: {
      type: String,
      required: true,
    },
    transformerType: {
      type: String,
      enum: ['Auxiliary', 'Grid', 'Internal'],
      required: true,
    },
    startReading: {
      type: Number,
      required: true,
      min: 0,
    },
    endReading: {
      type: Number,
      required: true,
      min: 0,
    },
    consumption: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TransformerLogSchema.index(
  { unitId: 1, date: 1, transformerCode: 1 },
  { unique: true }
);

export const TransformerLog =
  models.TransformerLog ||
  model<ITransformerLog>('TransformerLog', TransformerLogSchema);