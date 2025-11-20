// src/core/middlewares/authWalletAccess.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface WalletJwtPayload extends jwt.JwtPayload {
  userId: string;
  scope: string;
}

export const authWalletAccess = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET_USER) as WalletJwtPayload;
    
    // Crucially, check for the specific 'wallet' scope
    if (decoded.scope !== 'wallet') {
      return res.status(403).json({ message: 'Forbidden: Insufficient scope' });
    }

    (req as any).user = { userId: decoded.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
