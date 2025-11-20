// src/user/controllers/ledger.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as ledgerService from 'user/services/ledger.service';

export const getHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const history = await ledgerService.getTransactionHistory(userId);
    res.json({ items: history });
  } catch (error) {
    next(error);
  }
};
