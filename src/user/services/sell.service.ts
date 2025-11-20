// src/user/services/sell.service.ts
import { User } from 'user/models/User.model';
import * as pricingService from 'admin/services/pricing.service';
import * as walletService from 'user/services/wallet.service';
import * as sgchainClient from 'core/clients/sgchainClient';
import logger from 'core/utils/logger';

export const sellSgc = async (userId: string, sgcAmount: number) => {
  if (sgcAmount <= 0) {
    throw new Error('INVALID_SGC_AMOUNT');
  }

  const user = await User.findById(userId).select('+encryptedPrivateKey');
  if (!user || !user.encryptedPrivateKey) {
    throw new Error('USER_WALLET_NOT_FOUND');
  }

  const wallet = await walletService.getWalletByUserId(userId);
  if (!wallet || wallet.sgcBalance < sgcAmount) {
    throw new Error('INSUFFICIENT_SGC_BALANCE');
  }

  const priceUsd = await pricingService.getCurrentPrice();
  if (priceUsd <= 0) {
    throw new Error('SGC_PRICE_NOT_AVAILABLE');
  }

  // 1. Perform the on-chain transfer from the user's wallet to the hot wallet
  const { txHash } = await sgchainClient.sendSgcFromUserWallet({
    encryptedPrivateKey: user.encryptedPrivateKey,
    amountSgc: sgcAmount,
  });

  // 2. Update the user's balances and create ledger entries
  const valueUsd = Number((sgcAmount * priceUsd).toFixed(2));

  // Debit SGC from user's wallet
  await walletService.applyLedgerEntry({
    userId,
    currency: 'SGC',
    amount: -sgcAmount,
    type: 'SELL_SGC_DEBIT',
    meta: { valueUsd, priceUsd, onchainTxHash: txHash },
  });

  // Credit USD to user's wallet
  await walletService.applyLedgerEntry({
    userId,
    currency: 'USD',
    amount: valueUsd,
    type: 'SELL_SGC_CREDIT',
    meta: { sgcAmount, priceUsd, onchainTxHash: txHash },
  });

  logger.info(`User ${userId} successfully sold ${sgcAmount} SGC for ${valueUsd} USD.`);

  const updatedWallet = await walletService.getWalletByUserId(userId);

  return {
    status: 'SUCCESS',
    onchainTxHash: txHash,
    soldSgcAmount: sgcAmount,
    creditedUsdAmount: valueUsd,
    sgcBalanceAfter: updatedWallet?.sgcBalance,
    usdBalanceAfter: updatedWallet?.fiatBalanceUsd,
  };
};
