# SGChain Token Creation - Frontend Integration Guide

This document details the integration points for the new Token Creation feature (FunCoin & SuperCoin).

## 1. Overview

The token creation flow consists of two main steps:
1.  **Draft Creation/Editing**: Users configure their token (metadata, supply, allocations, vesting). This is saved as a draft.
2.  **Deployment**: Users pay the fee (in SGC) and trigger the on-chain deployment.

**Base URL**: `/api/tokens`

## 2. Data Structures (Types)

Use these TypeScript interfaces for your forms and state.

```typescript
// Enums
type TokenTier = 'FUN' | 'SUPER';
type AllocationCategory = 
  | 'CREATOR' | 'TEAM' | 'TREASURY' | 'COMMUNITY' | 'LIQUIDITY' 
  | 'ADVISORS' | 'MARKETING' | 'AIRDROP' | 'RESERVE' | 'OTHER';
type VestingType = 'IMMEDIATE' | 'CLIFF' | 'LINEAR' | 'CUSTOM';
type ReleaseFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface TokenAllocation {
  category: AllocationCategory;
  label?: string; // Optional label for 'OTHER'
  percent: number; // 0-100 (e.g., 15.5)
  targetWalletAddress?: string; // Optional, defaults to creator if empty
}

interface VestingSchedule {
  allocationCategory: AllocationCategory; // Links to the allocation above
  vestingType: VestingType;
  tgePercent: number; // % released at launch
  tgeTime: string; // ISO Date string (e.g., "2024-12-25T00:00:00Z")
  cliffMonths?: number; // For CLIFF/LINEAR
  linearReleaseFrequency?: ReleaseFrequency; // For LINEAR
  customTranches?: { unlockTime: string; percent: number }[]; // For CUSTOM
}

// Payload for Creation/Update
interface CreateTokenPayload {
  tier: TokenTier;
  metadata: {
    name: string;
    symbol: string;
    decimals?: number; // Default 18
    logoUrl?: string;
    description?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  supplyConfig: {
    totalSupply: string; // String for BigInt (e.g. "1000000")
    isFixedSupply: boolean; // Always true for now
  };
  allocations: TokenAllocation[];
  vestingSchedules?: VestingSchedule[];
}
```

## 3. API Endpoints & Usage

### A. List User's Tokens
Fetch all tokens (drafts + deployed) created by the current user.

*   **GET** `/api/tokens/my-tokens`
*   **Response**: `{ items: TokenLaunch[] }`

### B. Create Draft
Save the initial configuration.

*   **POST** `/api/tokens`
*   **Body**: `CreateTokenPayload`
*   **Validation Rules**:
    *   `allocations` must sum to exactly 100%.
    *   **SUPER Tier**:
        *   Must include exactly one allocation with `category: 'LIQUIDITY'`.
        *   `LIQUIDITY` allocation percent must be **at least 5%**.
    *   **Total Supply**:
        *   **Minimum (All Tiers)**: 1,000
        *   **FUN Tier Maximum**: 1,000,000 (1 Million)
        *   **SUPER Tier Maximum**: 1,000,000,000,000 (1 Trillion)
*   **Response**: Returns the created draft object (including `_id`).

### C. Update Draft
Save changes as the user edits the form. Only allowed if `status` is `DRAFT`.

*   **PUT** `/api/tokens/:id`
*   **Body**: Partial `CreateTokenPayload`
*   **Response**: Updated draft object.

### D. Get Token Details
Fetch full details for the preview screen.

*   **GET** `/api/tokens/:id`
*   **Response**: Full `TokenLaunch` object.

### E. Deploy Token (The "Create Coin" Button)
This is the final step. It triggers the payment and blockchain transaction.

*   **POST** `/api/tokens/:id/submit`
*   **Body**: `{}` (empty)
*   **Prerequisites**:
    *   User must have enough **SGC** in their wallet balance.
    *   **FunCoin Cost**: 1 SGC.
    *   **SuperCoin Cost**: 100 SGC.
        *   **10 SGC** is the Platform Fee.
        *   **90 SGC** is injected into the Liquidity Pool (Paired with the `LIQUIDITY` token allocation).
*   **Response**:
    ```json
    {
      "status": "DEPLOYED",
      "onchainData": {
        "tokenAddress": "0x...",
        "txHash": "0x...",
        "deployedAt": "..."
      },
      "sgcForLiquidity": "90000000000000000000" // (Wei amount, if SUPER)
    }
    ```
*   **Error Handling**:
    *   If response is `400` with "Insufficient SGC balance", prompt user to buy/deposit SGC.

## 4. Key Logic for Frontend

1.  **Allocations Sum**: Ensure your UI validates that `allocations` sum to 100% before submitting.
2.  **Vesting Linkage**: When adding a vesting schedule, the UI should let the user select which `Allocation Category` it applies to.
3.  **SuperCoin Liquidity**:
    *   If user selects **SUPER** tier, show a **read-only or fixed allocation row for 'LIQUIDITY'**.
    *   Inform the user that **100 SGC** will be deducted from their wallet.
    *   Clarify that **90 SGC** of this cost goes directly into the Liquidity Pool on the DEX.
4.  **Timestamps**: Send all dates (`tgeTime`, `unlockTime`) as **ISO Strings** (e.g., `new Date().toISOString()`).

## 5. Swap Integration (Backend-Custodial)

Swaps are executed by the **Backend** using the user's managed custodial wallet. The frontend does NOT interact with the blockchain directly for swaps.

### A. Get Quote (Estimate Output)
Use this endpoint to show the user how much they will receive before they confirm the swap.

*   **GET** `/api/swap/quote`
*   **Query Params**:
    *   `tokenIn`: Address of the input token (or `'SGC'` for native coin).
    *   `tokenOut`: Address of the output token (or `'SGC'`).
    *   `amountIn`: The amount to swap (Human readable string, e.g., "1.5").
*   **Response**:
    ```json
    {
      "amountOut": "1234.5678" // Estimated output amount (Human readable)
    }
    ```

### B. Execute Swap
This performs the actual on-chain swap. It requires the user's **Wallet Access Token** (obtained after PIN verification).

*   **POST** `/api/swap/execute`
*   **Headers**:
    *   `Authorization`: `Bearer <WALLET_ACCESS_TOKEN>` (This is the short-lived token from `/api/me/wallet/verify-pin`, NOT the standard user token).
*   **Body**:
    ```json
    {
      "tokenIn": "SGC",          // Address or 'SGC'
      "tokenOut": "0x...",       // Address or 'SGC'
      "amountIn": "1.5",         // Human readable amount
      "slippage": 0.5            // Max slippage percentage (default 0.5)
    }
    ```
*   **Response**:
    ```json
    {
      "status": "SUCCESS",
      "txHash": "0x...",
      "amountIn": "1.5",
      "tokenIn": "SGC",
      "tokenOut": "0x...",
      "expectedAmountOut": "...",
      "minAmountOut": "..."
    }
    ```

### Frontend Flow for Swapping:

1.  **Get Quote**: Call `GET /api/swap/quote` when the user enters an amount. Display the estimated output.
2.  **Verify PIN**: Prompt the user for their Wallet PIN. Call `POST /api/me/wallet/verify-pin` to get the `walletAccessToken`.
3.  **Execute**: Call `POST /api/swap/execute` using the `walletAccessToken` in the Authorization header.
4.  **Result**: Show success message with the Transaction Hash.
