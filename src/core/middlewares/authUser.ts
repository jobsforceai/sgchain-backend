import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from 'core/config/env';

export const authUser = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET_USER);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
