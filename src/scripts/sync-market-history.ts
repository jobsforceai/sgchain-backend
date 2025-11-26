import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../core/config/mongoose';
import { Candle } from '../market/models/Candle.model';
import * as sgTradingClient from '../core/clients/sgTradingClient';
import logger from '../core/utils/logger';

const syncHistory = async () => {
  await connectDB();

  logger.info('Starting Market Data Sync from SGTrading...');

  const symbol = 'sgc';
  const resolution = '1';
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60; // Sync last 24 hours

  logger.info(`Fetching candles for ${symbol} from ${oneDayAgo} to ${now}...`);

  try {
    // 1. Fetch from source of truth (SGTrading)
    const candles = await sgTradingClient.fetchCandles(symbol, resolution, oneDayAgo, now);
    
    if (candles.length === 0) {
      logger.warn('No candles returned from SGTrading. Is the upstream service running and populated?');
    } else {
      logger.info(`Received ${candles.length} candles from SGTrading.`);

      // 2. Clear local "fake" or outdated data
      const deleteResult = await Candle.deleteMany({ 
        symbol, 
        resolution, 
        time: { $gte: oneDayAgo, $lte: now } 
      });
      logger.info(`Deleted ${deleteResult.deletedCount} old local candles.`);

      // 3. Insert real data
      // Transform if necessary, but interfaces match
      const candlesToInsert = candles.map(c => ({
        symbol,
        resolution,
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      }));

      await Candle.insertMany(candlesToInsert);
      logger.info(`Successfully synchronized ${candlesToInsert.length} candles.`);
    }

  } catch (error) {
    logger.error('Failed to sync market history:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Sync complete. DB disconnected.');
  }
};

syncHistory().catch((err) => {
  logger.error('Fatal error in sync script:', err);
  process.exit(1);
});
