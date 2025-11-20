import { Request, Response, NextFunction } from 'express';
import * as walletService from 'user/services/wallet.service';
import * as pricingService from 'admin/services/pricing.service';
import { User } from 'user/models/User.model';

export const getMyWallet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    
    const [user, wallet] = await Promise.all([
      User.findById(userId).select('walletPin').lean(),
      walletService.getOrCreateWallet(userId)
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sgcPrice = await pricingService.getCurrentPrice();
    const sgcValueUsd = wallet.sgcBalance * sgcPrice;
    const totalAccountValueUsd = sgcValueUsd + (wallet.fiatBalanceUsd || 0);

    res.json({
      userId,
      walletId: wallet._id,
      sgcBalance: wallet.sgcBalance,
      fiatBalanceUsd: wallet.fiatBalanceUsd || 0,
      sgcOfficialPriceUsd: sgcPrice,
      sgcValueUsd,
      totalAccountValueUsd,
      status: wallet.status,
      isPinSet: !!user.walletPin,
    });
  } catch (error) {
    next(error);
  }
};

export const setPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { pin } = req.body;
    const result = await walletService.setWalletPin(userId, pin);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyPin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { pin } = req.body;
    const result = await walletService.verifyWalletPin(userId, pin);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const details = await walletService.getWalletDetails(userId);
    res.json(details);
  } catch (error) {
    next(error);
  }
};
