# Frontend Integration Guide: Redeem SGTrading USD

This feature allows users to bring USD funds **FROM** SGTrading **TO** SGChain using a Transfer Code.

## User Flow

1.  **User obtains a code:** The user goes to the **SGTrading** website/app, requests a withdrawal to SGChain, and receives a code (e.g., `SGT-USD-8X92-LM41`).
2.  **User enters code on SGChain:** The user logs into SGChain, goes to the **Wallet** or **Deposit** section, selects **"Redeem Transfer Code"**, and enters the code.
3.  **System processes:** SGChain verifies the code and instantly credits the user's USD wallet.

## API Endpoint

**URL:** `POST /api/me/redeem/sgtrading`
**Authentication:** Required (Bearer Token)

### Request Payload

```json
{
  "code": "SGT-USD-8X92-LM41" // The code provided by SGTrading
}
```

### Response (Success)

**Status:** `200 OK`

```json
{
  "status": "SUCCESS",
  "creditedUsdAmount": 150.00,
  "usdBalanceAfter": 1250.50
}
```

### Response (Error Examples)

**Status:** `400 Bad Request` or `500 Internal Server Error`

*   **Invalid Code:**
    ```json
    { "message": "SGTRADING_REDEEM_FAILED" } // Generic failure
    // OR specific error from service if exposed
    { "message": "INVALID_CODE" }
    ```
*   **Already Claimed:**
    ```json
    { "message": "CODE_ALREADY_CLAIMED" }
    ```

## UI Implementation Recommendations

1.  **Placement:**
    *   Add a "Redeem Code" button in the **Wallet Dashboard** or under the **Deposit** options.
    *   Since we also have "Sagenex" redemptions, you might want a generic "Redeem Transfer" input that detects the code format, or simply label the input "Enter Transfer Code".

2.  **Input Field:**
    *   Label: "Transfer Code"
    *   Placeholder: "e.g., SGT-USD-XXXX-XXXX"

3.  **Feedback:**
    *   Show a loading spinner while the API verifies the code (it connects to an external server, so it might take 1-2 seconds).
    *   On success, show a celebration modal or toast: "Successfully redeemed $150.00 USD!" and update the displayed Wallet Balance.

## Types (TypeScript)

```typescript
interface RedeemResponse {
  status: 'SUCCESS';
  creditedUsdAmount: number;
  usdBalanceAfter: number;
}

// Example Function
const redeemCode = async (code: string): Promise<RedeemResponse> => {
  const response = await api.post('/me/redeem/sgtrading', { code });
  return response.data;
};
```
