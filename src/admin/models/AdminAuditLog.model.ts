import { Schema, model, Document } from 'mongoose';

export interface IAdminAuditLog extends Document {
  adminId: Schema.Types.ObjectId;
  actionType: string;
  payload: any;
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    actionType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AdminAuditLog = model<IAdminAuditLog>(
  'AdminAuditLog',
  adminAuditLogSchema
);
