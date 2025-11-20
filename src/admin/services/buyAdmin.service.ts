// src/admin/services/buyAdmin.service.ts
import mongoose from 'mongoose';
import { ethers } from 'ethers';
import { FiatDepositRequest } from 'user/models/FiatDepositRequest.model';
import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import { LedgerEntry } from 'user/models/LedgerEntry.model';
import * as sgchainClient from 'core/clients/sgchainClient';
import logger from 'core/utils/logger';
import { env } from 'core/config/env';

export const listBuyRequests = async (status?: string) => {
  const query: { status?: string } = {};
  if (status) {
    query.status = status;
  }
  return FiatDepositRequest.find(query)
    .populate('userId', 'email fullName')
    .sort({ createdAt: -1 });
};

export const approveBuyRequest = async (params: {
  requestId: string;
  adminId: string;
  adminComment: string;
}) => {
  const { requestId, adminId, adminComment } = params;

  const request = await FiatDepositRequest.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('DEPOSIT_REQUEST_NOT_FOUND_OR_NOT_PENDING');
  }

  const user = await User.findById(request.userId);
  if (!user || !user.onchainAddress) {
    throw new Error('USER_OR_ONCHAIN_WALLET_NOT_FOUND');
  }

  const { txHash } = await sgchainClient.sendSgcFromHotWallet({
    to: user.onchainAddress,
    amountSgc: request.lockedSgcAmount,
  });

  const hotWalletAddress = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY!).address;

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await Wallet.updateOne(
      { userId: request.userId },
      { $inc: { sgcBalance: request.lockedSgcAmount } },
      { session }
    );

    const wallet = await Wallet.findOne({ userId: request.userId }).session(session);
    if (!wallet) throw new Error('Wallet not found during transaction');

    await LedgerEntry.create([{
      userId: request.userId,
      walletId: wallet._id,
      type: 'BUY_SGC_BANK_DEPOSIT',
      currency: 'SGC',
      amount: request.lockedSgcAmount,
      meta: {
        bankRegion: request.bankRegion,
        fiatAmount: request.fiatAmount,
        fiatCurrency: request.fiatCurrency,
        onchainTxHash: txHash,
        onchainFrom: hotWalletAddress,
        onchainTo: user.onchainAddress,
      },
    }], { session });

    request.status = 'APPROVED';
    request.adminId = adminId as any;
    request.adminComment = adminComment;
    request.onchainTxHash = txHash;
    request.onchainFrom = hotWalletAddress;
    request.onchainTo = user.onchainAddress;
    request.approvedAt = new Date();
    await request.save({ session });
  });
  session.endSession();
  
  logger.info(`Fiat deposit request ${requestId} approved by admin ${adminId}`);

  return {
    status: 'SUCCESS',
    requestId: request._id,
    sgcCredited: request.lockedSgcAmount,
    onchainTxHash: txHash,
  };
};

export const rejectBuyRequest = async (params: {
  requestId: string;
  adminId: string;
  reason: string;
}) => {
  const { requestId, adminId, reason } = params;

  const request = await FiatDepositRequest.findById(requestId);
  if (!request || request.status !== 'PENDING') {
    throw new Error('DEPOSIT_REQUEST_NOT_FOUND_OR_NOT_PENDING');
  }

  request.status = 'REJECTED';
  request.adminId = adminId as any;
  request.adminComment = reason;
  await request.save();

  logger.info(`Fiat deposit request ${requestId} rejected by admin ${adminId}`);

  return { status: 'REJECTED' };
};