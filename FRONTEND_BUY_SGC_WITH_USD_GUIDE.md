# SGChain Frontend Integration Guide: Buy SGC with USD Balance

This document outlines how to integrate the "Buy SGC with USD Balance" feature, allowing users to instantly purchase SGC using their existing USD balance within the SGChain platform. This transaction is immediate and does not require admin approval.

## 1. Overview

Users who have a `fiatBalanceUsd` in their wallet can use it to directly buy SGC. The process involves:
1.  The user specifies the amount of SGC they want to buy.
2.  The backend calculates the USD cost based on the current SGC price.
3.  The backend debits the user's USD balance and credits their SGC balance, while also initiating an on-chain transfer of SGC from the hot wallet to the user's on-chain address.

## 2. API Endpoint

### `POST /api/me/buy-sgc/balance`

Instantly purchases a specified amount of SGC using the user's available `fiatBalanceUsd`.

-   **Authentication**: Required (Standard User `accessToken`)
-   **Request Type**: `application/json`

#### Request Body

```json
{
  "sgcAmount": 1.5 // The amount of SGC the user wishes to purchase
}
```

| Field       | Type     | Required | Description                     |
| :---------- | :------- | :------- | :------------------------------ |
| `sgcAmount` | `Number` | Yes      | The amount of SGC to purchase.  |

#### Success Response (200 OK)

```json
{
  "status": "SUCCESS",
  "onchainTxHash": "0x...",            // Hash of the on-chain SGC transfer
  "boughtSgcAmount": 1.5,
  "costUsd": 172.50,                   // USD debited from user's balance
  "sgcBalanceAfter": 12.0,             // User's new SGC balance
  "usdBalanceAfter": 827.50            // User's new USD balance
}
```

#### Error Responses (400 Bad Request)

*   `INVALID_SGC_AMOUNT`: If `sgcAmount` is 0 or negative.
*   `USER_WALLET_NOT_FOUND`: If the user or their on-chain wallet address is not found.
*   `SGC_PRICE_NOT_AVAILABLE`: If the current SGC price cannot be fetched.
*   `INSUFFICIENT_USD_BALANCE`: If the user does not have enough `fiatBalanceUsd` to cover the purchase.

## 3. Frontend Implementation Example (React with Axios)

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const BuySgcWithUsd = ({ authToken }) => {
  const [sgcAmount, setSgcAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleBuy = async () => {
    if (!sgcAmount || parseFloat(sgcAmount) <= 0) {
      setError('Please enter a valid SGC amount.');
      return;
    }

    try {
      const response = await axios.post(
        '/api/me/buy-sgc/balance', // Adjust API base URL as needed
        { sgcAmount: parseFloat(sgcAmount) },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      setMessage(
        `Successfully bought ${response.data.boughtSgcAmount} SGC for $${response.data.costUsd}. ` +
        `New SGC Balance: ${response.data.sgcBalanceAfter}, New USD Balance: $${response.data.usdBalanceAfter}. ` +
        `Tx Hash: ${response.data.onchainTxHash.substring(0, 10)}...`
      );
      setError('');
      // Optionally, update local wallet state or refetch wallet data
    } catch (err) {
      console.error('Buy SGC with USD error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to buy SGC.');
      setMessage('');
    }
  };

  return (
    <div>
      <h2>Buy SGC with USD Balance</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>SGC Amount:</label>
        <input 
          type="number" 
          value={sgcAmount} 
          onChange={(e) => setSgcAmount(e.target.value)} 
          placeholder="Enter SGC amount"
          min="0.00000001" // Assuming minimum 8 decimal places for SGC
          step="any"
        />
      </div>
      <button onClick={handleBuy} disabled={!sgcAmount || parseFloat(sgcAmount) <= 0}>
        Buy SGC Now
      </button>
    </div>
  );
};

export default BuySgcWithUsd;
```
