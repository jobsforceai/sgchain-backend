// src/scripts/check-hot-wallet-balance.ts
import { env } from '../core/config/env';
import { getOnchainSgcBalance } from "../core/clients/sgchainClient";
import { ethers } from 'ethers';
import logger from '../core/utils/logger';

const checkBalance = async () => {
  try {
    if (!env.SGCHAIN_HOT_WALLET_PRIVATE_KEY) {
      throw new Error("SGCHAIN_HOT_WALLET_PRIVATE_KEY is not set in your .env file.");
    }

    const hotWalletAddress = new ethers.Wallet(env.SGCHAIN_HOT_WALLET_PRIVATE_KEY).address;
    logger.info(`Checking balance for hot wallet address: ${hotWalletAddress}`);

    const balance = await getOnchainSgcBalance(hotWalletAddress);

    logger.info('---------------------------------');
    logger.info(`Hot Wallet SGC Balance: ${balance}`);
    logger.info('---------------------------------');

  } catch (error: any) {
    logger.error('❌ Failed to check hot wallet balance:');
    console.error(error.message);
    process.exit(1);
  }
};

checkBalance();
