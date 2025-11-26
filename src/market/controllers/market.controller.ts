import { Request, Response, NextFunction } from 'express';
import * as marketService from 'market/services/market.service';
import logger from 'core/utils/logger';

export const getCandles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbol, resolution, from, to } = req.query;

    logger.info(`[MarketController] Request params: symbol=${symbol}, resolution=${resolution}, from=${from}, to=${to}`);

    if (!symbol || !resolution || !from || !to) {
      logger.warn('[MarketController] Missing required parameters');
      res.status(400).json({ message: 'Missing required parameters: symbol, resolution, from, to' });
      return;
    }

    const candles = await marketService.getCandles(
      symbol as string,
      resolution as string,
      Number(from),
      Number(to)
    );

    logger.info(`[MarketController] Returning ${candles.length} candles`);
    res.json(candles);
  } catch (error) {
    logger.error('[MarketController] Error fetching candles:', error);
    next(error);
  }
};
