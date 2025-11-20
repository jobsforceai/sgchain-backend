// src/user/controllers/buy.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as buyService from 'user/services/buy.service';

export const getBankAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accounts = buyService.getBankAccounts();
    res.json({ regions: accounts });
  } catch (error) {
    next(error);
  }
};

export const initiateBuyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const result = await buyService.initiateBuyRequest(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyBuyRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const status = req.query.status as string | undefined;
    const requests = await buyService.getUserBuyRequests(userId, status);
    res.json({ items: requests });
  } catch (error) {
    next(error);
  }
};

export const buySgcWithBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { sgcAmount } = req.body;
    const result = await buyService.buySgcWithBalance(userId, sgcAmount);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
