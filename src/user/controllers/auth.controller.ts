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
    const { email, password, otp } = req.body;
    let result;

    if (password) {
      result = await authService.loginWithPassword(email, password);
    } else if (otp) {
      result = await authService.loginWithOtp(email, otp);
    } else {
      throw new Error('Please provide either password or otp');
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};
