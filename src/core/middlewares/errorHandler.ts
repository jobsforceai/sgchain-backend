import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error with more context
  logger.error('Error handled by errorHandler:', { 
    error: err, 
    stack: err?.stack,
    message: err?.message 
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.issues,
    });
  }

  const statusCode = err?.statusCode || 500;
  const message = err?.message || 'An internal server error occurred';

  res.status(statusCode).json({
    message,
  });
};
