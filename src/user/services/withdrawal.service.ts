// src/user/services/withdrawal.service.ts
import { WithdrawalRequest } from 'user/models/WithdrawalRequest.model';
import { User } from 'user/models/User.model';
import * as walletService from 'user/services/wallet.service';
import logger from 'core/utils/logger';

export const requestWithdrawal = async (userId: string, data: any) => {
  const { amountUsd, withdrawalType, withdrawalDetails } = data;

  // 1. Check for existing pending request
  const existingPending = await WithdrawalRequest.findOne({ userId, status: 'PENDING' });
  if (existingPending) {
    throw new Error('PENDING_WITHDRAWAL_EXISTS');
  }

  // 2. Check user's KYC status
  const user = await User.findById(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  if (withdrawalType === 'BANK') {
    const requiredRegion = withdrawalDetails.region; // e.g., 'INDIA' or 'DUBAI'
    if (!requiredRegion || !user.kycVerifiedRegions?.includes(requiredRegion)) {
      throw new Error('KYC_NOT_VERIFIED_FOR_REGION');
    }
  }
  // For crypto, we can assume a global KYC is sufficient, or add more specific rules later.
  if (withdrawalType === 'CRYPTO' && (!user.kycVerifiedRegions || user.kycVerifiedRegions.length === 0)) {
      throw new Error('KYC_NOT_VERIFIED');
  }

  // 3. Check for sufficient balance
  const wallet = await walletService.getWalletByUserId(userId);
  if (!wallet || wallet.fiatBalanceUsd < amountUsd) {
    throw new Error('INSUFFICIENT_USD_BALANCE');
  }

  // 4. Debit the user's balance and create the request
  await walletService.applyLedgerEntry({
    userId,
    currency: 'USD',
    amount: -amountUsd,
    type: 'WITHDRAWAL_REQUEST_DEBIT',
    meta: { withdrawalType, withdrawalDetails },
  });

  const withdrawalRequest = await WithdrawalRequest.create({
    userId,
    amountUsd,
    withdrawalType,
    withdrawalDetails,
    status: 'PENDING',
  });

  logger.info(`User ${userId} created withdrawal request ${withdrawalRequest._id} for ${amountUsd} USD.`);

  return {
    withdrawalId: withdrawalRequest._id,
    status: withdrawalRequest.status,
    amountUsd: withdrawalRequest.amountUsd,
  };
};

export const getWithdrawalHistory = async (userId: string) => {
  return WithdrawalRequest.find({ userId }).sort({ createdAt: -1 });
};
