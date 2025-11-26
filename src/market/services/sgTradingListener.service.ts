import io from "socket.io-client";
import { env } from "core/config/env";
import logger from "core/utils/logger";
import * as marketService from "market/services/market.service";

let socket: any = null;
const SYMBOL = "sgc"; // The symbol we are interested in

export const connectToSgTrading = () => {
  const wsUrl = env.SGTRADING_WS_URL;
  logger.info(`Connecting to SGTrading WebSocket at ${wsUrl}...`);

  socket = io(wsUrl, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    logger.info("✅ Connected to SGTrading WebSocket.");
    
    // Subscribe to SGC market data
    socket?.emit("market:subscribe", SYMBOL);
    logger.info(`Subscribed to ${SYMBOL} updates from SGTrading.`);
  });

  socket.on("market:tick", async (data: any) => {
    try {
      if (data && data.symbol === SYMBOL && typeof data.last === 'number') {
        // We received a new price from the source of truth (SGTrading)
        // We process it internally: 
        // 1. Update our local DB (for history)
        // 2. Broadcast to our own clients
        await marketService.processPriceUpdate(SYMBOL, data.last);
        // Note: processPriceUpdate handles the broadcasting to OUR clients.
      }
    } catch (err) {
      logger.error("Error processing SGTrading market tick:", err);
    }
  });

  socket.on("disconnect", (reason: any) => { // reason type from socket.io-client can be string or DisconnectReason
    logger.warn(`❌ Disconnected from SGTrading WebSocket: ${reason}`);
  });

  socket.on("connect_error", (err: Error) => {
    logger.error("SGTrading WebSocket Connection Error:", err.message);
  });
};
