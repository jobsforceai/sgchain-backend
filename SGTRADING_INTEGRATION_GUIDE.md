# SGTrading Integration Guide: Reverse Transfer (USD)

This document outlines the integration required to support transferring USD from **SGTrading** to **SGChain**.

## Overview

The flow allows an SGTrading user to "withdraw" USD from SGTrading and "deposit" it into their SGChain wallet.

**Mechanism:** "Code Redemption"
1. **User on SGTrading:** Requests a withdrawal. SGTrading deducts the balance and generates a unique **Transfer Code** (e.g., `SGT-USD-12345`).
2. **User on SGChain:** Enters this code in the "Redeem" section.
3. **SGChain Backend:** Calls the **SGTrading Verification Endpoint**.
4. **SGTrading Backend:** Verifies the code is valid and unused, marks it as 'BURNED' (claimed), and returns the amount.
5. **SGChain Backend:** Credits the user's USD balance.

---

## SGTrading Requirements

The SGTrading team needs to implement the following endpoint to handle verification requests from SGChain.

### Endpoint: Verify and Burn Code

**URL:** `POST /internal/sgchain/verify-burn`
**Auth:** Bearer Token (Shared Secret: `SGTRADING_INTERNAL_SECRET`)

**Request Body (from SGChain):**
```json
{
  "code": "SGT-USD-8X92-LM41"
}
```

**Response (Success):**
```json
{
  "status": "SUCCESS",
  "amountUsd": 150.00,
  "sgTradingUserId": "user-uuid-on-sgtrading-platform"
}
```

**Response (Failure - Invalid/Used Code):**
```json
{
  "status": "FAILED",
  "error": "INVALID_CODE" // or "CODE_ALREADY_CLAIMED", "CODE_EXPIRED"
}
```

### Logic Checklist for SGTrading Team

1.  **Generate Code:**
    *   Create a UI for users to "Transfer to SGChain".
    *   Deduct USD balance immediately (or lock it).
    *   Generate a unique code.
    *   Store code with status `PENDING`.
2.  **Verify Endpoint:**
    *   Authenticate the request using the shared secret.
    *   Look up the code.
    *   Check if status is `PENDING`.
    *   **Atomic Update:** Mark status as `CLAIMED` (or `BURNED`) to prevent double-spending.
    *   Return the `amountUsd`.
3.  **Expiry (Optional but Recommended):**
    *   If a code is not claimed within X minutes, allow the user to refund it on SGTrading.

## SGChain Configuration

*   **API URL:** SGChain needs to know the base URL of the SGTrading internal API (e.g., `https://api.sgtrading.com/v1`).
*   **Secret:** Ensure `SGTRADING_INTERNAL_SECRET` matches on both sides.
