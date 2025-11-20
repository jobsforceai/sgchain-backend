// src/user/models/KycRecord.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IKycRecord extends Document {
  userId: Schema.Types.ObjectId;
  region: 'INDIA' | 'DUBAI';
  status: 'DRAFT' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  adminNotes?: string;
  submittedAt?: Date;
}

const kycRecordSchema = new Schema<IKycRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    region: { type: String, enum: ['INDIA', 'DUBAI'], required: true },
    status: { type: String, enum: ['DRAFT', 'PENDING', 'VERIFIED', 'REJECTED'], default: 'DRAFT' },
    rejectionReason: { type: String },
    adminNotes: { type: String },
    submittedAt: { type: Date },
  },
  { 
    timestamps: true,
  }
);

// A user can only have one KYC application per region
kycRecordSchema.index({ userId: 1, region: 1 }, { unique: true });

export const KycRecord = model<IKycRecord>('KycRecord', kycRecordSchema);
