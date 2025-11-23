import { Request, Response, NextFunction } from 'express';
import * as swapService from 'swap/services/swap.service';

export const executeSwap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const result = await swapService.executeSwap(userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getQuote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenIn, tokenOut, amountIn } = req.query;
    const result = await swapService.getQuote({
      tokenIn: tokenIn as string,
      tokenOut: tokenOut as string,
      amountIn: amountIn as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
