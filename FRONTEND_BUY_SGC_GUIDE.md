# SGChain Frontend Integration Guide: Buy SGC (Backend-Handled Upload)

This document outlines the necessary changes and guidelines for the Frontend Team to integrate with the updated "Buy SGC" (Bank Deposit) API, which now handles the payment proof upload via the backend to AWS S3.

## 1. Overview of Changes

**Previously:** The frontend was expected to upload the payment proof to S3 and send a `paymentProofUrl` string to the backend.

**Now:** The frontend will send the actual file (`paymentProof`) directly to the backend using `multipart/form-data`. The backend handles the S3 upload securely.

---

## 2. API Endpoint

### `POST /api/me/buy-sgc`

Initiates a request to buy SGC after the user has performed a bank transfer.

-   **Authentication**: Requires a valid user JWT (`Bearer <token>`).
-   **Request Type**: `multipart/form-data`.

### Form Data Fields

The request body must be constructed as `FormData` and include the following fields:

| Field Name | Type | Required | Description |
| :--------- | :--- | :------- | :---------- |
| `paymentProof` | `File` | **Yes** | The proof of payment image/PDF (Max 5MB). |
| `bankRegion` | `String` | **Yes** | e.g., `'INDIA'`, `'DUBAI'`. |
| `fiatAmount` | `Number` | **Yes** | The amount sent (e.g., `5000`). |
| `fiatCurrency` | `String` | **Yes** | The currency sent (e.g., `'INR'`, `'AED'`). |
| `referenceNote` | `String` | No | Optional reference ID or note. |

### Response (201 Created)

```json
{
  "status": "PENDING",
  "requestId": "65a3d4e5f6a7b8c9d0e1f2a3",
  "lockedSgcAmount": 10.5,
  "lockedSgcPriceUsd": 115.0,
  "paymentProofUrl": "https://s3-bucket-url.com/kyc/user123/uuid-proof.jpg"
}
```

---

## 3. Frontend Implementation Example (React)

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const BuySgcForm = ({ authToken }) => {
  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState('');
  const [region, setRegion] = useState('INDIA');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('paymentProof', file);
    formData.append('fiatAmount', amount);
    formData.append('fiatCurrency', region === 'INDIA' ? 'INR' : 'AED');
    formData.append('bankRegion', region);

    try {
      const res = await axios.post('/api/me/buy-sgc', formData, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      alert(`Request Submitted! SGC Locked: ${res.data.lockedSgcAmount}`);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
      <select value={region} onChange={e => setRegion(e.target.value)}>
        <option value="INDIA">India (INR)</option>
        <option value="DUBAI">Dubai (AED)</option>
      </select>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleSubmit}>Submit Payment Proof</button>
    </div>
  );
};
```
