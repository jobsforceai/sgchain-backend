// src/scripts/clear-user-data.ts
import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import { Wallet } from '../user/models/Wallet.model';
import { LedgerEntry } from '../user/models/LedgerEntry.model';
import { FiatDepositRequest } from '../user/models/FiatDepositRequest.model';
import logger from '../core/utils/logger';

const run = async () => {
  try {
    // A simple confirmation prompt to prevent accidental runs
    const confirm = process.argv[2];
    if (confirm !== '--confirm') {
      logger.warn('This is a destructive operation.');
      logger.warn('Please run the script with the --confirm flag to proceed.');
      logger.info('Usage: npm run db:clear -- --confirm');
      process.exit(0);
    }

    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB.');

    logger.info('Deleting all Wallet entries...');
    await Wallet.deleteMany({});
    logger.info('✅ Wallets cleared.');

    logger.info('Deleting all LedgerEntry entries...');
    await LedgerEntry.deleteMany({});
    logger.info('✅ Ledger cleared.');

    logger.info('Deleting all FiatDepositRequest entries...');
    await FiatDepositRequest.deleteMany({});
    logger.info('✅ Fiat Deposit Requests cleared.');

    logger.info('Resetting user wallet data (onchainAddress, encryptedPrivateKey)...');
    await User.updateMany({}, {
      $unset: {
        onchainAddress: "",
        encryptedPrivateKey: "",
        walletCreatedAt: "",
        walletPin: "",
        sagenexUserId: ""
      }
    });
    logger.info('✅ User wallet data reset.');

    logger.info('Database has been successfully cleared of user transactional data.');

  } catch (error: any) {
    logger.error('❌ Script failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
