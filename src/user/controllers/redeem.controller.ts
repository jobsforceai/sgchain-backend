// src/user/controllers/redeem.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as redeemService from 'user/services/redeem.service';

export const redeemTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { transferCode } = req.body;

    const result = await redeemService.redeemSagenexTransfer(userId, transferCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
