// src/scripts/reset-balances-only.ts
import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import { Wallet } from '../user/models/Wallet.model';
import { LedgerEntry } from '../user/models/LedgerEntry.model';
import logger from '../core/utils/logger';
import { ethers } from 'ethers';
import { encrypt } from '../core/utils/crypto';

const run = async () => {
  try {
    const confirm = process.argv[2];
    // if (confirm != '--confirm') {
    //   logger.warn('This script will RESET ALL WALLET BALANCES to 0 and generate NEW ON-CHAIN WALLETS for existing users.');
    //   logger.warn('It keeps the user profile (email/password) but wipes their financial state to match a new chain.');
    //   logger.warn('Usage: npx ts-node src/scripts/reset-balances-only.ts -- --confirm');
    //   process.exit(0);
    // }

    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to MongoDB.');

    // 1. Clear Financial History
    logger.info('Deleting all LedgerEntry entries...');
    await LedgerEntry.deleteMany({});
    logger.info('✅ Ledger cleared.');

    // 2. Reset Wallets (DB Balances)
    logger.info('Resetting all DB Wallets to 0...');
    await Wallet.updateMany({}, {
        $set: {
            sgcBalance: 0,
            fiatBalanceUsd: 0,
            status: 'ACTIVE'
        }
    });
    logger.info('✅ Wallets reset to 0.');

    // 3. Cycle On-Chain Addresses (Optional but Recommended)
    // Since the chain is new, the old private keys are valid but empty.
    // Generating new ones ensures a truly fresh start and avoids nonce issues if the user had old txs.
    logger.info('Cycling on-chain addresses for all users...');
    
    const users = await User.find({});
    let count = 0;

    for (const user of users) {
        // Create new random wallet
        const newWallet = ethers.Wallet.createRandom();
        const encryptedKey = encrypt(newWallet.privateKey);

        user.onchainAddress = newWallet.address;
        user.encryptedPrivateKey = encryptedKey;
        user.walletCreatedAt = new Date();
        // Clear any old PIN or OTP data if desired, but not strictly necessary for chain reset
        
        await user.save();
        count++;
        if (count % 50 === 0) logger.info(`Processed ${count} users...`);
    }

    logger.info(`✅ Successfully assigned NEW on-chain addresses to ${count} users.`);
    logger.info('Database is now synced for a fresh chain deployment.');

  } catch (error: any) {
    logger.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

run();
