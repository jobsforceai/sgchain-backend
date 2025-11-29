# SGChain Admin Portal Frontend Guide: Buy SGC Requests

This document guides the Admin Frontend Team on how to display and manage "Buy SGC" (Fiat Deposit) requests, specifically how to access the payment proof files uploaded by users.

## 1. List Buy Requests

Fetches a list of all fiat deposit requests.

*   **Endpoint**: `GET /api/admin/buy-sgc/requests`
*   **Query Params**: `status` (Optional. Default: All. Values: `PENDING`, `APPROVED`, `REJECTED`)

### Response (Example)

```json
{
  "items": [
    {
      "_id": "65a3d4e5f6a7b8c9d0e1f2a3",
      "userId": {
        "_id": "user123",
        "email": "user@example.com",
        "fullName": "John Doe"
      },
      "bankRegion": "INDIA",
      "fiatAmount": 5000,
      "fiatCurrency": "INR",
      "lockedSgcAmount": 42.5,
      "lockedSgcPriceUsd": 115.0,
      "paymentProofUrl": "https://your-s3-bucket.s3.ap-south-1.amazonaws.com/kyc/user123/uuid-proof.jpg",
      "status": "PENDING",
      "createdAt": "2025-11-29T12:00:00.000Z"
    }
  ]
}
```

## 2. Displaying Payment Proof

*   **Field**: `paymentProofUrl`
*   **Action**: In the admin table or detail view, display a "View Proof" button or thumbnail.
*   **Implementation**: This URL is a direct link to the file on AWS S3. You can open it in a new tab (`target="_blank"`) or display it in a modal.

## 3. Approving/Rejecting

The approval flow remains the same.

*   **Approve**: `POST /api/admin/buy-sgc/requests/:id/approve`
    *   Body: `{ "adminComment": "Verified receipt." }`
*   **Reject**: `POST /api/admin/buy-sgc/requests/:id/reject`
    *   Body: `{ "reason": "Invalid transaction ID." }`
