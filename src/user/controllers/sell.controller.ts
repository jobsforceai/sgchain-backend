// src/user/controllers/sell.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as sellService from 'user/services/sell.service';

export const sellSgc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { sgcAmount } = req.body;
    const result = await sellService.sellSgc(userId, sgcAmount);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
