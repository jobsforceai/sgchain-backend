# SGChain SGC Market Data Integration Guide

This document explains the architecture and integration steps for displaying SGC market data (graph and live price) on the SGChain frontend.

**Important:** SGChain now acts as a **Client** to the SGTrading backend for market data. SGTrading is the "Source of Truth."

## 1. Architecture Overview

1.  **Source of Truth**: SGTrading Backend. It generates the synthetic price movements (Mode A: Admin Controlled, Mode B: Stable Fallback).
2.  **Sync (Historical)**: SGChain pulls historical candles from SGTrading to populate its local database for the graph.
3.  **Sync (Live)**: SGChain connects to SGTrading's WebSocket to receive real-time price ticks (`market:tick`).
4.  **Frontend**: Connects to **SGChain Backend** (not SGTrading directly) to get the graph and live updates. This keeps the frontend decoupled from the trading engine.

## 2. API Reference (For Frontend Team)

The frontend implementation remains the same, but the data source behind the scenes has changed.

### A. Historical Data (Chart)
**Endpoint:** `GET /api/v1/market/candles`

*   **Query Params:**
    *   `symbol`: `sgc`
    *   `resolution`: `1`
    *   `from`: Unix timestamp (seconds)
    *   `to`: Unix timestamp (seconds)

### B. Live Data (WebSocket)
**Connection:** Socket.IO to SGChain Backend.

*   **Emit:** `market:subscribe` -> `"sgc"`
*   **Listen:** `market:tick`
    ```json
    {
      "symbol": "sgc",
      "last": 100.45,
      "ts": 1716796805000
    }
    ```

## 3. Backend Setup & Maintenance (For Backend/DevOps Team)

To ensure the data on SGChain is accurate, you must perform an initial sync and ensure the live listener is connected.

### Step 1: Configuration
Ensure your `.env` file has the correct URL for the SGTrading backend:

```bash
# Points to the running SGTrading instance
SGTRADING_API_URL=http://localhost:8080/api/v1
SGTRADING_WS_URL=http://localhost:8080
```

### Step 2: Initial Sync (Fixing the Graph)
If the graph is empty, flat, or mismatched from the live price, run the sync script. This fetches the last 24 hours of real history from SGTrading and overwrites the local data.

```bash
npm run sync:candles
```

*Run this command whenever you deploy to a new environment or if the data becomes desynchronized.*

### Step 3: Verify Live Updates
The backend automatically connects to SGTrading on startup. You can verify it's working by checking the logs for:
`✅ Connected to SGTrading WebSocket.`

Or run the test script:
```bash
npm run test:market-ws
```

## 4. Troubleshooting

*   **Graph is empty?** Run `npm run sync:candles`.
*   **Live price is stuck?** Check backend logs for `Disconnected from SGTrading WebSocket`. Ensure `SGTRADING_WS_URL` is correct and SGTrading is running.
*   **404 Error during sync?** Verify `SGTRADING_API_URL`. It should include the `/api/v1` prefix if that's how SGTrading is configured.