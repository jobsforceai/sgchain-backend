# SGChain Admin Portal Frontend Integration Guide: User Ledger & "Buy SGC with USD Balance"

This document guides the Admin Frontend Team on how to view and interpret the ledger entries generated when a user buys SGC using their existing USD balance.

## 1. Overview

When a user performs an "Instant Buy" of SGC using their `fiatBalanceUsd`, two distinct ledger entries are created to represent the movement of funds:
1.  **USD Debit**: An entry showing USD being debited from the user's wallet.
2.  **SGC Credit**: An entry showing SGC being credited to the user's wallet.

Both entries share a common `meta.onchainTxHash` and `type` to allow the frontend to easily group and display them as a single logical "Buy SGC" event.

## 2. API Endpoint for User Ledger

To view these entries, admins will use the existing endpoint to fetch a user's wallet and ledger history:

*   **Endpoint**: `GET /api/admin/users/:userId/wallet`
*   **Authentication**: Required (Admin JWT with `SUPERADMIN`, `FINANCE`, or `SUPPORT` role)

### Response Structure (Relevant Part for Ledger)

```json
{
  "user": { ... },
  "wallet": { ... },
  "ledger": [
    {
      "_id": "65a4e1a2b3c4d5e6f7a8b9c0",
      "userId": "user123",
      "walletId": "wallet123",
      "currency": "USD",
      "amount": -172.50, // Negative amount signifies a debit
      "type": "BUY_SGC_WITH_USD_BALANCE",
      "meta": {
        "sgcAmount": 1.5,
        "priceUsd": 115.0,
        "onchainTxHash": "0x0ac029962432935bdedb1ef908c465620fba39aac5cfbed36d5d562647a3b552"
      },
      "createdAt": "2025-11-29T15:30:00.000Z"
    },
    {
      "_id": "65a4e1a2b3c4d5e6f7a8b9c1",
      "userId": "user123",
      "walletId": "wallet123",
      "currency": "SGC",
      "amount": 1.5, // Positive amount signifies a credit
      "type": "BUY_SGC_WITH_USD_BALANCE",
      "meta": {
        "costUsd": 172.50,
        "priceUsd": 115.0,
        "onchainTxHash": "0x0ac029962432935bdedb1ef908c465620fba39aac5cfbed36d5d562647a3b552"
      },
      "createdAt": "2025-11-29T15:30:00.000Z"
    },
    // ... other ledger entries
  ]
}
```

## 3. Frontend Display Recommendations

To provide a clear view of the "Buy SGC with USD Balance" transactions:

1.  **Group Entries**: Iterate through the `ledger` array. Look for entries with `type: "BUY_SGC_WITH_USD_BALANCE"` that share the **same `meta.onchainTxHash`**. These two entries (one USD debit, one SGC credit) represent a single transaction.
2.  **Display as Single Event**: Present these grouped entries as a single, consolidated event in the UI.
    *   **Transaction Type**: "Buy SGC (Instant)"
    *   **Amount**: Display both `costUsd` (from the SGC credit's meta) and `boughtSgcAmount` (from the USD debit's meta).
    *   **Date/Time**: Use `createdAt`.
    *   **Details**: Optionally show `priceUsd` and the `onchainTxHash` for auditing/verification.
3.  **Link to Explorer**: Make the `onchainTxHash` clickable, linking to your SGChain block explorer for that transaction (e.g., `https://explorer.sgchain.com/tx/:txHash`).

### Example Display (Conceptual)

| Date/Time | Type                | Details                                                                                                         | Status    | Tx Hash (On-chain) |
| :-------- | :------------------ | :-------------------------------------------------------------------------------------------------------------- | :-------- | :----------------- |
| Nov 29, 3:30 PM | Buy SGC (Instant) | Bought 1.5 SGC for $172.50 (Price: $115.00/SGC)                                                               | Confirmed | `0x0ac029...` [↗] |


## 4. Error Handling

Frontend should handle potential errors from the `/me/buy-sgc/balance` endpoint, displaying appropriate messages for issues like `INSUFFICIENT_USD_BALANCE` or `SGC_PRICE_NOT_AVAILABLE`.
