// src/admin/controllers/buy.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as buyAdminService from 'admin/services/buyAdmin.service';

export const listBuyRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = req.query.status as string | undefined;
    const requests = await buyAdminService.listBuyRequests(status);
    res.json({ items: requests });
  } catch (error) {
    next(error);
  }
};

export const approveBuyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = (req as any).admin.adminId;
    const requestId = req.params.id;
    const { adminComment } = req.body;
    const result = await buyAdminService.approveBuyRequest({
      requestId,
      adminId,
      adminComment,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectBuyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminId = (req as any).admin.adminId;
    const requestId = req.params.id;
    const { reason } = req.body;
    const result = await buyAdminService.rejectBuyRequest({
      requestId,
      adminId,
      reason,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
