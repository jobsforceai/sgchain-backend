import { User } from 'user/models/User.model';
import jwt from 'jsonwebtoken';
import { env } from 'core/config/env';
import crypto from 'crypto';
import { createCustodialWallet } from 'core/clients/sgchainClient';
import logger from 'core/utils/logger';

export const registerUser = async (userData: any) => {
  const { email, fullName, password } = userData;
  if (await User.findOne({ email })) {
    throw new Error('User with this email already exists');
  }

  // Create the on-chain wallet first
  const { address, encryptedPrivateKey } = createCustodialWallet();
  logger.info(`Created new on-chain wallet for ${email} with address ${address}`);

  const user = await User.create({
    email,
    fullName,
    password,
    onchainAddress: address,
    encryptedPrivateKey: encryptedPrivateKey,
    walletCreatedAt: new Date(),
  });

  logger.info(`Successfully registered new user ${email} with userId ${user._id}`);
  return user;
};

export const requestOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }
  const otp = crypto.randomInt(100000, 999999).toString();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  // In a real application, you would send the OTP via email
  console.log(`OTP for ${email}: ${otp}`);

  return { message: 'An OTP has been sent to your email address.' };
};

export const loginUser = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select('+password +otp +otpExpires');
  if (!user || !user.otp || !user.otpExpires) {
    throw new Error('Invalid email or OTP');
  }

  if (user.otp !== otp || user.otpExpires < new Date()) {
    throw new Error('Invalid or expired OTP');
  }

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  const token = jwt.sign({ userId: user._id }, env.JWT_SECRET_USER, {
    expiresIn: '1h',
  });

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
  };
};
