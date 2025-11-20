# SGChain Wallet API Documentation

This document outlines the API endpoints for managing a user's wallet, including security PIN setup and accessing sensitive on-chain details.

**Base URL**: `/api`

---

## 1. Wallet Security (PIN Management)

This flow is required to access sensitive wallet details like the private key.

### Flow Overview:

1.  **Set PIN**: The user sets their 4-digit wallet PIN. This is a one-time setup.
2.  **Verify PIN**: Before accessing sensitive data, the user must enter their PIN. A successful verification returns a short-lived **Wallet Access Token**.
3.  **Access Details**: The frontend uses this special Wallet Access Token to make calls to sensitive endpoints.

---

### 1.1. Set Wallet PIN

Sets or updates the user's 4-digit PIN for wallet access.

- **Endpoint**: `POST /me/wallet/set-pin`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "pin": "string (must be exactly 4 digits)"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "message": "Wallet PIN has been set."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the PIN format is invalid (e.g., not 4 digits).
  - `401 Unauthorized`: If the standard user `accessToken` is invalid.

### 1.2. Verify Wallet PIN & Get Access Token

Verifies the user's PIN and returns a temporary `walletAccessToken` if successful.

- **Endpoint**: `POST /me/wallet/verify-pin`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "pin": "string (4 digits)"
  }
  ```
- **Success Response (200 OK)**:
  - This token is valid for **4 hours** and is required to access sensitive wallet details.
  ```json
  {
    "walletAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 14400
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the PIN is invalid or has not been set yet.
  - `401 Unauthorized`: If the standard user `accessToken` is invalid.

---

## 2. Sensitive Wallet Details

Endpoints for retrieving the user's on-chain address and private key.

### 2.1. Get Wallet Details (Address & Private Key)

Retrieves the user's public on-chain address and their **unencrypted private key**.

- **Endpoint**: `GET /me/wallet/details`
- **Authentication**: **Required** (The special `walletAccessToken` obtained from the `/verify-pin` endpoint).
  - The header must be: `Authorization: Bearer <walletAccessToken>`
- **Request Body**: None
- **Success Response (200 OK)**:
  ```json
  {
    "onchainAddress": "0x1234...",
    "privateKey": "0xabcd..."
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: If the `walletAccessToken` is missing, invalid, or expired.
  - `403 Forbidden`: If a standard user `accessToken` is used instead of the `walletAccessToken`.

> **SECURITY WARNING FOR FRONTEND:**
> The `privateKey` is extremely sensitive.
> - **NEVER** store the private key in `localStorage`, `sessionStorage`, or cookies.
> - Only display it temporarily to the user when they explicitly request to view it.
> - Clear it from memory as soon as the user closes the view.
> - Advise users to copy it to a secure, offline location and then clear it from their screen.

---

## 3. General Wallet Information

This endpoint provides non-sensitive balance information and does **not** require PIN verification.

### 3.1. Get My Wallet (Balances)

Retrieves the user's SGC balance and its current value in USD.

- **Endpoint**: `GET /me/wallet`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Success Response (200 OK)**:
  - The `isPinSet` flag indicates if the user has already created a 4-digit wallet PIN.
  ```json
  {
    "userId": "...",
    "walletId": "...",
    "sgcBalance": 10.5,
    "sgcOfficialPriceUsd": 115.0,
    "sgcValueUsd": 1207.5,
    "totalAccountValueUsd": 1207.5,
    "status": "ACTIVE",
    "isPinSet": true
  }
  ```
