import { Request, Response, NextFunction } from 'express';
import * as adminWalletService from 'admin/services/adminWallet.service';

export const getUserWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const data = await adminWalletService.getUserWalletWithLedger(userId);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const manualAdjust = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    const { currency, direction, amount, reason } = req.body;
    const adminId = (req as any).admin.adminId;
    await adminWalletService.manualAdjust(userId, {
      currency,
      direction,
      amount,
      reason,
      adminId,
    });
    res.json({ status: 'SUCCESS' });
  } catch (error) {
    next(error);
  }
};
