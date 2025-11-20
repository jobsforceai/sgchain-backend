import { Schema, model, Document } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const configSchema = new Schema<IConfig>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: { updatedAt: true, createdAt: false } }
);

export const Config = model<IConfig>('Config', configSchema);
