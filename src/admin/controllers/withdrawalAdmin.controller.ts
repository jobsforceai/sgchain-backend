// src/admin/controllers/withdrawalAdmin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as withdrawalAdminService from 'admin/services/withdrawalAdmin.service';

export const approveWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = await withdrawalAdminService.approveWithdrawal(id, adminNotes);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectWithdrawal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = await withdrawalAdminService.rejectWithdrawal(id, adminNotes);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getWithdrawalRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = req.query.status as string | undefined;
    const requests = await withdrawalAdminService.getWithdrawalRequests(status);
    res.json({ items: requests });
  } catch (error) {
    next(error);
  }
};
