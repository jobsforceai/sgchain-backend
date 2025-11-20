import { Request, Response, NextFunction } from 'express';
import * as adminAuthService from 'admin/services/adminAuth.service';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    const { token, admin } = await adminAuthService.login(email, password);
    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
