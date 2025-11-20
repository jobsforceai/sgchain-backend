# SGChain Transaction History API Documentation

This document outlines the API endpoint for fetching a user's complete transaction history.

**Base URL**: `/api`

---

## 1. Get Transaction History

Retrieves a list of all ledger entries for the currently authenticated user, showing all movements of SGC and USD in their wallet.

- **Endpoint**: `GET /me/history`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**: None
- **Success Response (200 OK)**:
  - An array of transaction objects, sorted from newest to oldest.
  ```json
  {
    "items": [
      {
        "id": "65a2b3c4d5e6f7a8b9c0d1e2",
        "type": "DEPOSIT_FROM_SAGENEX_USD",
        "currency": "USD",
        "amount": 120.00,
        "meta": {
          "sagenexUserId": "U001",
          "transferredAmountUsd": 120.00,
          "migration_corrected": true,
          "migration_fix_applied": true
        },
        "createdAt": "2025-11-18T12:00:00.000Z",
        "peerInfo": null
      },
      {
        "id": "65a2b2a1b2c3d4e5f6a7b8c9",
        "type": "BUY_SGC_WITH_USD_BALANCE",
        "currency": "SGC",
        "amount": 1.5,
        "meta": {
          "costUsd": 172.50,
          "priceUsd": 115.0,
          "onchainTxHash": "0x123abc..."
        },
        "createdAt": "2025-11-18T11:55:00.000Z",
        "peerInfo": null
      },
      {
        "id": "65a2b2a1b2c3d4e5f6a7b8d0",
        "type": "BUY_SGC_WITH_USD_BALANCE",
        "currency": "USD",
        "amount": -172.50,
        "meta": {
          "sgcAmount": 1.5,
          "priceUsd": 115.0,
          "onchainTxHash": "0x123abc..."
        },
        "createdAt": "2025-11-18T11:55:00.000Z",
        "peerInfo": null
      },
      {
        "id": "65a2b1a0b1c2d3e4f5a6b7c8",
        "type": "USER_INTERNAL_TRANSFER_DEBIT",
        "currency": "SGC",
        "amount": -2.5,
        "meta": {
          "peerUserId": "60d5f2f5c7b4f3b3a8c1d8e4",
          "peerAddress": "0xABCD...",
          "onchainTxHash": "0x456def..."
        },
        "createdAt": "2025-11-18T11:50:00.000Z",
        "peerInfo": {
            "userId": "60d5f2f5c7b4f3b3a8c1d8e4",
            "fullName": "Friend User",
            "email": "friend@example.com"
        }
      }
    ]
  }
  ```

### Response Object Fields:

- `id`: The unique ID of the ledger entry.
- `type`: The type of transaction. The frontend can use this to display a human-readable description (e.g., "Deposit from Sagenex", "Bought SGC", "Sent SGC").
- `currency`: The currency of the transaction (`SGC` or `USD`).
- `amount`: The amount of the transaction. Positive for credits, negative for debits.
- `meta`: An object containing additional details specific to the transaction type.
- `createdAt`: The timestamp of the transaction.
- `peerInfo`: If the transaction was a user-to-user transfer, this object contains the other user's details.
- **Note on `BUY_SGC_WITH_USD_BALANCE`**: This action creates two ledger entries: one debiting `USD` and one crediting `SGC`. The frontend should ideally group these by `meta.onchainTxHash` or timestamp to display them as a single "Buy" event.
