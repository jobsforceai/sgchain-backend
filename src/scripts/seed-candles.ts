import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../core/config/mongoose';
import { Candle } from '../market/models/Candle.model';
import logger from '../core/utils/logger';

const seedCandles = async () => {
  await connectDB();

  logger.info('Seeding SGC candles...');

  const symbol = 'sgc';
  const resolution = '1';
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  // Clear existing
  await Candle.deleteMany({ symbol, resolution });

  const candles = [];
  let price = 100; // Starting price

  // Generate a candle for every minute for the last 24 hours
  for (let time = oneDayAgo; time <= now; time += 60) {
    // Random walk price
    const change = (Math.random() - 0.5) * 0.5; // +/- 0.25 change
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.1;
    const low = Math.min(open, close) - Math.random() * 0.1;
    const volume = Math.floor(Math.random() * 1000);

    candles.push({
      symbol,
      resolution,
      time: Math.floor(time / 60) * 60, // Align to minute
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  await Candle.insertMany(candles);
  logger.info(`Successfully seeded ${candles.length} candles.`);

  await mongoose.disconnect();
};

seedCandles().catch((err) => {
  logger.error('Error seeding candles:', err);
  process.exit(1);
});
