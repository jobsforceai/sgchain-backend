# SGChain Frontend Integration Guide: KYC Document Upload (Backend-Handled S3)

This document outlines the necessary changes and guidelines for the Frontend Team to integrate with the new KYC document upload API, where the backend now directly handles the file upload to AWS S3.

## 1. Overview of Changes

**Previously:** The frontend was expected to upload files to an external storage (like S3) and then send the public URL of that file to the backend.

**Now:** The frontend will send the actual file directly to the backend using `multipart/form-data`. The backend will then handle the secure upload to AWS S3 and save the resulting URL.

This change simplifies frontend logic by centralizing file storage responsibility on the backend and enhances security by preventing direct client-side S3 credential exposure.

---

## 2. API Endpoint for Document Upload

### `POST /api/me/kyc/upload`

-   **Authentication**: Requires a valid user JWT (`Bearer <token>`).
-   **Request Type**: `multipart/form-data`. This is crucial.
-   **Headers (Automatic with FormData):**
    -   `Authorization`: `Bearer <user_jwt_token>`
    -   `Content-Type`: `multipart/form-data; boundary=...` (This header is typically set automatically by your HTTP client when you pass a `FormData` object).

### Form Data Fields

The request body must be constructed as `FormData` and include the following fields:

| Field Name | Type | Description |
| :--------- | :--- | :---------- |
| `document` | `File` | **Required.** The actual file object (from an `<input type="file">`). Allowed types: `image/jpeg`, `image/png`, `application/pdf`. Max size: **5MB**. |
| `docType` | `String` | **Required.** The type of document being uploaded. Must be one of: `'AADHAAR_FRONT'`, `'AADHAAR_BACK'`, `'PAN'`, `'OTHER'`, `'LEGAL_AGREEMENT'`. |
| `region` | `String` | **Required.** The region for the KYC application. Currently supported: `'INDIA'`, `'DUBAI'`. |

### Response (201 Created)

Upon successful upload and processing, the backend will respond with:

```json
{
  "documentId": "65a3d4e5f6a7b8c9d0e1f2a3",
  "documentType": "NATIONAL_ID", // This might be a mapped type, e.g., AADHAAR_FRONT/BACK maps to NATIONAL_ID
  "url": "https://your-s3-bucket.s3.aws-region.amazonaws.com/kyc/user-id/uuid-filename.jpg"
}
```

---

## 3. Frontend Implementation Example (React with Axios)

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const KycUploadForm = ({ userId, authToken }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [region, setRegion] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !docType || !region) {
      setError('Please select a file, document type, and region.');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile); // The actual file
    formData.append('docType', docType);
    formData.append('region', region);

    try {
      const response = await axios.post(
        '/api/me/kyc/upload', // Adjust API base URL as needed
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            // 'Content-Type': 'multipart/form-data' is usually set automatically by Axios/fetch with FormData
          },
        }
      );
      setMessage(`Upload successful! Document ID: ${response.data.documentId}, URL: ${response.data.url}`);
      setError('');
      // Optionally, clear form or update parent state
    } catch (err) {
      console.error('Upload error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to upload document.');
      setMessage('');
    }
  };

  return (
    <div>
      <h2>Upload KYC Document</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>Region:</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Select Region</option>
          <option value="INDIA">INDIA</option>
          <option value="DUBAI">DUBAI</option>
        </select>
      </div>
      <div>
        <label>Document Type:</label>
        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
          <option value="">Select Type</option>
          <option value="AADHAAR_FRONT">AADHAAR_FRONT</option>
          <option value="AADHAAR_BACK">AADHAAR_BACK</option>
          <option value="PAN">PAN</option>
          <option value="OTHER">OTHER</option>
          <option value="LEGAL_AGREEMENT">LEGAL_AGREEMENT</option>
        </select>
      </div>
      <div>
        <input type="file" onChange={handleFileChange} />
      </div>
      <button onClick={handleUpload} disabled={!selectedFile || !docType || !region}>
        Upload Document
      </button>
    </div>
  );
};

export default KycUploadForm;
```

---

## 4. Error Handling

Be prepared to handle the following potential error responses from the backend:

*   **`400 Bad Request`**: e.g., `"INVALID_FILE_TYPE"`, `"NO_FILE_UPLOADED"`, `"INVALID_DOC_TYPE"`.
    *   Display user-friendly messages based on the error code.
*   **`409 Conflict`**: e.g., if the user's KYC status is already `VERIFIED` or `PENDING`.
*   **`500 Internal Server Error`**: e.g., `"FILE_UPLOAD_FAILED"` (due to S3 issues) or other unexpected server errors.

Ensure your UI provides clear feedback to the user about the success or failure of the upload, including specific reasons for errors.
