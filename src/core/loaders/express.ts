import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from 'core/middlewares/errorHandler';
import { router as apiRoutes } from 'routes';

export const createExpressApp = () => {
  const app = express();

  app.use(cors());
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased limit for development/testing
  });
  app.use(limiter);

  app.use(apiRoutes);

  app.use(errorHandler);

  return app;
};
