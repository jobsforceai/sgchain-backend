import { User } from 'user/models/User.model';
import jwt from 'jsonwebtoken';
import { env } from 'core/config/env';
import crypto from 'crypto';
import { createCustodialWallet } from 'core/clients/sgchainClient';
import logger from 'core/utils/logger';
import { sendVerificationOtpEmail } from 'email/email.service';

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
    // Return successfully to prevent email enumeration attacks
    logger.info(`OTP requested for non-existent user: ${email}`);
    return { message: 'If a user with that email exists, an OTP has been sent.' };
  }
  const otp = crypto.randomInt(100000, 999999).toString();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  await sendVerificationOtpEmail({ email: user.email, fullName: user.fullName }, otp);
  logger.info(`OTP sent to ${email}`);

  return { message: 'If a user with that email exists, an OTP has been sent.' };
};

export const loginWithPassword = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign({ userId: user._id }, env.JWT_SECRET_USER, {
    expiresIn: '1h',
  });

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
  };
};

export const loginWithOtp = async (email: string, otp: string) => {
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
