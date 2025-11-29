# SGChain Token Creation Guide: "FunCoin" vs "SuperCoin"

This document outlines the strict backend validation rules and data requirements for creating tokens. The frontend **must** adhere to these constraints to avoid `400 Bad Request` errors.

## 1. Coin Tiers & Supply Limits

| Feature | **FunCoin** (`FUN`) | **SuperCoin** (`SUPER`) |
| :--- | :--- | :--- |
| **Max Total Supply** | **1,000,000** (1 Million) | **1,000,000,000,000** (1 Trillion) |
| **Min Total Supply** | 1,000 | 1,000 |
| **Creation Cost** | **1 SGC** | **100 SGC** |
| **Cost Breakdown** | 1 SGC (Platform Fee) | 10 SGC (Platform Fee) + **90 SGC (Liquidity)** |
| **Liquidity Rule** | No strict requirement. | **MUST** have a Liquidity Allocation ≥ 5%. |

---

## 2. Allocation Rules (The "Pie Chart")

### General Rules (Both Tiers)
1.  **Sum**: The sum of all allocation percentages must equal **exactly 100%**.
2.  **Categories**: `CREATOR`, `TEAM`, `TREASURY`, `COMMUNITY`, `LIQUIDITY`, `ADVISORS`, `MARKETING`, `AIRDROP`, `RESERVE`, `OTHER`.

### 🚨 Specific Rules for "SuperCoin" (`SUPER`)
If the user selects **SuperCoin**:

1.  **Mandatory Liquidity**: You **must** include an allocation category `LIQUIDITY`.
2.  **Minimum Percent**: The `LIQUIDITY` percentage must be **at least 5%**.
    *   *Invalid Example:* Creator 100%, Liquidity 0% (Backend will reject).
    *   *Valid Example:* Creator 95%, Liquidity 5%.
3.  **Automatic Injection**: The **90 SGC** paid by the user during creation is automatically paired with this `LIQUIDITY` allocation on the DEX.

### Rules for "FunCoin" (`FUN`)
1.  **No Forced Liquidity**: You can have 100% allocated to `CREATOR` if desired.
2.  **Max Supply Cap**: Ensure the input field limits the supply to 1,000,000.

---

## 3. API Payload Example (Create Draft)

**Endpoint:** `POST /api/token/drafts`

### Valid "SuperCoin" Payload
```json
{
  "tier": "SUPER",
  "metadata": {
    "name": "Super Meme",
    "symbol": "MEME",
    "description": "To the moon",
    "decimals": 18
  },
  "supplyConfig": {
    "totalSupply": "1000000000", // 1 Billion
    "isFixedSupply": true
  },
  "allocations": [
    {
      "category": "CREATOR",
      "percent": 90,
      "targetWalletAddress": "0xUserWallet..."
    },
    {
      "category": "LIQUIDITY", // REQUIRED for SUPER
      "percent": 10,           // MUST be >= 5
      "targetWalletAddress": null // Backend handles this
    }
  ]
}
```

### Valid "FunCoin" Payload
```json
{
  "tier": "FUN",
  "metadata": { ... },
  "supplyConfig": {
    "totalSupply": "1000000" // MAX 1 Million
  },
  "allocations": [
    {
      "category": "CREATOR",
      "percent": 100
    }
  ]
}
```

## 4. Frontend UX Recommendations

1.  **Dynamic Validation**:
    *   If **SuperCoin** is selected, show a validation error if "Liquidity" < 5%.
    *   If **FunCoin** is selected, show a validation error if "Total Supply" > 1,000,000.
2.  **Cost Display**:
    *   **FunCoin**: Show "Cost: 1 SGC".
    *   **SuperCoin**: Show "Cost: 100 SGC (10 Fee + 90 Liquidity Pool)". This explains *why* it's more expensive.
