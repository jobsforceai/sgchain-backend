import { Request, Response, NextFunction } from 'express';
import * as authService from 'user/services/auth.service';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const requestOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await authService.requestOtp(req.body.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.loginUser(email, otp);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
