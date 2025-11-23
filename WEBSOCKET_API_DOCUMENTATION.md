# SGChain Live Transaction Feed - WebSocket API Documentation

## 1. Overview

This document explains how to connect to the SGChain backend's live transaction feed using **Socket.io**. This feed broadcasts new transactions in real-time as they are included in blocks on the SGChain network.

**The WebSocket service runs on the same URL/Port as the main REST API.**

## 2. Connecting (Frontend Guide)

We use `socket.io-client`.

### A. Install Client Library
```bash
npm install socket.io-client
```

### B. Connection Code (React/JS Example)

```javascript
import { io } from "socket.io-client";

// Use the same Base URL as your API (e.g., http://localhost:3000 or https://api.sgchain.com)
const SOCKET_URL = "http://localhost:3000"; 

const socket = io(SOCKET_URL);

socket.on("connect", () => {
  console.log("Connected to SGChain Live Feed:", socket.id);
});

socket.on("NEW_TRANSACTIONS", (transactions) => {
  // 'transactions' is an Array of transaction objects
  console.log("New Transactions Received:", transactions);
  
  // Logic to update your UI list (e.g., setTransactions(prev => [...transactions, ...prev]))
});

socket.on("disconnect", () => {
  console.log("Disconnected from feed");
});
```

## 3. Data Structure

### Event Name: `NEW_TRANSACTIONS`

The payload is an **Array** of objects. Even if there is only 1 transaction, it will be in an array.

**Payload Example:**
```json
[
  {
    "hash": "0x123...abc",
    "from": "0xUserWallet...",
    "to": "0xTarget...",         // null if it's a contract creation
    "value": "10.5",             // SGC Amount (String)
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
]
```

## 4. Backend Implementation Details

*   **Technology**: `socket.io` (v4)
*   **Port**: Same as Express Server (`PORT` env var).
*   **Trigger**: The backend listens to the SGChain RPC (`SGCHAIN_RPC_URL`). When the provider emits a `"block"` event, the backend fetches the block's transactions and broadcasts them.

**Note:** If `SGCHAIN_RPC_URL` is not configured in the backend `.env`, the socket will connect but will never send events.