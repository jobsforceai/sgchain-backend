import { Candle } from 'market/models/Candle.model';
import { broadcastMarketTick } from 'websocket/websocket.service';
import logger from 'core/utils/logger';

export const getCandles = async (
  symbol: string,
  resolution: string,
  from: number,
  to: number
) => {
  // Ensure 'from' and 'to' are numbers
  const fromTs = Number(from);
  const toTs = Number(to);

  logger.info(`[MarketService] Querying DB: symbol=${symbol}, res=${resolution}, time >= ${fromTs} AND time <= ${toTs}`);

  const candles = await Candle.find({
    symbol: symbol.toLowerCase(),
    resolution,
    time: { $gte: fromTs, $lte: toTs },
  })
    .sort({ time: 1 })
    .lean();

  logger.info(`[MarketService] Found ${candles.length} candles in DB.`);
  return candles;
};

/**
 * Processes a new price update.
 * 1. Broadcasts the tick via WebSocket.
 * 2. Updates the current 1-minute candle in the database.
 */
export const processPriceUpdate = async (symbol: string, price: number) => {
  // Use whole number for simplicity as requested
  const flooredPrice = Math.floor(price);
  
  const ts = Date.now();
  const lowerSymbol = symbol.toLowerCase();

  // 1. Broadcast Tick
  broadcastMarketTick(lowerSymbol, flooredPrice, ts);

  // 2. Update Candle (Resolution: 1 minute)
  // Calculate the start of the current minute (Unix timestamp in seconds)
  const currentMinuteTime = Math.floor(ts / 1000 / 60) * 60;

  try {
    // Try to find an existing candle for this minute
    const candle = await Candle.findOne({
      symbol: lowerSymbol,
      resolution: '1',
      time: currentMinuteTime,
    });

    if (candle) {
      // Update existing candle
      candle.close = flooredPrice;
      if (flooredPrice > candle.high) candle.high = flooredPrice;
      if (flooredPrice < candle.low) candle.low = flooredPrice;
      // We don't have real volume yet, so we can increment by 1 to show activity, or 0
      candle.volume += 1; 
      await candle.save();
    } else {
      // Create new candle
      await Candle.create({
        symbol: lowerSymbol,
        resolution: '1',
        time: currentMinuteTime,
        open: flooredPrice,
        high: flooredPrice,
        low: flooredPrice,
        close: flooredPrice,
        volume: 1,
      });
    }
  } catch (error) {
    logger.error('Error updating market candle:', error);
  }
};
