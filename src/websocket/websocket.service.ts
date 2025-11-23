import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ethers } from 'ethers';
import { env } from 'core/config/env';
import logger from 'core/utils/logger';
import { getProvider } from 'core/utils/provider';

let io: SocketIOServer;

export const initializeWebSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins for now, restrict in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket Server Initialized (Socket.io)');
  
  // Start listening to the blockchain
  startBlockchainListener();
};

const startBlockchainListener = async () => {
  if (!env.SGCHAIN_RPC_URL) {
    logger.warn('SGCHAIN_RPC_URL not set. WebSocket will not broadcast live transactions.');
    return;
  }

  try {
    const provider = getProvider();
    logger.info(`WebSocket Service listening to blockchain via Shared Provider`);

    // Listen for new blocks
    provider.on('block', async (blockNumber) => {
      try {
        const block = await provider.getBlock(blockNumber, true); // true = include transactions
        
        if (block && block.prefetchedTransactions && block.prefetchedTransactions.length > 0) {
            const transactions = block.prefetchedTransactions.map((tx) => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                timestamp: new Date().toISOString(), // Block timestamp isn't always immediately available in the event, using current time for live feed
            }));

            // Broadcast to all connected clients
            io.emit('NEW_TRANSACTIONS', transactions);
            logger.info(`Broadcasted ${transactions.length} new transactions from block ${blockNumber}`);
        }
      } catch (err) {
        logger.error(`Error processing block ${blockNumber} for WebSocket:`, err);
      }
    });

  } catch (error) {
    logger.error('Failed to start blockchain listener:', error);
  }
};
