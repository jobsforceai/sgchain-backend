import 'dotenv/config';
import { createExpressApp } from 'core/loaders/express';
import { connectDB } from 'core/config/mongoose';
import { env } from 'core/config/env';
import logger from 'core/utils/logger';
import { createServer } from 'http';
import { initializeWebSocket } from 'websocket/websocket.service';

const startServer = async () => {
  await connectDB();

  const app = createExpressApp();
  const httpServer = createServer(app);

  // Initialize Socket.io attached to the same HTTP server
  initializeWebSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
    logger.info(`WebSocket (Socket.io) is ready on port ${env.PORT}`);
  });
};

startServer();
