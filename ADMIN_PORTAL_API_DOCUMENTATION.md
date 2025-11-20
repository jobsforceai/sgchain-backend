# Admin Portal API Documentation

This document provides a detailed specification for the Admin Portal API endpoints.

**Base URL**: `/admin`

---

## Authentication

### Login

- **Endpoint**: `POST /auth/login`
- **Description**: Authenticates an admin user and returns a JWT token.
- **Required Role**: None
- **Request Body**:
  ```json
  {
    "email": "superadmin@sagenex.com",
    "password": "DefaultPassword_SuperAdmin"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "60d5f1b3e6b3f3b3e8b3f3b3",
      "email": "superadmin@sagenex.com",
      "role": "SUPERADMIN"
    }
  }
  ```
- **Error Response (400 Bad Request)**:
  - Invalid credentials.

---

## Pricing Management

### Set SGC Price

- **Endpoint**: `POST /price`
- **Description**: Sets the official price of SGC in USD.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **Request Body**:
  ```json
  {
    "priceUsd": 0.5,
    "reason": "Quarterly price adjustment"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS"
  }
  ```
- **Error Response (400 Bad Request)**:
  - Validation error (e.g., price is not a positive number).

---

## User & Wallet Management

### Get User Wallet Details

- **Endpoint**: `GET /users/:userId/wallet`
- **Description**: Retrieves a user's wallet balance and recent transaction ledger.
- **Required Role**: `SUPERADMIN`, `FINANCE`, `SUPPORT`
- **URL Parameters**:
  - `userId` (string): The ID of the user.
- **Success Response (200 OK)**:
  ```json
  {
    "user": { ... },
    "wallet": { ... },
    "ledger": [ ... ]
  }
  ```

### Manual Wallet Adjustment

- **Endpoint**: `POST /users/:userId/wallet/manual-adjust`
- **Description**: Manually credits or debits a user's wallet for SGC or USD. This action is logged in the admin audit trail.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **URL Parameters**:
  - `userId` (string): The ID of the user.
- **Request Body**:
  ```json
  {
    "currency": "USD",
    "direction": "CREDIT",
    "amount": 100.50,
    "reason": "Manual compensation for failed transaction"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS"
  }
  ```
- **Error Response (400 Bad Request)**:
  - Validation error on the request body.

---

## Buy SGC Management

### List Buy Requests

- **Endpoint**: `GET /buy-sgc/requests`
- **Description**: Retrieves a list of fiat deposit requests to buy SGC. Can be filtered by status.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **Query Parameters**:
  - `status` (string, optional): Filter by status (e.g., `PENDING`, `APPROVED`, `REJECTED`).
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "_id": "60d5f1b3e6b3f3b3e8b3f3b4",
        "userId": { "email": "user@example.com", "fullName": "John Doe" },
        "status": "PENDING",
        "fiatAmount": 1000,
        "fiatCurrency": "USD",
        "lockedSgcAmount": 2000,
        "createdAt": "2025-11-17T10:00:00.000Z"
      }
    ]
  }
  ```

### Approve Buy Request

- **Endpoint**: `POST /buy-sgc/requests/:id/approve`
- **Description**: Approves a pending buy request. This action transfers SGC from the hot wallet to the user's onchain address and updates their wallet balance.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **URL Parameters**:
  - `id` (string): The ID of the buy request.
- **Request Body**:
  ```json
  {
    "adminComment": "Bank transfer confirmed."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "requestId": "60d5f1b3e6b3f3b3e8b3f3b4",
    "sgcCredited": 2000,
    "onchainTxHash": "0x123abc..."
  }
  ```

### Reject Buy Request

- **Endpoint**: `POST /buy-sgc/requests/:id/reject`
- **Description**: Rejects a pending buy request.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **URL Parameters**:
  - `id` (string): The ID of the buy request.
- **Request Body**:
  ```json
  {
    "reason": "Proof of payment was not clear."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "REJECTED"
  }
  ```

---

## Withdrawal Management

### Get Withdrawal Requests

- **Endpoint**: `GET /withdrawals`
- **Description**: Retrieves a list of withdrawal requests. Can be filtered by status.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **Query Parameters**:
  - `status` (string, optional): Filter by status (e.g., `PENDING`, `APPROVED`, `REJECTED`).
- **Success Response (200 OK)**:
  ```json
  {
    "items": [ ... ]
  }
  ```

### Approve Withdrawal Request

- **Endpoint**: `POST /withdrawals/:id/approve`
- **Description**: Marks a withdrawal request as approved. In the current system, this is a manual process confirmation.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **URL Parameters**:
  - `id` (string): The ID of the withdrawal request.
- **Request Body**:
  ```json
  {
    "adminNotes": "Payment processed via bank transfer."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "requestId": "60d5f1b3e6b3f3b3e8b3f3b5"
  }
  ```

### Reject Withdrawal Request

- **Endpoint**: `POST /withdrawals/:id/reject`
- **Description**: Rejects a withdrawal request and refunds the debited amount to the user's USD wallet.
- **Required Role**: `SUPERADMIN`, `FINANCE`
- **URL Parameters**:
  - `id` (string): The ID of the withdrawal request.
- **Request Body**:
  ```json
  {
    "adminNotes": "User bank details are incorrect."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "requestId": "60d5f1b3e6b3f3b3e8b3f3b5"
  }
  ```

---

## KYC Management

### Get KYC Requests

- **Endpoint**: `GET /kyc/requests`
- **Description**: Retrieves a list of KYC applications. Defaults to `PENDING` status.
- **Required Role**: `SUPERADMIN`, `KYC_ADMIN`
- **Query Parameters**:
  - `status` (string, optional): Filter by status (e.g., `PENDING`, `VERIFIED`, `REJECTED`).
- **Success Response (200 OK)**:
  ```json
  {
    "items": [ ... ]
  }
  ```

### Get KYC Request Details

- **Endpoint**: `GET /kyc/requests/:id`
- **Description**: Retrieves the full details of a specific KYC application, including user info and submitted documents.
- **Required Role**: `SUPERADMIN`, `KYC_ADMIN`
- **URL Parameters**:
  - `id` (string): The ID of the KYC record.
- **Success Response (200 OK)**:
  ```json
  {
    "application": { ... },
    "documents": [ ... ],
    "user": { ... }
  }
  ```

### Approve KYC Request

- **Endpoint**: `POST /kyc/requests/:id/approve`
- **Description**: Approves a pending KYC application.
- **Required Role**: `SUPERADMIN`, `KYC_ADMIN`
- **URL Parameters**:
  - `id` (string): The ID of the KYC record.
- **Request Body**:
  ```json
  {
    "adminNotes": "Documents look correct."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "requestId": "60d5f1b3e6b3f3b3e8b3f3b6"
  }
  ```

### Reject KYC Request

- **Endpoint**: `POST /kyc/requests/:id/reject`
- **Description**: Rejects a pending KYC application.
- **Required Role**: `SUPERADMIN`, `KYC_ADMIN`
- **URL Parameters**:
  - `id` (string): The ID of the KYC record.
- **Request Body**:
  ```json
  {
    "rejectionReason": "DOCUMENT_UNREADABLE",
    "adminNotes": "The ID photo is too blurry."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "status": "SUCCESS",
    "requestId": "60d5f1b3e6b3f3b3e8b3f3b6"
  }
  ```
