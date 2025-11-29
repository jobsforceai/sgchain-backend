# SGChain Frontend Integration Guide: SGC Live Price

This document provides definitive instructions for the Frontend Team on how to integrate and display the SGC token price.

## Overview

The SGC price is handled in two parts:
1.  **Initial Load (REST):** Fetch the current price immediately when the component mounts.
2.  **Live Updates (WebSocket):** Listen for real-time price changes to update the UI instantly without polling.

---

## 1. REST API (Initial Load)

Call this endpoint to get the price state when the user first loads the page.

*   **Endpoint:** `GET /api/market/sgc-price`
*   **Auth Required:** No (Public)

### Request
```http
GET /api/market/sgc-price
```

### Response
```json
{
  "symbol": "SGC",
  "priceUsd": 123.456,
  "lastUpdatedAt": "2025-11-29T12:00:00.000Z"
}
```

*   **`priceUsd`**: A `number` representing the current price in USD.
    *   **IMPORTANT:** This is a **floating-point number** (e.g., `123.456`). Do **NOT** round this number in your state management. Only format it (e.g., to 2 decimal places like `$123.46`) for the final UI display.
    *   Use the raw number for any internal calculations (like "Estimated SGC" calculators).

---

## 2. WebSocket (Live Updates)

Connect to the backend Socket.IO server to receive real-time updates.

*   **Library:** `socket.io-client`
*   **Namespace:** `/` (Default)

### A. Connection & Subscription

On component mount:

1.  Connect to the backend URL.
2.  Emit the `market:subscribe` event with the symbol `"sgc"`.

```javascript
import io from 'socket.io-client';

const socket = io('https://your-backend-api-url.com'); // e.g., localhost:3000

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  
  // SUBSCRIBE to SGC updates
  socket.emit('market:subscribe', 'sgc');
});
```

### B. Listening for Ticks

Listen for the `market:tick` event. This event is fired whenever the price changes on the backend.

```javascript
socket.on('market:tick', (data) => {
  console.log('Price Update:', data);
  
  // Update your React State / Redux Store
  // setPrice(data.last);
});
```

**Payload Structure:**
```json
{
  "symbol": "sgc",
  "last": 123.456,   // The new price (Float)
  "ts": 1732860000000 // Timestamp (ms)
}
```

*   **`last`**: The new price. Treat this exactly like `priceUsd` from the REST API.

### C. Unsubscribe (Cleanup)

On component unmount, it is good practice to unsubscribe.

```javascript
// On unmount
socket.emit('market:unsubscribe', 'sgc');
socket.disconnect();
```

---

## 3. Implementation Best Practices

### Handling Decimals
The backend now supports full decimal precision.
*   **Do:** Store the exact value `123.456` in your state.
*   **Do:** Use `toFixed(2)` or `Intl.NumberFormat` for displaying prices (e.g., `$123.46`).
*   **Do Not:** Use `Math.floor()` or `Math.round()` on the raw data unless you specifically intend to discard cents.

### "Flicker" Prevention
1.  Initialize your price state with `null` or a loading state.
2.  Fire the **REST API** call immediately.
3.  Simultaneously connect the **WebSocket**.
4.  If the WebSocket sends a tick *before* the REST API returns, use the WebSocket data (it's newer).

### Example Hook (React)

```javascript
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

export const useSgcPrice = () => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);

    // 1. Fetch Initial
    axios.get('/api/market/sgc-price').then(res => {
      setPrice(prev => prev === null ? res.data.priceUsd : prev);
    });

    // 2. Subscribe Live
    socket.on('connect', () => {
      socket.emit('market:subscribe', 'sgc');
    });

    socket.on('market:tick', (data) => {
      if (data.symbol === 'sgc') {
        setPrice(data.last);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return price;
};
```
