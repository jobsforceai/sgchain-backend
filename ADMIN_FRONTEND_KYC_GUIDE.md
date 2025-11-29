# SGChain Admin Portal Frontend Integration Guide: KYC Management

This document provides a clear guide for the Admin Frontend Team to integrate the KYC Management features. This module allows admins to view pending KYC requests, inspect uploaded documents, and approve or reject applications.

## 1. Overview

The Admin Portal needs to provide an interface for:
1.  **Listing KYC Requests:** Showing all pending applications.
2.  **Reviewing Details:** Clicking into a request to see the user's info and their uploaded document images.
3.  **Taking Action:** Buttons to "Approve" or "Reject" the application.

---

## 2. API Endpoints

**Base URL**: `/api/admin`
**Authentication**: Requires an Admin JWT token with `SUPERADMIN` or `KYC_ADMIN` role.

### 2.1. List KYC Requests

Fetches a list of KYC applications filtered by status.

*   **Endpoint**: `GET /kyc/requests`
*   **Query Params**: `status` (Optional. Default: `PENDING`. Other values: `VERIFIED`, `REJECTED`)

#### Response (Example)
```json
{
  "items": [
    {
      "_id": "65a3d3c2b1a0f9e8d7c6b5a4", // Request ID
      "userId": "65a3d3c2b1a0f9e8d7c6b123",
      "region": "INDIA",
      "status": "PENDING",
      "submittedAt": "2025-11-29T10:00:00.000Z"
    },
    // ... more items
  ]
}
```

### 2.2. Get Request Details (View Documents)

Fetches the full details of a specific KYC request, including the user's profile info and the **URLs to their uploaded documents**.

*   **Endpoint**: `GET /kyc/requests/:id`

#### Response (Example)
```json
{
  "application": {
    "_id": "65a3d3c2b1a0f9e8d7c6b5a4",
    "region": "INDIA",
    "status": "PENDING",
    "submittedAt": "2025-11-29T10:00:00.000Z"
  },
  "user": {
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "documents": [
    {
      "documentType": "NATIONAL_ID",
      "documentUrl": "https://your-s3-bucket.s3.amazonaws.com/kyc/user123/aadhaar-front.jpg",
      "documentBackUrl": "https://your-s3-bucket.s3.amazonaws.com/kyc/user123/aadhaar-back.jpg" // Optional
    },
    {
      "documentType": "SELFIE",
      "documentUrl": "https://your-s3-bucket.s3.amazonaws.com/kyc/user123/selfie.jpg"
    }
  ]
}
```

**Frontend Implementation Tip:**
*   Display the `documents` array.
*   For each document, render an `<img>` tag or a "View Document" button using the `documentUrl` (and `documentBackUrl` if present).
*   These URLs are public (or pre-signed) and can be displayed directly in the browser.

### 2.3. Approve Request

Approves the KYC application.

*   **Endpoint**: `POST /kyc/requests/:id/approve`
*   **Body**:
    ```json
    {
      "adminNotes": "Documents verified successfully." // Optional
    }
    ```

### 2.4. Reject Request

Rejects the KYC application.

*   **Endpoint**: `POST /kyc/requests/:id/reject`
*   **Body**:
    ```json
    {
      "rejectionReason": "Blurry document", // Required
      "adminNotes": "Please re-upload a clear photo of your ID." // Optional internal note
    }
    ```

---

## 3. UI/UX Recommendations

1.  **Dashboard Table**: Create a table displaying the list of requests with columns: Date, User ID/Name, Region, Status, and an "Action" button.
2.  **Detail Modal/Page**: When clicking "Action" or the row:
    *   Show the User's Name and Email.
    *   Show the Region (e.g., INDIA).
    *   **Document Gallery**: Display the images side-by-side.
        *   *Label each image clearly* (e.g., "National ID (Front)", "Selfie").
        *   Allow clicking an image to zoom or open it in a new tab for better inspection.
3.  **Action Buttons**:
    *   **Approve**: Should show a confirmation dialog.
    *   **Reject**: Should open a modal asking for the `rejectionReason` (dropdown or text input) and optional `adminNotes`.

## 4. Error Handling

*   **404 Not Found**: If the request ID is invalid.
*   **400 Bad Request**: If trying to approve/reject a request that is not `PENDING`.
*   **500 Internal Server Error**: General backend failure.
