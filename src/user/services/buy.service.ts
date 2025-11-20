// src/user/services/buy.service.ts
import { FiatDepositRequest } from 'user/models/FiatDepositRequest.model';
import * as pricingService from 'admin/services/pricing.service';
import { User } from 'user/models/User.model';
import { Wallet } from 'user/models/Wallet.model';
import * as sgchainClient from 'core/clients/sgchainClient';
import * as walletService from './wallet.service';
import logger from 'core/utils/logger';

// This data can be moved to a database config collection later
const BANK_ACCOUNTS = [
    {
      region: "INDIA",
      fiatCurrency: "INR",
      bankName: "HDFC Bank",
      accountName: "SAGENEX GLOBAL",
      accountNumber: "xxxxxx",
      ifsc: "HDFC000XXXX",
      note: "Use your SGChain registered email as reference"
    },
    {
      region: "DUBAI",
      fiatCurrency: "AED",
      bankName: "Emirates NBD",
      iban: "AE..",
      note: "Use your SGChain user ID as reference"
    }
];

// Simple internal conversion rate. Can be moved to a config service.
const FIAT_TO_USD_RATES = {
    INR: 1 / 83, // Example rate: 1 USD = 83 INR
    AED: 1 / 3.67, // Example rate: 1 USD = 3.67 AED
    USD: 1,
};

export const getBankAccounts = () => {
  return BANK_ACCOUNTS;
};

export const initiateBuyRequest = async (userId: string, data: any) => {
  const { bankRegion, fiatAmount, fiatCurrency, paymentProofUrl, referenceNote } = data;

  const priceUsd = await pricingService.getCurrentPrice();
  if (priceUsd <= 0) {
    throw new Error('SGC_PRICE_NOT_AVAILABLE');
  }

  const rate = FIAT_TO_USD_RATES[fiatCurrency as keyof typeof FIAT_TO_USD_RATES];
  if (!rate) {
    throw new Error('INVALID_FIAT_CURRENCY');
  }

  const fiatValueUsd = fiatAmount * rate;
  const lockedSgcAmount = Number((fiatValueUsd / priceUsd).toFixed(8)); // 8 decimal places for crypto

  const request = await FiatDepositRequest.create({
    userId,
    bankRegion,
    fiatAmount,
    fiatCurrency,
    paymentProofUrl,
    referenceNote,
    lockedSgcPriceUsd: priceUsd,
    lockedSgcAmount,
    lockedAt: new Date(),
    status: 'PENDING',
  });

  return {
    status: 'PENDING',
    requestId: request._id,
    lockedSgcAmount: request.lockedSgcAmount,
    lockedSgcPriceUsd: request.lockedSgcPriceUsd,
    lockedAt: request.lockedAt,
  };
};

export const getUserBuyRequests = async (userId: string, status?: string) => {
    const query: { userId: string; status?: string } = { userId };
    if (status) {
        query.status = status;
    }
    return FiatDepositRequest.find(query).sort({ createdAt: -1 });
};

export const buySgcWithBalance = async (userId: string, sgcAmount: number) => {
  if (sgcAmount <= 0) {
    throw new Error('INVALID_SGC_AMOUNT');
  }

  const user = await User.findById(userId);
  if (!user || !user.onchainAddress) {
    throw new Error('USER_WALLET_NOT_FOUND');
  }

  const priceUsd = await pricingService.getCurrentPrice();
  if (priceUsd <= 0) {
    throw new Error('SGC_PRICE_NOT_AVAILABLE');
  }

  const costUsd = Number((sgcAmount * priceUsd).toFixed(2));
  const wallet = await walletService.getWalletByUserId(userId);

  if (!wallet || wallet.fiatBalanceUsd < costUsd) {
    throw new Error('INSUFFICIENT_USD_BALANCE');
  }

  // Perform on-chain transfer from hot wallet
  const { txHash } = await sgchainClient.sendSgcFromHotWallet({
    to: user.onchainAddress,
    amountSgc: sgcAmount,
  });

  // Debit USD and credit SGC in separate ledger entries for clarity
  await walletService.applyLedgerEntry({
    userId,
    currency: 'USD',
    amount: -costUsd,
    type: 'BUY_SGC_WITH_USD_BALANCE',
    meta: { sgcAmount, priceUsd, onchainTxHash: txHash },
  });
  await walletService.applyLedgerEntry({
    userId,
    currency: 'SGC',
    amount: sgcAmount,
    type: 'BUY_SGC_WITH_USD_BALANCE',
    meta: { costUsd, priceUsd, onchainTxHash: txHash },
  });

  logger.info(`User ${userId} successfully bought ${sgcAmount} SGC with ${costUsd} USD.`);

  const updatedWallet = await walletService.getWalletByUserId(userId);

  return {
    status: 'SUCCESS',
    onchainTxHash: txHash,
    boughtSgcAmount: sgcAmount,
    costUsd,
    sgcBalanceAfter: updatedWallet?.sgcBalance,
    usdBalanceAfter: updatedWallet?.fiatBalanceUsd,
  };
};