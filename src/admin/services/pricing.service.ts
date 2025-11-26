import { Config } from 'admin/models/Config.model';
import { AdminAuditLog } from 'admin/models/AdminAuditLog.model';
import * as marketService from 'market/services/market.service';
import { Candle } from 'market/models/Candle.model';

const SGC_PRICE_KEY = 'SGC_OFFICIAL_PRICE_USD';

export const getCurrentPrice = async () => {
  // Priority: Get latest market price from candles (synced from SGTrading)
  const latestCandle = await Candle.findOne({ symbol: 'sgc', resolution: '1' })
    .sort({ time: -1 });

  if (latestCandle) {
    return latestCandle.close; // This is already floored by market.service
  }

  // Fallback: Use config if no market data exists yet
  const priceConfig = await Config.findOne({ key: SGC_PRICE_KEY });
  return priceConfig ? Math.floor(parseFloat(priceConfig.value)) : 0;
};

export const setPrice = async (
  newPrice: number,
  adminId: string,
  reason: string
) => {
  await Config.findOneAndUpdate(
    { key: SGC_PRICE_KEY },
    { value: newPrice.toString() },
    { upsert: true }
  );

  // Update Market Data (Candles + WebSocket Tick)
  await marketService.processPriceUpdate('sgc', newPrice);

  await AdminAuditLog.create({
    adminId,
    actionType: 'SET_PRICE',
    payload: { newPrice, reason },
  });
};
