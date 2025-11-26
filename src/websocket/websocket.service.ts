import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { env } from 'core/config/env';
import logger from 'core/utils/logger';

let io: SocketIOServer;
let sgchainWs: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export const initializeWebSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins for now, restrict in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`New Client WebSocket connection: ${socket.id}`);

    socket.on('market:subscribe', (symbol: string) => {
        logger.info(`Client ${socket.id} subscribed to market: ${symbol}`);
        socket.join(`market:${symbol.toLowerCase()}`);
    });

    socket.on('market:unsubscribe', (symbol: string) => {
        logger.info(`Client ${socket.id} unsubscribed from market: ${symbol}`);
        socket.leave(`market:${symbol.toLowerCase()}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client WebSocket disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket Server Initialized (Socket.io)');
  
  // Connect to SGChain Node WebSocket
  connectToSgchain();
};

export const broadcastMarketTick = (symbol: string, price: number, ts: number) => {
    if (!io) return;
    const lowerSymbol = symbol.toLowerCase();
    io.to(`market:${lowerSymbol}`).emit('market:tick', {
        symbol: lowerSymbol,
        last: price,
        ts,
    });
};

const connectToSgchain = () => {
  const wsUrl = env.SGCHAIN_WS_URL;
  if (!wsUrl) {
    logger.warn('SGCHAIN_WS_URL not set. Backend will not receive live chain data.');
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  logger.info(`Connecting to SGChain Node WebSocket at ${wsUrl}...`);
  sgchainWs = new WebSocket(wsUrl);

  sgchainWs.on('open', () => {
    logger.info('✅ Connected to SGChain Node WebSocket.');

    // 1. Subscribe to new blocks (newHeads)
    const newHeadsSubscription = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: ['newHeads'],
    };
    sgchainWs?.send(JSON.stringify(newHeadsSubscription));

    // 2. Subscribe to new pending transactions
    const newTxsSubscription = {
      jsonrpc: '2.0',
      id: 2,
      method: 'eth_subscribe',
      params: ['newPendingTransactions'],
    };
    sgchainWs?.send(JSON.stringify(newTxsSubscription));
  });

  sgchainWs.on('message', (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());

      // Log subscription IDs for debugging
      if (message.id === 1) {
        logger.debug(`Subscribed to newHeads (ID: ${message.result})`);
      } else if (message.id === 2) {
        logger.debug(`Subscribed to newPendingTransactions (ID: ${message.result})`);
      }

      // Handle Data Notifications
      if (message.method === 'eth_subscription') {
        const eventData = message.params.result;

        // Determine event type based on data structure
        // 'newHeads' returns a block header object (has 'parentHash', 'number')
        // 'newPendingTransactions' returns a tx hash string
        
        if (typeof eventData === 'object' && eventData.parentHash) {
          // It's a Block Header
          const blockNumber = parseInt(eventData.number, 16);
          logger.info(`Received NEW_BLOCK #${blockNumber} from chain. Broadcasting to clients...`);
          io.emit('NEW_BLOCK', eventData);
        } else if (typeof eventData === 'string') {
          // It's a Transaction Hash
          logger.debug(`Received NEW_TRANSACTION ${eventData.substring(0, 10)}...`);
          io.emit('NEW_TRANSACTION', { hash: eventData });
        }
      }
    } catch (err) {
      logger.error('Error parsing SGChain WebSocket message:', err);
    }
  });

  sgchainWs.on('error', (err) => {
    logger.error('SGChain Node WebSocket Error:', err);
  });

  sgchainWs.on('close', () => {
    logger.warn('🔌 Disconnected from SGChain Node WebSocket. Reconnecting in 5s...');
    sgchainWs = null;
    reconnectTimer = setTimeout(connectToSgchain, 5000);
  });
};