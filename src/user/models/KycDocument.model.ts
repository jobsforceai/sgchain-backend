// src/user/models/KycDocument.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IKycDocument extends Document {
  userId: Schema.Types.ObjectId;
  region: 'INDIA' | 'DUBAI';
  documentType: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID' | 'SELFIE' | 'PROOF_OF_ADDRESS';
  documentUrl: string;
  documentBackUrl?: string;
}

const kycDocumentSchema = new Schema<IKycDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    region: { type: String, enum: ['INDIA', 'DUBAI'], required: true },
    documentType: { type: String, enum: ['PASSPORT', 'DRIVING_LICENSE', 'NATIONAL_ID', 'SELFIE', 'PROOF_OF_ADDRESS'], required: true },
    documentUrl: { type: String, required: true },
    documentBackUrl: { type: String },
  },
  { 
    timestamps: true,
  }
);

// A user can only have one of each document type per region
kycDocumentSchema.index({ userId: 1, region: 1, documentType: 1 }, { unique: true });

export const KycDocument = model<IKycDocument>('KycDocument', kycDocumentSchema);
