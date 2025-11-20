# SGChain Multi-Document KYC API Documentation

This document outlines the API endpoints for the user-facing multi-document KYC submission process.

**Base URL**: `/api`

---

## 1. KYC Flow Overview

The new KYC process is a multi-step flow designed for flexibility.

1.  **Upload Documents:** The user uploads individual documents (e.g., Passport, Selfie) one by one for a specific region (e.g., 'INDIA'). The application is in a `DRAFT` state during this phase.
2.  **Submit Application:** Once all required documents are uploaded, the user makes a final "submit" call. This locks the documents and moves the application status to `PENDING` for admin review.
3.  **Check Status:** The user can check the status of their application at any time to see if it's `DRAFT`, `PENDING`, `VERIFIED`, or `REJECTED`.

---

## 2. User KYC Endpoints

### 2.1. Upload a Document

Uploads a single KYC document for a specific region. If this is the first document for a region, it will automatically create a `DRAFT` application. If a document of the same type already exists, this will overwrite it.

- **Endpoint**: `POST /me/kyc/upload`
- **Authentication**: Required (Standard User `accessToken`)

#### Request Body

```json
{
  "region": "INDIA",
  "documentType": "NATIONAL_ID",
  "documentUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/national-id-front.jpg",
  "documentBackUrl": "https://s3.amazonaws.com/sgchain-docs/user-xyz/national-id-back.jpg"
}
```

| Field             | Type   | Required | Description                                                                                             |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `region`          | string | Yes      | The region for the KYC application. Enum: `INDIA`, `DUBAI`.                                             |
| `documentType`    | string | Yes      | The type of document. Enum: `PASSPORT`, `DRIVING_LICENSE`, `NATIONAL_ID`, `SELFIE`, `PROOF_OF_ADDRESS`. |
| `documentUrl`     | string | Yes      | A secure, public URL to the document image.                                                             |
| `documentBackUrl` | string | No       | A secure, public URL to the back of the document, if applicable.                                        |

#### Success Response (201 Created)

```json
{
  "documentId": "65a3d4e5f6a7b8c9d0e1f2a3",
  "documentType": "NATIONAL_ID"
}
```

### 2.2. Submit KYC Application for Review

Finalizes the application for a specific region and submits it for admin review. This can only be done when the application is in a `DRAFT` state.

- **Endpoint**: `POST /me/kyc/submit`
- **Authentication**: Required

#### Request Body

```json
{
  "region": "INDIA"
}
```

#### Success Response (202 Accepted)

```json
{
  "kycId": "65a3d3c2b1a0f9e8d7c6b5a4",
  "status": "PENDING"
}
```

#### Error Response (400 Bad Request)
*   If the application is not in `DRAFT` status (`NO_DRAFT_APPLICATION_FOUND`).
*   If a required document (e.g., `SELFIE`) is missing (`MISSING_REQUIRED_DOCUMENT: SELFIE`).

### 2.3. Get KYC Status

Retrieves the status of all KYC applications for the current user, along with a list of all documents they have uploaded for each application.

- **Endpoint**: `GET /me/kyc/status`
- **Authentication**: Required
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "_id": "65a3d3c2b1a0f9e8d7c6b5a4",
        "userId": "...",
        "region": "INDIA",
        "status": "PENDING",
        "submittedAt": "2025-11-19T14:00:00.000Z",
        "documents": [
          {
            "_id": "65a3d4e5f6a7b8c9d0e1f2a3",
            "region": "INDIA",
            "documentType": "NATIONAL_ID",
            "documentUrl": "https://...",
            "documentBackUrl": "https://..."
          },
          {
            "_id": "65a3d4f6a7b8c9d0e1f2a4b5",
            "region": "INDIA",
            "documentType": "SELFIE",
            "documentUrl": "https://..."
          }
        ]
      },
      {
        "_id": "65a3d2b1a0f9e8d7c6b5a3c2",
        "userId": "...",
        "region": "DUBAI",
        "status": "DRAFT",
        "documents": []
      }
    ]
  }
  ```
