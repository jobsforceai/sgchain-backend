import { Schema, model, Document } from 'mongoose';

export interface IAdminUser extends Document {
  email: string;
  passwordHash: string;
  role: 'SUPERADMIN' | 'FINANCE' | 'SUPPORT' | 'AUDITOR' | 'KYC_ADMIN';
}

const adminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPERADMIN', 'FINANCE', 'SUPPORT', 'AUDITOR', 'KYC_ADMIN'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminUser = model<IAdminUser>('AdminUser', adminUserSchema);
