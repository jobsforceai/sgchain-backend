# SGChain Transfer & Token Frontend Guide

This document covers the frontend integration for **Internal Transfers**, **External Transfers (SGTrading)**, and **Token Creation/Swapping**.

## 1. Transfer Features

### A. Internal Transfer (SGC -> SGC)
Send SGC to another user on the SGChain platform.

*   **Endpoint**: `POST /api/me/transfer/sgc`
*   **Auth**: Standard User Token (`Authorization: Bearer <token>`)
*   **Body**:
    ```json
    {
      "toEmail": "friend@example.com", // OR "toUserId": "..."
      "amountSgc": 10
    }
    ```
*   **Response**: `{ status: "SUCCESS", txHash: "...", ... }`
*   **History**: `GET /api/me/transfers/sgc`

### B. External Transfer (SGC -> SGTrading)
Transfer SGC value to the SGTrading platform (Stock/Forex/Crypto Trading). This generates a unique code for the user to redeem on the other site.

*   **Endpoint**: `POST /api/me/transfer/external`
*   **Auth**: Standard User Token
*   **Body**:
    ```json
    {
      "amountSgc": 50
    }
    ```
*   **Response**:
    ```json
    {
      "transferId": "651...",
      "code": "SGT-A1B2-C3D4",  // DISPLAY THIS TO THE USER
      "amountSgc": 50,
      "amountUsd": 60.50,       // Estimated Value
      "status": "PENDING_CLAIM"
    }
    ```
*   **Frontend Logic**:
    1.  Ask user for SGC amount.
    2.  Show estimated USD value (optional, can fetch price first).
    3.  Call endpoint.
    4.  **Display the `code` prominently** with a "Copy" button.
    5.  Instruct user: *"Go to SGTrading -> Deposit -> Redeem Code and paste this code."*
*   **History**: `GET /api/me/transfers/external`

---

## 2. Token Creation (FunCoin & SuperCoin)

Users can launch their own tokens. The flow is: **Draft -> Review (UI) -> Submit/Pay**.

### A. Config & Constants
*   **FunCoin Cost**: 1 SGC
*   **SuperCoin Cost**: 100 SGC (10 Fee + 90 Liquidity)
*   **Limits**:
    *   Min Supply: 1,000
    *   Max Supply (Fun): 1,000,000
    *   Max Supply (Super): 1 Trillion

### B. API Flow
1.  **Create Draft**: `POST /api/tokens`
    *   Sends initial form data. Returns `{ _id: "...", ... }`.
2.  **Update Draft**: `PUT /api/tokens/:id`
    *   Auto-save or step-by-step save.
3.  **Deploy**: `POST /api/tokens/:id/submit`
    *   **Triggers Payment**. Checks wallet balance.
    *   **Deploying...**: Show a spinner. This might take 5-10 seconds.
    *   **Success**: Returns `{ status: "DEPLOYED", onchainData: { tokenAddress: "..." } }`.
    *   **Redirect**: Send user to the Token Details page or Explorer.

*(See `FRONTEND_TOKEN_INTEGRATION.md` for full payload types)*

---

## 3. Swapping (DEX)

Users can swap SGC for other tokens (and vice-versa).

### Flow:
1.  **Quote**: `GET /api/swap/quote?tokenIn=SGC&tokenOut=0x...&amountIn=10`
    *   Show "You Receive: ~123 Tokens".
2.  **PIN Check**: Prompt for Wallet PIN.
    *   `POST /api/me/wallet/verify-pin` -> Returns `walletAccessToken`.
3.  **Execute**: `POST /api/swap/execute`
    *   **Header**: `Authorization: Bearer <walletAccessToken>`
    *   **Body**: `{ "tokenIn": "SGC", "tokenOut": "0x...", "amountIn": "10", "slippage": 0.5 }`
    *   Show Success/TxHash.

---

## 4. Wallet & Balance

Always refresh wallet data after any action (Transfer, Deploy, Swap).

*   **Get Wallet**: `GET /api/me/wallet`
    *   Returns: `sgcBalance`, `fiatBalanceUsd`, `sgcValueUsd`.
