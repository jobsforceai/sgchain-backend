// src/user/models/FiatDepositRequest.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IFiatDepositRequest extends Document {
  userId: Schema.Types.ObjectId;
  bankRegion: 'INDIA' | 'DUBAI';
  fiatCurrency: 'INR' | 'AED' | 'USD';
  fiatAmount: number;
  paymentProofUrl: string;
  referenceNote?: string;
  lockedSgcPriceUsd: number;
  lockedSgcAmount: number;
  lockedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminId?: Schema.Types.ObjectId;
  adminComment?: string;
  onchainTxHash?: string;
  onchainFrom?: string;
  onchainTo?: string;
  approvedAt?: Date;
}

const fiatDepositRequestSchema = new Schema<IFiatDepositRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bankRegion: { type: String, enum: ['INDIA', 'DUBAI'], required: true },
    fiatCurrency: { type: String, enum: ['INR', 'AED', 'USD'], required: true },
    fiatAmount: { type: Number, required: true },
    paymentProofUrl: { type: String, required: true },
    referenceNote: { type: String },
    lockedSgcPriceUsd: { type: Number, required: true },
    lockedSgcAmount: { type: Number, required: true },
    lockedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    adminComment: { type: String },
    onchainTxHash: { type: String },
    onchainFrom: { type: String },
    onchainTo: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const FiatDepositRequest = model<IFiatDepositRequest>(
  'FiatDepositRequest',
  fiatDepositRequestSchema
);
