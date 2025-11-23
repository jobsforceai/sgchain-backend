# SGChain Token Creation Backend - Implementation Plan

## 1. Overview
This document outlines the backend architecture, data models, and API specifications for the **SGChain Token Creation Service** (FunCoin & SuperCoin). This service manages the lifecycle of user-created tokens from draft configuration to on-chain deployment.

## 2. Directory Structure
We will introduce a new domain `src/token` to isolate this functionality:

```
src/
└── token/
    ├── controllers/
    │   └── tokenLaunch.controller.ts
    ├── models/
    │   └── TokenLaunch.model.ts
    ├── routes/
    │   └── token.routes.ts
    ├── services/
    │   └── tokenLaunch.service.ts
    └── validators/
        └── tokenLaunch.validator.ts
```

## 3. Data Model (MongoDB)

**Collection:** `TokenLaunch`

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique ID for the token project |
| `tier` | String | `'FUN'` or `'SUPER'` |
| `creatorUserId` | ObjectId | Reference to the User model |
| `creatorWalletAddress`| String | The user's EVM address on SGChain |
| `status` | String | `DRAFT`, `PENDING_ONCHAIN`, `DEPLOYED`, `FAILED`, `REJECTED` |
| `metadata` | Object | `{ name, symbol, decimals, logoUrl, description, website, socialLinks... }` |
| `supplyConfig` | Object | `{ totalSupply, maxSupply, isFixedSupply }` |
| `allocations` | Array | List of allocation categories (Team, Liquidity, etc.) and percentages |
| `vestingSchedules` | Array | List of vesting rules linked to allocations |
| `onchainData` | Object | `{ tokenAddress, txHash, networkId, deployedAt }` |
| `sgcForLiquidity` | String | For `SUPER` tier, the amount of SGC (in wei) provided by the user for liquidity. |

### Key Interfaces

```typescript
interface ITokenAllocation {
  id: string; // UUID
  category: 'CREATOR' | 'TEAM' | 'TREASURY' | 'COMMUNITY' | 'LIQUIDITY' | ...;
  percent: number; // 0-100
  amount: string; // Calculated BigInt string
  targetWalletAddress?: string; // For LIQUIDITY category, this should be ignored or set to address(0).
}

interface IVestingSchedule {
  id: string; // UUID
  allocationId?: string; // Links to allocation
  vestingType: 'IMMEDIATE' | 'CLIFF' | 'LINEAR' | 'CUSTOM';
  totalAmount: string;
  tgePercent: number;
  tgeTime: Date;
  cliffMonths?: number;
  linearReleaseFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  // ... custom tranches
}
```

## 4. API Endpoints

Base Path: `/api/tokens`

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | User | Create a new token draft. |
| `PUT` | `/:id` | User | Update an existing draft (only if status is `DRAFT`). |
| `GET` | `/:id` | User | Get full details of a specific token project. |
| `GET` | `/my-tokens` | User | List all tokens created by the current user. |
| `POST` | `/:id/submit` | User | **Core Action**: Finalize draft and trigger on-chain deployment. |

## 5. Blockchain Integration Specification

This is the critical integration point for the **Blockchain Backend Team**.
The backend will call the appropriate `sgchainClient` function when a user clicks "Create Coin".

**File:** `src/core/clients/sgchainClient.ts`

### Required Interfaces

The blockchain client must export functions matching these signatures:

```typescript
// For FUN tier tokens
export const createToken = async (params: CreateTokenOnChainParams): Promise<CreateTokenOnChainResult> => {
    // ... implementation calling the TokenFactory.createToken contract
}

// For SUPER tier tokens (with liquidity)
export const createTokenWithLiquidity = async (params: CreateTokenWithLiquidityOnChainParams): Promise<CreateTokenOnChainResult> => {
    // ... implementation calling the TokenFactory.createTokenWithLiquidity contract
}

export interface CreateTokenOnChainResult {
  tokenAddress: string;           // The deployed contract address
  txHash: string;                 // The transaction hash
}
```

## 6. Execution Flow
1. **Backend**: Validates user input (percentages sum to 100, etc.).
2. **Backend**: Sets status to `PENDING_ONCHAIN`.
3. **Backend**:
   - If `tier` is `FUN`, calls `sgchainClient.createToken(params)`.
   - If `tier` is `SUPER`, calculates `sgcAmountForLiquidity` and calls `sgchainClient.createTokenWithLiquidity(params)`.
4. **Blockchain Client**:
   * Connects to the **TokenFactory** contract using the Hot Wallet (admin).
   * **For `createTokenWithLiquidity`**:
     * First, executes an `approve` transaction on the SGC token contract, allowing the `TokenFactory` to spend the `sgcAmountForLiquidity`.
     * Waits for the `approve` transaction to be confirmed.
   * Executes the main deployment transaction (`createToken` or `createTokenWithLiquidity`).
   * Waits for confirmation.
   * Returns `tokenAddress` and `txHash`.
5. **Backend**:
    * Listens for both `TokenCreated` and `InitialLiquidityAdded` events for indexing.
    * Updates DB with `tokenAddress` and sets status to `DEPLOYED`.

## 7. DEX Liquidity Integration for SuperCoin (Backend Team Guide)

For `SUPER` tier tokens, the backend must use the new `createTokenWithLiquidity` flow. This automates the creation of a DEX trading pair for the new token against SGC.

### 1. New Parameter: `sgcAmountForLiquidity`
-   **Context:** The user pays a total amount in SGC. The backend calculates its fee and determines the remaining amount to be used for on-chain liquidity.
-   **Required Action:** The backend **must** pass this remaining amount as a new field, `sgcAmountForLiquidity`, when calling the blockchain client. This value should be in **wei** (as a string).

### 2. Mandatory `LIQUIDITY` Allocation
-   **Context:** The `TokenFactory` needs to know how many of the newly minted tokens to pair with the SGC.
-   **Required Action:** For all `SUPER` tier tokens, the `allocations` array **must** contain exactly one object where `category` is `LIQUIDITY`. The `beneficiary` for this allocation should be the zero address (`0x000...`) or null, as the factory will manage these tokens.

### 3. New Blockchain Client Interface
The `sgchainClient.ts` must expose a new function for this flow. The `sgcAmountForLiquidity` is not passed as a function argument, but rather as the `value` of the blockchain transaction itself.

```typescript
// In: src/core/clients/sgchainClient.ts

// Note: sgcAmountForLiquidity is handled via transaction options (msg.value)
export const createTokenWithLiquidity = async (params: CreateTokenOnChainParams, sgcAmountForLiquidity: string): Promise<CreateTokenOnChainResult> => {
    // 1. Get contract instance
    // 2. Call factory.createTokenWithLiquidity(params, { value: sgcAmountForLiquidity })
}
```

### 4. New Event for Indexing: `InitialLiquidityAdded`
-   **Context:** After a token is created and liquidity is added, a new event is emitted. The backend indexer should listen for this to confirm success and for analytics.
-   **Event Signature:** `InitialLiquidityAdded(address indexed token, address indexed weth, uint256 amountToken, uint256 amountSgc, uint256 lpTokens, address lpRecipient)`
-   **Required Action:** The indexer should watch for this event to get details about the newly created liquidity pool, such as the amount of LP tokens created and where they were sent (`lpRecipient`, which will be the `LiquidityLocker` contract).

---

## 8. Blockchain Integration Suggestions & Notes (for Backend Team)

**IMPORTANT:** The following adjustments are required to ensure compatibility with the deployed `TokenFactory` smart contract. The smart contract expects specific data types and units that differ slightly from the initial plan.

### 1. Data Types: `string (UUID)` vs. `bytes32`

-   **Issue:** The smart contract uses `bytes32` for all unique identifiers, not standard string UUIDs.
-   **Required Action:** The backend **must** convert the following fields into 32-byte hex strings before sending them to the `sgchainClient`:
    -   `backendLaunchId`
    -   `allocations[n].id`
    -   `vestingSchedules[n].id`
    -   `vestingSchedules[n].allocationId`
-   **Example (ethers.js):**
    ```javascript
    import { ethers } from "ethers";
    // For short, readable IDs (up to 31 chars)
    const idAsBytes32 = ethers.utils.formatBytes32String("my-unique-id-123"); 
    // For fully random IDs
    const randomIdAsBytes32 = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    ```

### 2. Numeric Units: Percentages vs. Basis Points

-   **Issue:** The smart contract handles percentages using basis points to avoid floating-point math. `1%` is represented as `100`, and `100%` is `10000`.
-   **Required Action:** The backend **must** multiply all percentage values by 100 before sending them.
    -   `allocations[n].percent`
    -   `vestingSchedules[n].tgePercent`
    -   `vestingSchedules[n].customTranches[m].percent`
-   **Example:** A 15.5% TGE release should be sent as the integer `1550`.

### 3. Vesting Durations vs. Timestamps

-   **Issue:** The contract's `VestingSchedule` struct requires absolute Unix timestamps (in seconds), not relative durations like "12 months".
-   **Required Action:** The backend must pre-calculate the final `cliffTime` and `endTime` Unix timestamps before calling the client. The `sgchainClient` should receive a specific date, not a duration to calculate.
-   **Example:**
    ```javascript
    const tgeTime = Math.floor(new Date('2024-12-01T00:00:00Z').getTime() / 1000);
    const cliffMonths = 6;
    const cliffTime = tgeTime + (cliffMonths * 30 * 24 * 60 * 60); // Approx.
    ```

### 4. Enumerations: `string` vs. `uint8`

-   **Issue:** The smart contract uses `enum` types, which are represented as integers (`0`, `1`, `2`, etc.).
-   **Required Action:** The backend should map its string representations to the corresponding integer value for the `tier`, `vestingType`, and `linearReleaseFrequency` fields.
    -   **TokenTier:** `FUN` -> `0`, `SUPER` -> `1`
    -   **TokenAllocationCategory:** `CREATOR` -> `0`, `TEAM` -> `1`, `TREASURY` -> `2`, `COMMUNITY` -> `3`, `LIQUIDITY` -> `4`, etc.
    -   **VestingType:** `IMMEDIATE` -> `0`, `CLIFF` -> `1`, `LINEAR` -> `2`, `CUSTOM` -> `3`
    -   **LinearReleaseFrequency:** `NONE` -> `0`, `DAILY` -> `1`, `WEEKLY` -> `2`, `MONTHLY` -> `3`

### Revised `CreateTokenOnChainParams` Interface

Based on the points above, the `sgchainClient.ts` interface should be updated to the following to ensure perfect alignment:

```typescript
// In: src/core/clients/sgchainClient.ts

export interface CreateTokenOnChainParams {
  backendLaunchId: string;        // MUST be a 32-byte hex string
  tier: number;                   // 0 for FUN, 1 for SUPER
  creatorWalletAddress: string;
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
  supplyConfig: {
    totalSupply: string;          // wei amount as string
    isFixedSupply: boolean;
  };
  allocations: {
    id: string;                   // MUST be a 32-byte hex string
    category: number;             // Mapped enum
    percent: number;              // MUST be in basis points (e.g., 100% = 10000)
    amount: string;               // wei amount as string
    beneficiary: string;
  }[];
  vestingSchedules: {
    id: string;                   // MUST be a 32-byte hex string
    allocationId: string;         // MUST be a 32-byte hex string
    vestingType: number;          // Mapped enum
    totalAmount: string;          // wei amount as string
    tgeTime: number;              // Unix timestamp (seconds)
    tgePercent: number;           // MUST be in basis points

    cliffTime: number;            // Unix timestamp (seconds)
    endTime: number;              // Unix timestamp (seconds)
    linearReleaseFrequency: number; // Mapped enum

    customTranches: {
      unlockTime: number;         // Unix timestamp (seconds)
      percent: number;            // MUST be in basis points
    }[];
  }[];
}
```