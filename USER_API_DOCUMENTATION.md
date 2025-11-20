# SGChain User API Documentation

This document outlines the available API endpoints for the SGChain user-facing frontend.

**Base URL**: `/api`

---

## 1. Authentication

Endpoints for user registration and login.

### 1.1. Register a New User

Creates a new user account.

- **Endpoint**: `POST /auth/register`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "fullName": "string",
    "email": "string (valid email format)",
    "password": "string (min. 8 characters)"
  }
  ```
- **Success Response (201 Created)**:
  - The created user object, excluding sensitive fields like the password.
  ```json
  {
    "_id": "60d5f2f5c7b4f3b3a8c1d8e4",
    "fullName": "Test User",
    "email": "test@example.com",
    "status": "ACTIVE",
    "createdAt": "2025-11-16T20:30:00.000Z",
    "updatedAt": "2025-11-16T20:30:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If a user with the provided email already exists.

### 1.2. Request OTP for Login

Requests a one-time password (OTP) to be sent to the user's registered email.

- **Endpoint**: `POST /auth/otp/request`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "string (valid email format)"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "An OTP has been sent to your email address."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the user is not found.

### 1.3. Login with Email and OTP

Logs in a user by verifying their email and the OTP they received.

- **Endpoint**: `POST /auth/login`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "string (valid email format)",
    "otp": "string (6-digit code)"
  }
  ```
- **Success Response (200 OK)**:
  - Returns a JWT access token for authenticating subsequent requests.
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the OTP is invalid or expired.

---

## 2. Wallet

Endpoints for accessing user-specific wallet information.

### 2.1. Get My Wallet Details

Retrieves the wallet information, balances, and total account value for the currently authenticated user.

- **Endpoint**: `GET /me/wallet`
- **Authentication**: **Required**. The request must include an `Authorization` header with the Bearer token from the login step.
  - `Authorization: Bearer <accessToken>`
- **Request Body**: None
- **Success Response (200 OK)**:
  ```json
  {
    "userId": "60d5f2f5c7b4f3b3a8c1d8e4",
    "walletId": "60d5f3a0c7b4f3b3a8c1d8e5",
    "sgcBalance": 10.5,
    "sgcOfficialPriceUsd": 115.0,
    "sgcValueUsd": 1207.5,
    "totalAccountValueUsd": 1207.5,
    "status": "ACTIVE"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: If the access token is missing or invalid.

---

## 3. Market Data

Public endpoints for retrieving market information.

### 3.1. Get SGC Price

Retrieves the current official price of the SGC token.

- **Endpoint**: `GET /market/sgc-price`
- **Authentication**: None
- **Request Body**: None
- **Success Response (200 OK)**:
  ```json
  {
    "symbol": "SGC",
    "priceUsd": 115.0,
    "lastUpdatedAt": "2025-11-16T18:00:00.000Z"
  }
  ```
