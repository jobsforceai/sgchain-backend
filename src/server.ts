import 'dotenv/config';
import { createExpressApp } from 'core/loaders/express';
import { connectDB } from 'core/config/mongoose';
import { env } from 'core/config/env';
import logger from 'core/utils/logger';

const startServer = async () => {
  await connectDB();

  const app = createExpressApp();

  app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
  });
};

startServer();
