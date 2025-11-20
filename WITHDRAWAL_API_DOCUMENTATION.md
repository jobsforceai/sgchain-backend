# SGChain KYC & Withdrawal API Documentation

This document outlines the API endpoints for the user-facing KYC and USD Withdrawal features.

**Base URL**: `/api`

---

## 1. KYC Flow

A user must have a `VERIFIED` KYC status for a specific region before they can request a bank withdrawal to that region.

### 1.1. Submit KYC Documents

Initiates a new KYC verification process for a user in a specific region. A user can only have one pending or verified application per region.

- **Endpoint**: `POST /me/kyc/submit`
- **Authentication**: Required (Standard User `accessToken`)

#### Request Body

```json
{
  "region": "INDIA",
  "documentType": "NATIONAL_ID",
  "documentFrontUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/aadhar-front.jpg",
  "documentBackUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/aadhar-back.jpg",
  "selfieUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/selfie.jpg"
}
```

| Field              | Type   | Required | Description                                                                                             |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `region`           | string | Yes      | The region for the KYC application. Enum: `INDIA`, `DUBAI`.                                             |
| `documentType`     | string | Yes      | The type of document. Enum: `PASSPORT`, `DRIVING_LICENSE`, `NATIONAL_ID`.                               |
| `documentFrontUrl` | string | Yes      | A secure, public URL to the front of the document image.                                                |
| `documentBackUrl`  | string | No       | A secure, public URL to the back of the document. Required for `DRIVING_LICENSE`, `NATIONAL_ID`.          |
| `selfieUrl`        | string | Yes      | A secure, public URL to the user's selfie image.                                                        |

#### Success Response (202 Accepted)

```json
{
  "kycId": "65a3c4d5e6f7a8b9c0d1e2f3",
  "status": "PENDING",
  "region": "INDIA"
}
```

### 1.2. Get KYC Status

Retrieves the status of all KYC submissions for the current user.

- **Endpoint**: `GET /me/kyc/status`
- **Authentication**: Required
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "region": "INDIA",
        "status": "VERIFIED",
        "rejectionReason": null,
        "createdAt": "2025-11-19T10:00:00.000Z"
      },
      {
        "region": "DUBAI",
        "status": "REJECTED",
        "rejectionReason": "Selfie does not match document.",
        "createdAt": "2025-11-19T11:00:00.000Z"
      }
    ]
  }
  ```

---

## 2. Withdrawal Flow

Allows a user to request a withdrawal of their USD balance.

### 2.1. Request a Withdrawal

Initiates a new withdrawal request. A user can only have **one** request in `PENDING` status at a time.

- **Endpoint**: `POST /me/withdrawals/request`
- **Authentication**: Required

#### Request Body Examples

**Crypto Withdrawal (Universal):**
```json
{
  "amountUsd": 150.00,
  "withdrawalType": "CRYPTO",
  "withdrawalDetails": {
    "network": "TRC20",
    "address": "TX... (TRC20 Address)"
  }
}
```

**Bank Withdrawal (India):**
```json
{
  "amountUsd": 200.00,
  "withdrawalType": "BANK",
  "withdrawalDetails": {
    "region": "INDIA",
    "accountHolderName": "Test User",
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "bankName": "HDFC Bank"
  }
}
```

**Bank Withdrawal (Dubai):**
```json
{
  "amountUsd": 500.00,
  "withdrawalType": "BANK",
  "withdrawalDetails": {
    "region": "DUBAI",
    "beneficiaryName": "Test User",
    "iban": "AE12345678901234567890",
    "swiftBic": "EBILAEAD",
    "bankName": "Emirates NBD"
  }
}
```

#### Success Response (202 Accepted)

```json
{
  "withdrawalId": "65a3c5d6e7f8a9b0c1d2e3f4",
  "status": "PENDING",
  "amountUsd": 200.00
}
```

#### Error Responses
*   `400 Bad Request`:
    *   `PENDING_WITHDRAWAL_EXISTS`: If the user already has a pending request.
    *   `KYC_NOT_VERIFIED_FOR_REGION`: If the user's KYC is not verified for the bank withdrawal region.
    *   `INSUFFICIENT_USD_BALANCE`: If the requested amount exceeds their balance.

### 2.2. Get Withdrawal History

Retrieves a list of all past and pending withdrawal requests for the user.

- **Endpoint**: `GET /me/withdrawals`
- **Authentication**: Required
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "_id": "65a3c5d6e7f8a9b0c1d2e3f4",
        "status": "PENDING",
        "amountUsd": 200.00,
        "withdrawalType": "BANK",
        "withdrawalDetails": { "region": "INDIA", "...": "..." },
        "createdAt": "2025-11-19T12:00:00.000Z"
      },
      {
        "_id": "65a3c1a0b1c2d3e4f5a6b7c8",
        "status": "APPROVED",
        "amountUsd": 150.00,
        "withdrawalType": "CRYPTO",
        "adminNotes": "Processed via batch #123",
        "createdAt": "2025-11-18T15:00:00.000Z"
      }
    ]
  }
  ```
