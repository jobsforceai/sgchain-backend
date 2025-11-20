import { Request, Response, NextFunction } from 'express';
import * as pricingService from 'admin/services/pricing.service';
import { Config } from 'admin/models/Config.model';

export const getSgcPrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const price = await pricingService.getCurrentPrice();
    const priceConfig = await Config.findOne({ key: 'SGC_OFFICIAL_PRICE_USD' });
    res.json({
      symbol: 'SGC',
      priceUsd: price,
      lastUpdatedAt: priceConfig ? priceConfig.updatedAt : null,
    });
  } catch (error) {
    next(error);
  }
};
