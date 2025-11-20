// src/user/services/transfer.service.ts
import mongoose from 'mongoose';
import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import { LedgerEntry } from 'user/models/LedgerEntry.model';
import * as sgchainClient from 'core/clients/sgchainClient';
import { decrypt } from 'core/utils/crypto';
import logger from 'core/utils/logger';

const MIN_TRANSFER_AMOUNT = 0.000001;

export const internalTransfer = async (params: {
  fromUserId: string;
  toEmail?: string;
  toUserId?: string;
  amountSgc: number;
}) => {
  const { fromUserId, toEmail, toUserId, amountSgc } = params;

  if (!toEmail && !toUserId) {
    throw new Error('RECIPIENT_NOT_SPECIFIED');
  }
  if (amountSgc < MIN_TRANSFER_AMOUNT) {
    throw new Error('TRANSFER_AMOUNT_TOO_LOW');
  }

  const fromUser = await User.findById(fromUserId).select('+encryptedPrivateKey');
  if (!fromUser || !fromUser.encryptedPrivateKey || !fromUser.onchainAddress) {
    throw new Error('SENDER_WALLET_NOT_FOUND');
  }

  const toUser = await User.findOne({ $or: [{ email: toEmail }, { _id: toUserId }] });
  if (!toUser || !toUser.onchainAddress) {
    throw new Error('RECIPIENT_NOT_FOUND');
  }
  if ((fromUser._id as any).equals(toUser._id as any)) {
    throw new Error('CANNOT_TRANSFER_TO_SELF');
  }

  const fromWallet = await Wallet.findOne({ userId: fromUser._id });
  if (!fromWallet || fromWallet.sgcBalance < amountSgc) {
    throw new Error('INSUFFICIENT_SGC_BALANCE');
  }

  // Decrypt sender's private key
  const senderPrivateKey = decrypt(fromUser.encryptedPrivateKey);

  // Perform on-chain transfer
  const { txHash } = await sgchainClient.sendSgcFromPrivateKey({
    privateKey: senderPrivateKey,
    to: toUser.onchainAddress,
    amountSgc,
  });

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    // Debit sender's wallet
    await Wallet.updateOne({ userId: fromUser._id }, { $inc: { sgcBalance: -amountSgc } }, { session });

    // Credit receiver's wallet
    await Wallet.updateOne({ userId: toUser._id }, { $inc: { sgcBalance: amountSgc } }, { session });

    // Create ledger entries
    await LedgerEntry.create([
      { // Debit for sender
        userId: fromUser._id,
        walletId: fromWallet._id,
        type: 'USER_INTERNAL_TRANSFER_DEBIT',
        currency: 'SGC',
        amount: -amountSgc,
        meta: { peerUserId: (toUser._id as any).toString(), peerAddress: toUser.onchainAddress, onchainTxHash: txHash },
      },
      { // Credit for receiver
        userId: toUser._id,
        walletId: (await Wallet.findOne({ userId: toUser._id }))!._id,
        type: 'USER_INTERNAL_TRANSFER_CREDIT',
        currency: 'SGC',
        amount: amountSgc,
        meta: { peerUserId: (fromUser._id as any).toString(), peerAddress: fromUser.onchainAddress, onchainTxHash: txHash },
      }
    ], { session });
  });
  session.endSession();

  logger.info(`Internal transfer successful: ${amountSgc} SGC from ${fromUser.email} to ${toUser.email}`);

  return {
    status: 'SUCCESS',
    fromUserId: fromUser._id,
    toUserId: toUser._id,
    amountSgc,
    txHash,
    fromBalanceAfter: fromWallet.sgcBalance - amountSgc,
  };
};

export const getTransferHistory = async (userId: string) => {
    const entries = await LedgerEntry.find({
        userId,
        type: { $in: ['USER_INTERNAL_TRANSFER_DEBIT', 'USER_INTERNAL_TRANSFER_CREDIT'] }
    }).sort({ createdAt: -1 });

    return entries.map(entry => ({
        direction: entry.type === 'USER_INTERNAL_TRANSFER_DEBIT' ? 'OUT' : 'IN',
        amountSgc: Math.abs(entry.amount),
        peerUserId: entry.meta.peerUserId,
        txHash: entry.meta.onchainTxHash,
        createdAt: (entry as any).createdAt,
    }));
};
