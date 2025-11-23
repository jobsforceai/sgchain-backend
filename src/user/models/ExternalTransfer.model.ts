import { Schema, model, Document } from 'mongoose';

export interface IExternalTransfer extends Document {
  userId: Schema.Types.ObjectId;
  code: string;
  amountSgc: number;
  amountUsd: number;
  exchangeRate: number; // SGC to USD rate at time of creation
  status: 'PENDING_CLAIM' | 'CLAIMED' | 'EXPIRED';
  targetPlatform: string; // e.g., 'SGTRADING'
  onchainTxHash?: string; // Optional now (only set on redemption)
  claimedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const externalTransferSchema = new Schema<IExternalTransfer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, unique: true },
    amountSgc: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING_CLAIM', 'CLAIMED', 'EXPIRED'],
      default: 'PENDING_CLAIM',
    },
    targetPlatform: { type: String, default: 'SGTRADING' },
    onchainTxHash: { type: String }, // Not required initially
    claimedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const ExternalTransfer = model<IExternalTransfer>(
  'ExternalTransfer',
  externalTransferSchema
);
