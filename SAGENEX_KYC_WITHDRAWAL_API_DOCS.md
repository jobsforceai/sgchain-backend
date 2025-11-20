# Sagenex API Documentation for SGChain Integration: KYC & Withdrawals

## 1. Overview

This document details the internal, server-to-server Sagenex APIs that allow the SGChain platform to initiate and track Know Your Customer (KYC) submissions and wallet withdrawal requests on behalf of a Sagenex user.

**Key Principles:**
*   **Asynchronous Flow:** All KYC and withdrawal requests are asynchronous. You will initiate a request and receive a unique ID. You must then poll a status endpoint using this ID to get updates.
*   **Idempotency:** The withdrawal endpoint requires an idempotency key to prevent accidental duplicate requests.
*   **Security:** All endpoints described here are internal and must be protected by the server-to-server authentication mechanism.

## 2. Authentication

All requests to these internal endpoints must include the `X-Internal-Auth` header with the shared secret.

*   **Header:** `X-Internal-Auth: Bearer <Your_SGCHAIN_INTERNAL_SECRET>`

Requests without a valid header will be rejected with a `403 Forbidden` error.

---

## 3. KYC Flow

This flow allows SGChain to submit KYC documents for a Sagenex user.

### Step 1: Submit KYC Documents

This endpoint initiates a new KYC verification process for a user.

*   **URL:** `POST /api/v1/internal/sgchain/kyc/submit`
*   **Method:** `POST`

#### Request Body

```json
{
  "sagenexUserId": "U414",
  "documentType": "PASSPORT",
  "documentFrontUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/passport-front.jpg",
  "documentBackUrl": null,
  "selfieUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/selfie.jpg"
}
```

| Field              | Type   | Required | Description                                                                                             |
| ------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `sagenexUserId`    | string | Yes      | The unique ID of the Sagenex user.                                                                      |
| `documentType`     | string | Yes      | The type of document being submitted. Enum: `PASSPORT`, `DRIVING_LICENSE`, `NATIONAL_ID`.               |
| `documentFrontUrl` | string | Yes      | A secure, publicly accessible URL to the front of the document image.                                   |
| `documentBackUrl`  | string | No       | A secure, publicly accessible URL to the back of the document. Required for `DRIVING_LICENSE`, `NATIONAL_ID`. |
| `selfieUrl`        | string | Yes      | A secure, publicly accessible URL to the user's selfie image.                                           |

#### Success Response (202 Accepted)

Returns a unique ID for the KYC submission, which you will use to track its status.

```json
{
  "kycId": "kyc_a1b2c3d4e5f6",
  "sagenexUserId": "U414",
  "status": "PENDING"
}
```

#### Error Responses

*   `400 Bad Request`: If required fields are missing, URLs are invalid, or the user has an existing pending/verified submission.
*   `404 Not Found`: If the `sagenexUserId` does not exist.

### Step 2: Get KYC Status

Poll this endpoint periodically to get the latest status of a submission.

*   **URL:** `GET /api/v1/internal/sgchain/kyc/{kycId}/status`
*   **Method:** `GET`

#### URL Parameters

| Parameter | Type   | Description                               |
| --------- | ------ | ----------------------------------------- |
| `kycId`   | string | The unique ID returned from the submit endpoint. |

#### Success Response (200 OK)

Returns the current status of the KYC submission.

```json
{
  "kycId": "kyc_a1b2c3d4e5f6",
  "sagenexUserId": "U414",
  "status": "VERIFIED",
  "rejectionReason": null
}
```

| Field             | Type   | Description                                                                                                                            |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `status`          | string | The current status. Enum: `PENDING`, `VERIFIED`, `REJECTED`.                                                                           |
| `rejectionReason` | string | If the status is `REJECTED`, this field will contain a brief explanation (e.g., "Blurry document", "Selfie does not match"). Otherwise, `null`. |

#### Error Responses

*   `404 Not Found`: If the `kycId` does not exist.

---

## 4. Withdrawal Flow

This flow allows SGChain to initiate a withdrawal from a user's Sagenex USD wallet to an external destination.

### Step 1: Request a Withdrawal

This endpoint initiates a new withdrawal request. It is **idempotent**, meaning you can safely retry the same request without creating duplicate transactions.

*   **URL:** `POST /api/v1/internal/sgchain/withdrawals/request`
*   **Method:** `POST`

#### Request Body

```json
{
  "idempotencyKey": "sgc-withdrawal-uuid-12345",
  "sagenexUserId": "U414",
  "amountUsd": 150.00,
  "withdrawalDetails": {
    "type": "CRYPTO",
    "address": "TX... (TRC20 Address)",
    "network": "TRC20"
  }
}
```

| Field               | Type   | Required | Description                                                                                                                            |
| ------------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `idempotencyKey`    | string | Yes      | A unique string (e.g., a UUID) generated by SGChain for this specific withdrawal. Sagenex guarantees that requests with the same key will only be processed once. |
| `sagenexUserId`     | string | Yes      | The unique ID of the Sagenex user.                                                                                                     |
| `amountUsd`         | number | Yes      | The amount of USD to withdraw. Must be a positive number.                                                                              |
| `withdrawalDetails` | object | Yes      | An object containing the destination details.                                                                                          |
| `...type`           | string | Yes      | The type of withdrawal. Enum: `CRYPTO`, `BANK`.                                                                                        |
| `...address`        | string | Yes      | **If type is `CRYPTO`**: The destination crypto address.                                                                               |
| `...network`        | string | Yes      | **If type is `CRYPTO`**: The crypto network (e.g., "TRC20", "ERC20").                                                                   |
| `...bankDetails`    | object | Yes      | **If type is `BANK`**: An object with fields like `accountNumber`, `ifscCode`, `holderName`, `bankName`.                                  |

#### Success Response (202 Accepted)

Returns a unique ID for the withdrawal request, which you will use to track its status.

```json
{
  "withdrawalId": "wd_z9y8x7w6v5",
  "sagenexUserId": "U414",
  "status": "PENDING",
  "amountUsd": 150.00
}
```

#### Error Responses

*   `400 Bad Request`: If required fields are missing, the user's KYC is not verified, or the amount exceeds the user's available balance or withdrawal limits.
*   `404 Not Found`: If the `sagenexUserId` does not exist.
*   `409 Conflict`: If a request with the same `idempotencyKey` but a different payload has already been received.

### Step 2: Get Withdrawal Status

Poll this endpoint periodically to get the latest status of a withdrawal.

*   **URL:** `GET /api/v1/internal/sgchain/withdrawals/{withdrawalId}/status`
*   **Method:** `GET`

#### URL Parameters

| Parameter      | Type   | Description                                    |
| -------------- | ------ | ---------------------------------------------- |
| `withdrawalId` | string | The unique ID returned from the request endpoint. |

#### Success Response (200 OK)

Returns the current status of the withdrawal request.

```json
{
  "withdrawalId": "wd_z9y8x7w6v5",
  "sagenexUserId": "U414",
  "status": "PAID",
  "rejectionReason": null,
  "transactionId": "abc...xyz (blockchain tx hash)"
}
```

| Field             | Type   | Description                                                                                                                            |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `status`          | string | The current status. Enum: `PENDING`, `PAID`, `REJECTED`.                                                                               |
| `rejectionReason` | string | If the status is `REJECTED`, this field will contain a brief explanation. Otherwise, `null`.                                           |
| `transactionId`   | string | If the status is `PAID`, this field may contain the blockchain transaction hash or an internal reference number. Otherwise, `null`.      |

#### Error Responses

*   `404 Not Found`: If the `withdrawalId` does not exist.

---

## 5. (Recommended) Webhooks for Status Updates

To avoid polling, we strongly recommend a webhook-based approach for a more robust and efficient integration.

**How it would work:**
1.  You (SGChain) provide us with a secure webhook URL on your backend.
2.  When the status of a KYC submission or a Withdrawal request changes (e.g., from `PENDING` to `VERIFIED` or `PAID`), the Sagenex backend will make a `POST` request to your webhook URL with the updated information.
3.  Your webhook endpoint should validate the request (e.g., via a shared secret in the header) and then update the status in your own database.

This is not yet implemented but can be added as a next step if you wish to proceed with this integration pattern.
