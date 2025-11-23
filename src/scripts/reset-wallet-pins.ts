import mongoose from 'mongoose';
import { env } from '../core/config/env';
import { User } from '../user/models/User.model';
import logger from '../core/utils/logger';

const run = async () => {
  try {
    // A simple confirmation prompt to prevent accidental runs
    const confirm = process.argv[2];
    if (confirm !== '--confirm') {
      logger.warn('This operation will RESET the wallet PIN for ALL users.');
      logger.warn('Please run the script with the --confirm flag to proceed.');
      logger.info('Usage: npm run db:reset-pins -- --confirm');
      process.exit(0);
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected.');

    logger.info('Resetting wallet PINs for all users...');
    
    const result = await User.updateMany(
      { walletPin: { $exists: true } }, // Only update users who have a pin
      { $unset: { walletPin: "" } }
    );

    logger.info(`✅ Successfully reset pins for ${result.modifiedCount} users.`);

  } catch (error: any) {
    logger.error('❌ Script failed:', error);
    console.error(error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected.');
  }
};

run();
