# SGChain "Buy SGC" API Documentation

This document outlines the API endpoints for the "Buy SGC via Bank Transfer" feature.

**Base URL**: `/api`

---

## Flow Overview

The process for a user to buy SGC involves three main steps from the frontend's perspective:

1.  **Fetch Bank Details**: The user gets the company's official bank account information (e.g., for HDFC in India or Emirates NBD in Dubai) to make a manual bank transfer.
2.  **Submit a Deposit Request**: After making the transfer, the user submits a request in the app. They provide the amount, the region they deposited to, and a proof of payment (like a screenshot). The backend locks in the SGC price at this moment.
3.  **View Request History**: The user can view the status of their pending, approved, or rejected requests.

Admin approval happens in the background and is not covered in this user-facing documentation.

---

## 1. Get Bank Account Details

Retrieves the list of official bank accounts where users can deposit fiat currency.

- **Endpoint**: `GET /buy/bank-accounts`
- **Authentication**: None (This is public information)
- **Request Body**: None
- **Success Response (200 OK)**:
  - An array of bank account objects grouped by region.
  ```json
  {
    "regions": [
      {
        "region": "INDIA",
        "fiatCurrency": "INR",
        "bankName": "HDFC Bank",
        "accountName": "SAGENEX GLOBAL",
        "accountNumber": "xxxxxx",
        "ifsc": "HDFC000XXXX",
        "note": "Use your SGChain registered email as reference"
      },
      {
        "region": "DUBAI",
        "fiatCurrency": "AED",
        "bankName": "Emirates NBD",
        "iban": "AE..",
        "note": "Use your SGChain user ID as reference"
      }
    ]
  }
  ```

---

## 2. Initiate a Buy SGC Request

Submits a new request for a user who has deposited fiat currency. This is the core step where the user provides their proof of payment.

- **Endpoint**: `POST /me/buy-sgc`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "bankRegion": "INDIA",
    "fiatAmount": 100000,
    "fiatCurrency": "INR",
    "paymentProofUrl": "https://your-s3-bucket-url.com/path/to/proof.jpg",
    "referenceNote": "Optional user note or bank reference ID"
  }
  ```
  - `bankRegion`: Must be one of the regions from the `GET /buy/bank-accounts` endpoint (e.g., "INDIA", "DUBAI").
  - `fiatAmount`: The amount of fiat currency the user deposited.
  - `fiatCurrency`: The currency for the deposit (e.g., "INR", "AED").
  - `paymentProofUrl`: A public URL to the uploaded payment proof image. The frontend is responsible for handling the file upload to a storage service (like AWS S3) and providing the URL here.

- **Success Response (201 Created)**:
  - The backend confirms the request is pending and returns the SGC amount and price that have been locked in for this transaction.
  ```json
  {
    "status": "PENDING",
    "requestId": "65a1b2c3d4e5f6a7b8c9d0e1",
    "lockedSgcAmount": 8.69565217,
    "lockedSgcPriceUsd": 115.0,
    "lockedAt": "2025-11-17T10:00:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the SGC price is not available, or if the currency is invalid.
  - `401 Unauthorized`: If the user's access token is invalid.

---

## 3. Get My Buy SGC Requests

Retrieves a history of the user's past and pending buy requests.

- **Endpoint**: `GET /me/buy-sgc/requests`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Query Parameters (Optional)**:
  - `?status=PENDING`
  - `?status=APPROVED`
  - `?status=REJECTED`
- **Success Response (200 OK)**:
  - An array of the user's deposit requests.
  ```json
  {
    "items": [
      {
        "_id": "65a1b2c3d4e5f6a7b8c9d0e1",
        "userId": "60d5f2f5c7b4f3b3a8c1d8e4",
        "bankRegion": "INDIA",
        "fiatCurrency": "INR",
        "fiatAmount": 100000,
        "lockedSgcAmount": 8.69565217,
        "status": "APPROVED",
        "lockedAt": "2025-11-17T10:00:00.000Z",
        "approvedAt": "2025-11-17T12:30:00.000Z",
        "onchainTxHash": "0xabc123...",
        "onchainTo": "0xUSER_WALLET_ADDRESS..."
      },
      {
        "_id": "65a1b1a2b3c4d5e6f7a8b9c0",
        "userId": "60d5f2f5c7b4f3b3a8c1d8e4",
        "bankRegion": "DUBAI",
        "fiatCurrency": "AED",
        "fiatAmount": 5000,
        "lockedSgcAmount": 11.83534449,
        "status": "PENDING",
        "lockedAt": "2025-11-16T09:00:00.000Z"
      }
    ]
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: If the user's access token is invalid.
