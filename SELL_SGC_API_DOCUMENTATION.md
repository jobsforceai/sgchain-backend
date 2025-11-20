# SGChain "Sell SGC" API Documentation

This document outlines the API endpoint for the "Sell SGC" feature.

**Base URL**: `/api`

---

## Flow Overview

1.  The user decides to sell a certain amount of their SGC.
2.  The frontend calls the `sell-sgc` endpoint with the desired amount.
3.  The backend performs an on-chain transaction, moving the SGC from the user's custodial wallet to the company's hot wallet.
4.  Simultaneously, the backend calculates the USD value of the sold SGC (based on the current market price) and credits the user's `fiatBalanceUsd`.
5.  The user can then see their updated SGC and USD balances.

This process is instant and does not require admin approval.

---

## 1. Sell SGC

Executes the sale of a specified amount of SGC from the user's wallet.

- **Endpoint**: `POST /me/sell-sgc`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "sgcAmount": 2.5
  }
  ```
  - `sgcAmount`: The amount of SGC the user wishes to sell.

- **Success Response (200 OK)**:
  - Returns details of the successful on-chain transaction and the updated balances.
  ```json
  {
    "status": "SUCCESS",
    "onchainTxHash": "0xdef456...",
    "soldSgcAmount": 2.5,
    "creditedUsdAmount": 287.50,
    "sgcBalanceAfter": 8.0,
    "usdBalanceAfter": 338.25
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    - If the user's SGC balance is insufficient (`INSUFFICIENT_SGC_BALANCE`).
    - If the SGC price is not currently available (`SGC_PRICE_NOT_AVAILABLE`).
    - If the requested SGC amount is invalid (`INVALID_SGC_AMOUNT`).
  - `401 Unauthorized`: If the user's access token is invalid.
  - `404 Not Found`: If the user's wallet or private key cannot be found (`USER_WALLET_NOT_FOUND`).

---

## 2. Impact on Transaction History

This action will create **two** new entries in the user's transaction history (`GET /me/history`):

1.  A `SELL_SGC_DEBIT` entry, showing the negative movement of SGC.
2.  A `SELL_SGC_CREDIT` entry, showing the positive movement of USD.

The frontend should be prepared to display these new transaction types.
