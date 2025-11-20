# SGChain "Redeem Sagenex Transfer" API Documentation

This document outlines the API endpoint for the Sagenex-to-SGChain transfer redemption flow.

**Base URL**: `/api`

---

## Flow Overview

1.  A user initiates a transfer on the Sagenex platform and receives a `transferCode` (a JWT).
2.  The user switches to the SGChain platform and enters this code.
3.  The SGChain frontend calls this backend endpoint with the code.
4.  The SGChain backend communicates with the Sagenex backend to verify the code and execute the transfer.
5.  If successful, the user's SGC wallet on SGChain is credited with the corresponding amount of SGC.

---

## 1. Redeem Sagenex Transfer Code

Redeems a `transferCode` obtained from Sagenex to credit the user's SGChain wallet.

- **Endpoint**: `POST /me/redeem-transfer`
- **Authentication**: **Required** (Standard User `accessToken`)
- **Request Body**:
  ```json
  {
    "transferCode": "string (the JWT provided by Sagenex)"
  }
  ```
- **Success Response (200 OK)**:
  - Indicates that the transfer was successful and the user's wallet has been credited.
  ```json
  {
    "status": "SUCCESS",
    "creditedSgcAmount": 0.44130435,
    "sgcBalanceAfter": 10.44130435
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If the `transferCode` is invalid, expired, or has already been used. The error message will be provided by the Sagenex API (e.g., `"Invalid or expired transfer code."`).
  - `401 Unauthorized`: If the user's access token is invalid.
  - `500 Internal Server Error`: If the SGC price is not available to perform the currency conversion.

