# Frontend Integration Guide: SGChain Real-time Blockchain Events

This guide details how to integrate your frontend with the SGChain backend's Socket.IO server to receive real-time blockchain updates (new blocks and pending transactions).

Your backend is now acting as an intermediary, subscribing to the native SGChain node's WebSocket and relaying the events to your frontend via Socket.IO. This provides a robust and efficient way to display live blockchain activity.

## Backend Socket.IO Server Details

*   **Endpoint:** Your main backend URL (e.g., `http://localhost:3000` for development, or your production API URL).
*   **Port:** The same port as your main backend API (e.g., `3000`).

## Events You Will Receive

Your frontend will receive the following events:

1.  `NEW_BLOCK`
2.  `NEW_TRANSACTION`

---

## 1. Connecting to the Socket.IO Server

Use the `socket.io-client` library (or similar) to establish a connection.

### Installation

```bash
npm install socket.io-client
# OR
yarn add socket.io-client
```

### Connection Example (JavaScript/TypeScript)

```typescript
import { io, Socket } from 'socket.io-client';

// Replace with your backend's URL
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000'; 

let socket: Socket;

export const connectWebSocket = () => {
  if (socket && socket.connected) {
    console.log('Already connected to WebSocket.');
    return;
  }

  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'], // Prioritize WebSocket
    // Add any necessary authentication headers if your Socket.IO requires it
    // auth: { token: 'YOUR_AUTH_TOKEN' }
  });

  socket.on('connect', () => {
    console.log('✅ Connected to SGChain Backend WebSocket (Socket.IO).');
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnected from SGChain Backend WebSocket: ${reason}`);
    // Implement reconnection logic if needed
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  // Handle specific events below
  // setupEventListeners();
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};

export const getSocket = () => socket;

// Call connectWebSocket() when your app initializes, e.g., in App.tsx useEffect or similar
// Ensure you disconnect on unmount to prevent memory leaks.
```

---

## 2. Handling `NEW_BLOCK` Events

This event provides details of new blocks as they are mined (including historical blocks upon initial subscription).

### Event Data Structure

```typescript
interface BlockHeader {
  difficulty: string; // Hex
  extraData: string; // Hex
  gasLimit: string; // Hex
  gasUsed: string; // Hex
  hash: string; // Block hash (Hex)
  logsBloom: string; // Hex
  miner: string; // Address
  mixHash: string; // Hex
  nonce: string; // Hex
  number: string; // Block height (Hex)
  parentHash: string; // Hex
  receiptsRoot: string; // Hex
  sha3Uncles: string; // Hex
  stateRoot: string; // Hex
  timestamp: string; // Hex (Unix timestamp)
  transactionsRoot: string; // Hex
}
```

### Example Listener

```typescript
import { getSocket } from './websocket-client'; // Your WebSocket client file

const setupBlockListener = () => {
  const socket = getSocket();
  if (!socket) return;

  socket.on('NEW_BLOCK', (block: BlockHeader) => {
    console.log('Received NEW_BLOCK:', block);
    const blockNumber = parseInt(block.number, 16); // Convert hex to decimal
    const timestamp = parseInt(block.timestamp, 16) * 1000; // Convert hex to decimal ms
    console.log(`New Block: #${blockNumber} (Hash: ${block.hash.substring(0, 10)}...) at ${new Date(timestamp).toLocaleString()}`);
    
    // TODO: Update your UI (e.g., latest block display, recent block list)
  });
};

// Call setupBlockListener() after connectWebSocket() and when the socket is ready
// Example: 
// connectWebSocket();
// getSocket().on('connect', setupBlockListener);
```

---

## 3. Handling `NEW_TRANSACTION` Events

This event provides the hash of new pending transactions as they enter the mempool.

### Event Data Structure

```typescript
interface NewTransactionEvent {
  hash: string; // Transaction hash (Hex)
}
```

### Example Listener

```typescript
import { getSocket } from './websocket-client'; // Your WebSocket client file

const setupTransactionListener = () => {
  const socket = getSocket();
  if (!socket) return;

  socket.on('NEW_TRANSACTION', (tx: NewTransactionEvent) => {
    console.log('Received NEW_TRANSACTION:', tx);
    console.log(`New Pending Transaction: ${tx.hash.substring(0, 10)}...`);

    // TODO: Update your UI (e.g., pending transaction list, transaction count)
  });
};

// Call setupTransactionListener() after connectWebSocket() and when the socket is ready
// Example: 
// connectWebSocket();
// getSocket().on('connect', setupTransactionListener);
```

---

## Full Example for Frontend

```typescript
// src/services/blockchain-ws.ts (or similar)
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000'; 
let socket: Socket | null = null;

interface BlockHeader {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string;
  logsBloom: string;
  miner: string;
  mixHash: string;
  nonce: string;
  number: string;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  stateRoot: string;
  timestamp: string;
  transactionsRoot: string;
}

interface NewTransactionEvent {
  hash: string;
}

export const initializeBlockchainWebSocket = (callbacks: {
  onNewBlock?: (block: BlockHeader) => void;
  onNewTransaction?: (tx: NewTransactionEvent) => void;
}) => {
  if (socket && socket.connected) {
    console.log('Blockchain WebSocket already connected.');
    return;
  }

  socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ Connected to SGChain Backend WebSocket for blockchain events.');
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnected from blockchain WebSocket: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Blockchain WebSocket connection error:', error);
  });

  if (callbacks.onNewBlock) {
    socket.on('NEW_BLOCK', callbacks.onNewBlock);
  }
  if (callbacks.onNewTransaction) {
    socket.on('NEW_TRANSACTION', callbacks.onNewTransaction);
  }
};

export const disconnectBlockchainWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// --- How to use in a React Component (Example) ---
/*
import React, { useEffect, useState } from 'react';
import { initializeBlockchainWebSocket, disconnectBlockchainWebSocket } from './services/blockchain-ws';

function Dashboard() {
  const [latestBlock, setLatestBlock] = useState<any>(null);
  const [pendingTransactions, setPendingTransactions] = useState<string[]>([]);

  useEffect(() => {
    initializeBlockchainWebSocket({
      onNewBlock: (block) => {
        console.log('UI: New Block received', block);
        setLatestBlock(block);
      },
      onNewTransaction: (tx) => {
        console.log('UI: New Transaction received', tx);
        setPendingTransactions(prev => [tx.hash, ...prev.slice(0, 9)]); // Keep last 10
      },
    });

    return () => {
      disconnectBlockchainWebSocket();
    };
  }, []);

  return (
    <div>
      <h1>Blockchain Dashboard</h1>
      {latestBlock && (
        <div>
          <h2>Latest Block: #{parseInt(latestBlock.number, 16)}</h2>
          <p>Hash: {latestBlock.hash}</p>
          <p>Timestamp: {new Date(parseInt(latestBlock.timestamp, 16) * 1000).toLocaleString()}</p>
        </div>
      )}
      <h3>Recent Pending Transactions:</h3>
      <ul>
        {pendingTransactions.map((hash, index) => (
          <li key={index}>{hash.substring(0, 20)}...</li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
*/

```
