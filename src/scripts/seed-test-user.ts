// src/scripts/seed-test-user.ts
import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import { Wallet } from '../user/models/Wallet.model';
import logger from '../core/utils/logger';

const SAGENEX_USER_ID = 'test-user-123'; // <-- You can change this to match your Sagenex user
const INITIAL_SGC_BALANCE = 10;

const seed = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected.');

    // 1. Find or create the user
    let user = await User.findOne({ sagenexUserId: SAGENEX_USER_ID });
    if (user) {
      logger.info(`User with sagenexUserId "${SAGENEX_USER_ID}" already exists.`);
    } else {
      user = await User.create({
        sagenexUserId: SAGENEX_USER_ID,
        email: `${SAGENEX_USER_ID}@example.com`, // Add a dummy email for uniqueness
      });
      logger.info(`Created new user with sagenexUserId: "${SAGENEX_USER_ID}"`);
    }

    // 2. Find or create the wallet and set the balance
    let wallet = await Wallet.findOne({ userId: user._id });
    if (wallet) {
      wallet.sgcBalance = INITIAL_SGC_BALANCE;
      await wallet.save();
      logger.info(`Wallet found. Balance reset to ${INITIAL_SGC_BALANCE} SGC.`);
    } else {
      wallet = await Wallet.create({
        userId: user._id,
        sgcBalance: INITIAL_SGC_BALANCE,
      });
      logger.info(`Created new wallet with ${INITIAL_SGC_BALANCE} SGC.`);
    }

    logger.info('✅ Test user seeding complete!');
    logger.info(`
      - User ID: ${user._id}
      - Sagenex User ID: ${user.sagenexUserId}
      - Wallet ID: ${wallet._id}
      - SGC Balance: ${wallet.sgcBalance}
    `);

  } catch (error) {
    logger.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
};

seed();
