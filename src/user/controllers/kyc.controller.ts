// src/user/controllers/kyc.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as kycService from 'user/services/kyc.service';

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const result = await kycService.uploadKycDocument(userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const { region } = req.body;
    const result = await kycService.submitKycApplication(userId, region);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
};

export const getKycStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user.userId;
    const statuses = await kycService.getKycStatus(userId);
    res.json({ items: statuses });
  } catch (error) {
    next(error);
  }
};