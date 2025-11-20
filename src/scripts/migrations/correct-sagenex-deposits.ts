// src/scripts/migrations/correct-sagenex-deposits.ts
import mongoose from 'mongoose';
import { env } from '../../core/config/env';
import { LedgerEntry } from '../../user/models/LedgerEntry.model';
import { Wallet } from '../../user/models/Wallet.model';
import logger from '../../core/utils/logger';

const runMigration = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for migration.');

    // Find ledger entries that were incorrectly processed as SGC deposits from Sagenex
    const incorrectEntries = await LedgerEntry.find({
      type: 'DEPOSIT_FROM_SAGENEX',
      'meta.migration_corrected': { $ne: true }
    });

    if (incorrectEntries.length === 0) {
      logger.info('No incorrect Sagenex deposits found to migrate.');
      return;
    }

    logger.info(`Found ${incorrectEntries.length} incorrect entries to migrate.`);

    for (const entry of incorrectEntries) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const wallet = await Wallet.findOne({ userId: entry.userId }).session(session);
          if (!wallet) {
            throw new Error(`Wallet not found for userId: ${entry.userId}`);
          }

          const incorrectSgcAmount = entry.amount;
          const correctUsdAmount = entry.meta.transferredAmountUsd;

          if (typeof correctUsdAmount !== 'number') {
            throw new Error(`transferredAmountUsd not found or invalid in meta for entry ${entry._id}`);
          }

          logger.info(`Correcting wallet for user ${entry.userId}:`);
          logger.info(`  - Current SGC Balance: ${wallet.sgcBalance}`);
          logger.info(`  - Current USD Balance: ${wallet.fiatBalanceUsd}`);
          logger.info(`  - Reversing SGC credit of: ${incorrectSgcAmount}`);
          logger.info(`  - Applying USD credit of: ${correctUsdAmount}`);

          // 1. Perform the direct balance correction
          wallet.sgcBalance -= incorrectSgcAmount;
          wallet.fiatBalanceUsd += correctUsdAmount;
          
          await wallet.save({ session });
          logger.info(`  - New SGC Balance: ${wallet.sgcBalance}`);
          logger.info(`  - New USD Balance: ${wallet.fiatBalanceUsd}`);

          // 2. Update the ledger entry to reflect the correction
          entry.type = 'DEPOSIT_FROM_SAGENEX_USD';
          entry.currency = 'USD';
          entry.amount = correctUsdAmount;
          entry.meta.migration_corrected = true; // Mark as corrected
          
          await entry.save({ session });

          logger.info(`Successfully migrated entry ${entry._id} for user ${entry.userId}.`);
        });
      } catch (error) {
        logger.error(`Failed to migrate entry ${entry._id}. Aborting transaction.`, { error });
      } finally {
        session.endSession();
      }
    }

    logger.info('✅ Migration script finished.');

  } catch (error) {
    logger.error('❌ An error occurred during the migration process:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
};

runMigration();