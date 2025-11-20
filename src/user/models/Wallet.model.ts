import { Schema, model, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: Schema.Types.ObjectId;
  sgcBalance: number;
  fiatBalanceUsd: number;
  status: 'ACTIVE' | 'FROZEN';
}

const walletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sgcBalance: { type: Number, default: 0 },
    fiatBalanceUsd: { type: Number, default: 0, required: true },
    status: { type: String, enum: ['ACTIVE', 'FROZEN'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Wallet = model<IWallet>('Wallet', walletSchema);
