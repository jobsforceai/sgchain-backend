// src/user/services/wallet.service.ts
import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import { LedgerEntry } from 'user/models/LedgerEntry.model';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from 'core/config/env';
import { decrypt } from 'core/utils/crypto';
import { validatePinCharacters } from 'core/utils/emoji';

// --- Read Operations ---

export const getOrCreateWallet = async (userId: string) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId });
  }
  return wallet;
};

export const getWalletByUserId = async (userId: string) => {
  return await Wallet.findOne({ userId });
};

export const getWalletDetails = async (userId: string) => {
  const user = await User.findById(userId).select('+encryptedPrivateKey');
  if (!user || !user.onchainAddress || !user.encryptedPrivateKey) {
    throw new Error('WALLET_DETAILS_NOT_FOUND');
  }

  const privateKey = decrypt(user.encryptedPrivateKey);

  return {
    onchainAddress: user.onchainAddress,
    privateKey: privateKey,
  };
};

// --- PIN Management ---

export const setWalletPin = async (userId: string, pin: string) => {
  if (!validatePinCharacters(pin)) {
    throw new Error('INVALID_PIN_FORMAT');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  user.walletPin = pin;
  await user.save();
  return { status: 'SUCCESS', message: 'Wallet PIN has been set.' };
};

export const verifyWalletPin = async (userId: string, pin: string) => {
  const user = await User.findById(userId).select('+walletPin');
  if (!user || !user.walletPin) {
    throw new Error('PIN_NOT_SET');
  }

  const isMatch = await user.compareWalletPin(pin);
  if (!isMatch) {
    throw new Error('INVALID_PIN');
  }

  // Generate a short-lived token specifically for wallet access
  const walletAccessToken = jwt.sign(
    { userId: user._id, scope: 'wallet' },
    env.JWT_SECRET_USER,
    { expiresIn: '4h' } // 4-hour expiry as requested
  );

  return {
    walletAccessToken,
    tokenType: 'Bearer',
    expiresIn: 4 * 60 * 60, // 4 hours in seconds
  };
};

// --- Write Operations (from old service) ---

export const applyLedgerEntry = async (data: {
  userId: string;
  currency: 'SGC' | 'USD';
  amount: number;
  type: any; // Simplified for now
  meta?: Record<string, any>;
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallet = await Wallet.findOne({ userId: data.userId }).session(session);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    await LedgerEntry.create(
      [{
        userId: data.userId,
        walletId: wallet._id,
        currency: data.currency,
        amount: data.amount,
        type: data.type,
        meta: data.meta,
      }],
      { session }
    );

    if (data.currency === 'SGC') {
      wallet.sgcBalance += data.amount;
    } else if (data.currency === 'USD') {
      wallet.fiatBalanceUsd = (wallet.fiatBalanceUsd || 0) + data.amount;
    }

    await wallet.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};