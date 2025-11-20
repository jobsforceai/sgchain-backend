import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  sagenexUserId?: string;
  status: 'ACTIVE' | 'FROZEN';
  fullName: string;
  password?: string;
  otp?: string;
  otpExpires?: Date;
  onchainAddress?: string;
  encryptedPrivateKey?: string;
  walletCreatedAt?: Date;
  walletPin?: string;
  kycVerifiedRegions?: ('INDIA' | 'DUBAI')[];
  comparePassword(password: string): Promise<boolean>;
  compareWalletPin(pin: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    sagenexUserId: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['ACTIVE', 'FROZEN'], default: 'ACTIVE' },
    fullName: { type: String, required: true },
    password: { type: String, required: true, select: false },
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    onchainAddress: { type: String, unique: true, sparse: true },
    encryptedPrivateKey: { type: String, select: false },
    walletCreatedAt: { type: Date },
    walletPin: { type: String, select: false },
    kycVerifiedRegions: [{ type: String, enum: ['INDIA', 'DUBAI'] }],
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified('walletPin') && this.walletPin) {
    this.walletPin = await bcrypt.hash(this.walletPin, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password: string) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.compareWalletPin = async function (pin: string) {
  if (!this.walletPin) return false;
  return await bcrypt.compare(pin, this.walletPin);
};

export const User = model<IUser>('User', userSchema);

