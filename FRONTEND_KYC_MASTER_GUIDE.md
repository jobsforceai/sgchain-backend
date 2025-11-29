# SGChain KYC Master Guide for Frontend

This document serves as the single source of truth for implementing the KYC flow on the frontend. It covers region-specific requirements, document mapping, and state management.

## 1. KYC States & Flow

The KYC application for a user (per region) can be in one of four states:

1.  **`DRAFT`**:
    *   **Meaning**: The user has started uploading documents but hasn't submitted yet.
    *   **Action**: User can upload/overwrite documents. User *must* click "Submit" to proceed.
    *   **Backend Check**: `submit` endpoint only works in this state (or `REJECTED`).

2.  **`PENDING`**:
    *   **Meaning**: User has submitted. Admin is reviewing.
    *   **Action**: Read-only. User cannot upload new documents or submit again.
    *   **UI**: Show a "Under Review" banner.

3.  **`VERIFIED`**:
    *   **Meaning**: Admin approved.
    *   **Action**: Success state. User has full access.
    *   **UI**: Show "Verified" badge.

4.  **`REJECTED`**:
    *   **Meaning**: Admin rejected the application (e.g., blurry photo).
    *   **Action**: **User can fix it.** The flow effectively returns to a "Draft-like" state. The user should see the `rejectionReason` (and optional `adminNotes`). They can re-upload specific documents and click "Submit" again.
    *   **UI**: Show "Rejected" banner with reason. Enable upload buttons again.

---

## 2. Region-Specific Requirements

### Region: `INDIA`

**Required Documents:**
1.  **National ID** (Aadhaar Card)
2.  **Selfie**

**Frontend `docType` Mapping:**

| UI Label | Send `docType` as... | Backend Maps to... | Notes |
| :--- | :--- | :--- | :--- |
| **Aadhaar Front** | `'AADHAAR_FRONT'` | `NATIONAL_ID` | Sets `documentUrl` |
| **Aadhaar Back** | `'AADHAAR_BACK'` | `NATIONAL_ID` | Sets `documentBackUrl` (on same doc) |
| **Selfie** | `'SELFIE'` | `SELFIE` | - |

**Submission Rule:**
*   Backend will fail with `MISSING_REQUIRED_DOCUMENT: NATIONAL_ID` if Aadhaar is missing.
*   Backend will fail with `MISSING_REQUIRED_DOCUMENT: SELFIE` if Selfie is missing.

### Region: `DUBAI`

**Required Documents:**
1.  **ID Proof** (Passport OR Emirates ID)
2.  **Selfie**

**Frontend `docType` Mapping:**

| UI Label | Send `docType` as... | Backend Maps to... | Notes |
| :--- | :--- | :--- | :--- |
| **Passport** | `'PASSPORT'` | `PASSPORT` | Preferred for Dubai |
| **Emirates ID** | `'NATIONAL_ID'` | `NATIONAL_ID` | Alternative to Passport |
| **Selfie** | `'SELFIE'` | `SELFIE` | - |

**Submission Rule:**
*   Backend will fail with `MISSING_REQUIRED_DOCUMENT: PASSPORT_OR_NATIONAL_ID` if neither is found.
*   Backend will fail with `MISSING_REQUIRED_DOCUMENT: SELFIE` if Selfie is missing.

---

## 3. Handling Resubmission (Rejection Flow)

When a user's status is `REJECTED`:

1.  **Display Reason**: Show `rejectionReason` from the `GET /me/kyc/status` response.
2.  **Unlock Uploads**: Allow the user to upload documents again.
    *   *Example:* If the admin said "Selfie is blurry", the user only needs to re-upload the Selfie. The Aadhaar/Passport stays in the DB.
3.  **Call Submit**: When the user clicks "Resubmit", call the same `POST /me/kyc/submit` endpoint.
    *   The backend will clear the rejection status and move it back to `PENDING`.

---

## 4. API Reference Summary

*   **Upload**: `POST /api/me/kyc/upload` (FormData: `document`, `docType`, `region`)
*   **Submit**: `POST /api/me/kyc/submit` (JSON: `{ "region": "INDIA" }`)
*   **Status**: `GET /api/me/kyc/status`

### Common Error Codes

| Error Code | Frontend Message |
| :--- | :--- |
| `NO_DRAFT_APPLICATION_FOUND` | "You cannot submit right now. Check if you are already pending or verified." |
| `MISSING_REQUIRED_DOCUMENT: NATIONAL_ID` | "Please upload your Aadhaar Card (Front) before submitting." |
| `MISSING_REQUIRED_DOCUMENT: SELFIE` | "Please upload a Selfie before submitting." |
| `MISSING_REQUIRED_DOCUMENT: PASSPORT_OR_NATIONAL_ID` | "Please upload your Passport or Emirates ID." |
