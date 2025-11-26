import io from "socket.io-client";
import logger from "../core/utils/logger";

const WEBSOCKET_URL = "http://localhost:3000"; // Replace with your actual backend URL
const SYMBOL = "sgc";

logger.info(`Attempting to connect to WebSocket at ${WEBSOCKET_URL}`);
const socket = io(WEBSOCKET_URL);

socket.on("connect", () => {
  logger.info("Connected to Market WebSocket. Subscribing to 'sgc'...");
  socket.emit("market:subscribe", SYMBOL);
});

socket.on("market:tick", (data: { symbol: string; last: number; ts: number }) => {
  if (data.symbol === SYMBOL) {
    logger.info(`[LIVE PRICE] Symbol: ${data.symbol}, Last: ${data.last}, Timestamp: ${new Date(data.ts).toISOString()}`);
  }
});

socket.on("disconnect", () => {
  logger.info("Disconnected from Market WebSocket.");
});

socket.on("connect_error", (err: Error) => {
  logger.error("WebSocket connection error:", err.message);
});

socket.on("error", (err: Error) => {
  logger.error("WebSocket error:", err);
});

logger.info("Waiting for live market data. To trigger an update, change the SGC price in the admin panel.");
logger.info("Press Ctrl+C to exit.");