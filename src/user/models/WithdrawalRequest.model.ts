// src/user/models/WithdrawalRequest.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IWithdrawalRequest extends Document {
  userId: Schema.Types.ObjectId;
  amountUsd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  withdrawalType: 'CRYPTO' | 'BANK';
  withdrawalDetails: Record<string, any>;
  adminNotes?: string;
}

const withdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountUsd: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    withdrawalType: { type: String, enum: ['CRYPTO', 'BANK'], required: true },
    withdrawalDetails: { type: Schema.Types.Mixed, required: true },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

export const WithdrawalRequest = model<IWithdrawalRequest>('WithdrawalRequest', withdrawalRequestSchema);
