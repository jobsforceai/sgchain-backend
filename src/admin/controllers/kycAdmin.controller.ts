// src/admin/controllers/kycAdmin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as kycAdminService from 'admin/services/kycAdmin.service';

export const getKycRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = req.query.status as string | undefined;
    const requests = await kycAdminService.getKycRequests(status);
    res.json({ items: requests });
  } catch (error) {
    next(error);
  }
};

export const getKycRequestDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const details = await kycAdminService.getKycRequestDetails(id);
    res.json(details);
  } catch (error) {
    next(error);
  }
};

export const approveKycRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = await kycAdminService.approveKycRequest(id, adminNotes);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const rejectKycRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    const result = await kycAdminService.rejectKycRequest(id, rejectionReason, adminNotes);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
