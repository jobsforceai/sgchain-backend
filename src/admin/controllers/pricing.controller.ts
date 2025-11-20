import { Request, Response, NextFunction } from 'express';
import * as pricingService from 'admin/services/pricing.service';

export const setPrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { priceUsd, reason } = req.body;
    const adminId = (req as any).admin.adminId;
    await pricingService.setPrice(priceUsd, adminId, reason);
    res.json({ status: 'SUCCESS' });
  } catch (error) {
    next(error);
  }
};
