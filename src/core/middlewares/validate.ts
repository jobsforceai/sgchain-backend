import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate =
  (schema: z.ZodObject<any, any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.issues,
        });
      }
      next(error);
    }
  };
