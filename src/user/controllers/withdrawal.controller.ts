// src/user/controllers/withdrawal.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as withdrawalService from 'user/services/withdrawal.service';

export const requestWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const result = await withdrawalService.requestWithdrawal(userId, req.body);
    res.status(202).json(result); // 202 Accepted
  } catch (error) {
    next(error);
  }
};

export const getWithdrawalHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const history = await withdrawalService.getWithdrawalHistory(userId);
    res.json({ items: history });
  } catch (error) {
    next(error);
  }
};
