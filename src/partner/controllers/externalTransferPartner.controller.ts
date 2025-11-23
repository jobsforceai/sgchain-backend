import { Request, Response, NextFunction } from 'express';
import * as externalTransferService from 'user/services/externalTransfer.service';
import { env } from 'core/config/env';
import logger from 'core/utils/logger';

export const redeemCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    
    // Simple shared secret auth
    if (!internalSecret || internalSecret !== env.SGTRADING_INTERNAL_SECRET) {
        logger.warn('Unauthorized attempt to access SGTrading redeem endpoint');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ message: 'Code is required' });
    }

    const result = await externalTransferService.redeemExternalTransfer(code);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
