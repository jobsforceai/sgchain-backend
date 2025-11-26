import { Schema, model, Document } from 'mongoose';

export interface ICandle extends Document {
  symbol: string;
  resolution: string; // '1', '5', '15', '60', 'D'
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const candleSchema = new Schema<ICandle>(
  {
    symbol: { type: String, required: true, index: true },
    resolution: { type: String, required: true, index: true },
    time: { type: Number, required: true, index: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index for efficient querying
candleSchema.index({ symbol: 1, resolution: 1, time: -1 });
// Ensure uniqueness for a specific time/resolution/symbol tuple
candleSchema.index({ symbol: 1, resolution: 1, time: 1 }, { unique: true });

export const Candle = model<ICandle>('Candle', candleSchema);
