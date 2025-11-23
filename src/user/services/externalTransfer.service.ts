import { ExternalTransfer } from 'user/models/ExternalTransfer.model';
import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import * as walletService from 'user/services/wallet.service';
import * as pricingService from 'admin/services/pricing.service';
import * as sgchainClient from 'core/clients/sgchainClient';
import crypto from 'crypto';
import logger from 'core/utils/logger';
import mongoose from 'mongoose';

const CODE_EXPIRY_MINUTES = 10;

/**
 * Initiates a transfer from SGChain to an external platform (SGTrading).
 * Uses "Soft Lock" mechanism:
 * 1. Deduct from Available, Add to Locked.
 * 2. NO on-chain tx yet.
 */
export const createExternalTransfer = async (
  userId: string,
  amountSgc: number
) => {
  if (amountSgc <= 0) throw new Error('INVALID_AMOUNT');

  // Check On-Chain Wallet Existence (for later)
  const user = await User.findById(userId);
  if (!user || !user.onchainAddress) throw new Error('USER_WALLET_NOT_FOUND');

  const priceUsd = await pricingService.getCurrentPrice();
  if (priceUsd <= 0) throw new Error('PRICE_UNAVAILABLE');

  const amountUsd = Number((amountSgc * priceUsd).toFixed(2));
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // DB Transaction for Locking
  const session = await mongoose.startSession();
  let code = '';
  let transferId;

  await session.withTransaction(async () => {
    const wallet = await Wallet.findOne({ userId }).session(session);
    if (!wallet || wallet.sgcBalance < amountSgc) {
      throw new Error('INSUFFICIENT_SGC_BALANCE');
    }

    // Soft Lock Logic
    wallet.sgcBalance -= amountSgc;
    wallet.lockedSgcBalance = (wallet.lockedSgcBalance || 0) + amountSgc;
    await wallet.save({ session });

    // Generate Code
    code = `SGT-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const transfer = await ExternalTransfer.create([{
      userId,
      code,
      amountSgc,
      amountUsd,
      exchangeRate: priceUsd,
      status: 'PENDING_CLAIM',
      targetPlatform: 'SGTRADING',
      expiresAt,
    }], { session });
    
    transferId = transfer[0]._id;
  });
  session.endSession();

  logger.info(`External transfer soft-locked: ${code} for ${amountUsd} USD. Expires at ${expiresAt}`);

  return {
    transferId,
    code,
    amountSgc,
    amountUsd,
    status: 'PENDING_CLAIM',
    expiresAt,
    createdAt: new Date(),
  };
};

import { LedgerEntry } from 'user/models/LedgerEntry.model';

// ... (existing imports)

/**
 * Validates and Redeems a code. Called by Partner API.
 * Triggers the actual On-Chain transfer now.
 */
export const redeemExternalTransfer = async (code: string) => {
  const transfer = await ExternalTransfer.findOne({ code });

  if (!transfer) throw new Error('INVALID_CODE');
  if (transfer.status === 'CLAIMED') throw new Error('CODE_ALREADY_CLAIMED');
  
  // Check Expiry
  if (transfer.status === 'EXPIRED' || new Date() > transfer.expiresAt) {
    await expireTransfer(transfer._id as string);
    throw new Error('CODE_EXPIRED');
  }

  // Retrieve user for keys
  const user = await User.findById(transfer.userId).select('+encryptedPrivateKey');
  if (!user || !user.encryptedPrivateKey) throw new Error('USER_WALLET_ISSUE');

  // 1. Trigger On-Chain Transaction (Real Move)
  logger.info(`Redeeming code ${code}: Sending ${transfer.amountSgc} SGC on-chain...`);
  
  let txHash = '';
  try {
    const res = await sgchainClient.sendSgcFromUserWallet({
      encryptedPrivateKey: user.encryptedPrivateKey,
      amountSgc: transfer.amountSgc,
    });
    txHash = res.txHash;
  } catch (error: any) {
    logger.error('On-chain transfer failed during redemption:', error);
    throw new Error('ONCHAIN_TRANSFER_FAILED'); 
  }

  // 2. Finalize DB (Unlock -> Spent)
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    // 2a. Update Wallet (Unlock Funds)
    const wallet = await Wallet.findOne({ userId: transfer.userId }).session(session);
    if (wallet) {
      wallet.lockedSgcBalance -= transfer.amountSgc;
      // We do NOT need to update sgcBalance or fiatBalanceUsd here, 
      // because the funds were ALREADY deducted from sgcBalance during 'createExternalTransfer'.
      // They were just sitting in 'lockedSgcBalance' waiting to be burned/removed.
      // So simply reducing lockedSgcBalance effectively "burns" them from the user's view.
      await wallet.save({ session });

      // 2b. Create Ledger Entry (Manual creation to avoid nested transaction conflict)
      await LedgerEntry.create(
        [{
          userId: transfer.userId,
          walletId: wallet._id,
          currency: 'SGC',
          amount: -transfer.amountSgc, // Debit
          type: 'EXTERNAL_TRANSFER_SGC_DEBIT',
          meta: {
            targetPlatform: 'SGTRADING',
            amountUsd: transfer.amountUsd,
            code: transfer.code,
            onchainTxHash: txHash,
          },
        }],
        { session }
      );
    }

    // 2c. Update Transfer Status
    transfer.status = 'CLAIMED';
    transfer.onchainTxHash = txHash;
    transfer.claimedAt = new Date();
    await transfer.save({ session });
  });
  session.endSession();

  logger.info(`Code ${code} redeemed successfully. Tx: ${txHash}`);

  return {
    status: 'SUCCESS',
    amountUsd: transfer.amountUsd,
    originalSgcAmount: transfer.amountSgc,
    transferId: transfer._id,
  };
};

/**
 * Expire a transfer and return funds to available balance.
 * Can be called by a CRON job or lazily.
 */
export const expireTransfer = async (transferId: string) => {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const transfer = await ExternalTransfer.findById(transferId).session(session);
    if (!transfer || transfer.status !== 'PENDING_CLAIM') return;

    const wallet = await Wallet.findOne({ userId: transfer.userId }).session(session);
    if (wallet) {
      // Return funds
      wallet.lockedSgcBalance -= transfer.amountSgc;
      wallet.sgcBalance += transfer.amountSgc;
      await wallet.save({ session });
    }

    transfer.status = 'EXPIRED';
    await transfer.save({ session });
  });
  session.endSession();
  logger.info(`Transfer ${transferId} has been expired and funds returned.`);
};

export const getMyExternalTransfers = async (userId: string) => {
  // Optional: Trigger lazy expiry check on list
  // await checkExpiriesForUser(userId); 
  return ExternalTransfer.find({ userId }).sort({ createdAt: -1 });
};