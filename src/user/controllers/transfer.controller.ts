// src/user/controllers/transfer.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as transferService from 'user/services/transfer.service';
import * as externalTransferService from 'user/services/externalTransfer.service';

export const internalTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const fromUserId = (req as any).user.userId;
    const { toEmail, toUserId, amountSgc } = req.body;

    const result = await transferService.internalTransfer({
      fromUserId,
      toEmail,
      toUserId,
      amountSgc,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTransferHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const history = await transferService.getTransferHistory(userId);
    res.json({ items: history });
  } catch (error) {
    next(error);
  }
};

export const initiateExternalTransfer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { amountSgc } = req.body;
    const result = await externalTransferService.createExternalTransfer(userId, amountSgc);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getExternalTransferHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const items = await externalTransferService.getMyExternalTransfers(userId);
    res.json({ items });
  } catch (error) {
    next(error);
  }
};
