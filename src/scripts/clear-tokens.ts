import mongoose from 'mongoose';
import { env } from '../../src/core/config/env';
import { TokenLaunch } from '../../src/token/models/TokenLaunch.model';
import logger from '../../src/core/utils/logger';

const run = async () => {
  try {
    // A simple confirmation prompt to prevent accidental runs
    const confirm = process.argv[2];
    if (confirm !== '--confirm') {
      logger.warn('This is a destructive operation. It will delete all token launch records.');
      logger.warn('Please run the script with the --confirm flag to proceed.');
      logger.info('Usage: npm run db:clear-tokens -- --confirm');
      process.exit(0);
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connected.');

    logger.info('Deleting all TokenLaunch entries...');
    const result = await TokenLaunch.deleteMany({});
    logger.info(`✅ Deleted ${result.deletedCount} TokenLaunch entries.`);

    logger.info('Database has been successfully cleared of token launch data.');

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
