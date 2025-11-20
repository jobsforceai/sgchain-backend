// src/scripts/migrations/fix-partially-migrated-deposits.ts
import mongoose from 'mongoose';
import { env } from '../../core/config/env';
import { LedgerEntry } from '../../user/models/LedgerEntry.model';
import { Wallet } from '../../user/models/Wallet.model';
import logger from '../../core/utils/logger';

const runFix = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB for migration fix.');

    // Find the record that was incorrectly migrated
    const partiallyMigratedEntries = await LedgerEntry.find({
      type: 'DEPOSIT_FROM_SAGENEX_USD',
      'meta.migration_corrected': true,
      'meta.migration_fix_applied': { $ne: true } // Ensure this fix is only applied once
    });

    if (partiallyMigratedEntries.length === 0) {
      logger.info('No partially migrated Sagenex deposits found to fix.');
      return;
    }

    logger.info(`Found ${partiallyMigratedEntries.length} partially migrated entries to fix.`);

    for (const entry of partiallyMigratedEntries) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const wallet = await Wallet.findOne({ userId: entry.userId }).session(session);
          if (!wallet) {
            throw new Error(`Wallet not found for userId: ${entry.userId}`);
          }

          const usdAmount = entry.amount; // This should now be the correct USD amount

          logger.info(`Fixing wallet for user ${entry.userId}:`);
          logger.info(`  - Current USD Balance: ${wallet.fiatBalanceUsd}`);
          logger.info(`  - Applying missing USD credit of: ${usdAmount}`);

          // Apply the missing USD credit
          wallet.fiatBalanceUsd += usdAmount;
          
          await wallet.save({ session });
          logger.info(`  - New USD Balance: ${wallet.fiatBalanceUsd}`);

          // Mark this entry as fully fixed
          entry.meta.migration_fix_applied = true;
          await entry.save({ session });

          logger.info(`Successfully fixed entry ${entry._id} for user ${entry.userId}.`);
        });
      } catch (error) {
        logger.error(`Failed to fix entry ${entry._id}. Aborting transaction.`, { error });
      } finally {
        session.endSession();
      }
    }

    logger.info('✅ Migration fix script finished.');

  } catch (error) {
    logger.error('❌ An error occurred during the migration fix process:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
};

runFix();
