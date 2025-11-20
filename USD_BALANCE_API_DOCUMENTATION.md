# SGChain USD Balance & Instant Buy API Documentation

This document outlines the API changes related to the user's USD balance and the new feature to instantly buy SGC using that balance.

**Base URL**: `/api`

---

## 1. Core Changes

### 1.1. New USD Balance in Wallet

The main user wallet object, retrieved from the `GET /me/wallet` endpoint, now includes a `fiatBalanceUsd` field. This field represents a user's USD balance that can be used for purchases within the platform.

- **Endpoint**: `GET /me/wallet`
- **Updated Success Response (200 OK)**:
  ```json
  {
    "userId": "...",
    "walletId": "...",
    "sgcBalance": 10.5,
    "fiatBalanceUsd": 50.75, // <-- NEW/UPDATED FIELD
    "sgcOfficialPriceUsd": 115.0,
    "sgcValueUsd": 1207.5,
    "totalAccountValueUsd": 1258.25, // This now includes the USD balance
    "status": "ACTIVE",
    "isPinSet": true
  }
  ```

### 1.2. Sagenex Transfers Now Credit USD

The "Redeem Sagenex Transfer" flow has been changed. Instead of converting the amount to SGC, it now directly credits the user's `fiatBalanceUsd`.

- **Endpoint**: `POST /me/redeem-transfer`
- **Updated Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "creditedUsdAmount": 50.75,
    "usdBalanceAfter": 50.75
  }
  ```

---

## 2. New Feature: Instant Buy with USD Balance

This new endpoint allows a user to purchase SGC instantly using their `fiatBalanceUsd`. This flow does **not** require admin approval and triggers an immediate on-chain transfer.

- **Endpoint**: `POST /me/buy-sgc/balance`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "sgcAmount": 1.5
  }
  ```
  - `sgcAmount`: The amount of SGC the user wishes to purchase.

- **Success Response (200 OK)**:
  - Returns details of the successful on-chain transaction.
  ```json
  {
    "status": "SUCCESS",
    "onchainTxHash": "0x123abc...",
    "boughtSgcAmount": 1.5,
    "costUsd": 172.50,
    "sgcBalanceAfter": 12.0,
    "usdBalanceAfter": 3.25
  }
  ```
- **Error Responses**:
  - `400 Bad Request`:
    - If the user's USD balance is insufficient (`INSUFFICIENT_USD_BALANCE`).
    - If the SGC price is not currently available (`SGC_PRICE_NOT_AVAILABLE`).
    - If the requested SGC amount is invalid (`INVALID_SGC_AMOUNT`).
  - `401 Unauthorized`: If the user's access token is invalid.

---

## 3. Existing "Buy via Bank" Flow

The existing flow for buying SGC via a manual bank transfer (`POST /me/buy-sgc`) remains unchanged. It still creates a `FiatDepositRequest` that requires admin approval. Use this flow when users are depositing new money from an external bank account.
