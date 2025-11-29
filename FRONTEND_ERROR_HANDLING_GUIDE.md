# SGChain Frontend Guide: Handling Rate Limits & Errors

This document explains how the frontend should handle API rate limits (HTTP 429) and other common errors to provide a smooth user experience.

## 1. Rate Limiting (HTTP 429)

To protect the server from abuse, the API limits the number of requests a user (IP address) can make within a certain timeframe.

*   **Status Code**: `429 Too Many Requests`
*   **Default Behavior**: If you exceed the limit, the server will block further requests for a short period (typically 15 minutes).

### Backend Response Format
When blocked, the backend returns a standard text or JSON response (default from `express-rate-limit`):
```json
"Too many requests, please try again later."
```
*(Note: We have recently increased this limit significantly for development, so you should see this less often.)*

### Frontend Implementation
You should implement a global error interceptor (e.g., in Axios) to catch this specific status code.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for Rate Limit Error
    if (error.response && error.response.status === 429) {
      // 1. Log the error
      console.warn('Rate limit exceeded. Slow down requests.');
      
      // 2. Show a user-friendly notification (Toast/Alert)
      // Example: showToast("You are making too many requests. Please wait a moment.");
      
      // 3. Optional: Implement retry logic with exponential backoff
      return Promise.reject(error);
    }

    // Handle other errors (401, 403, 500...)
    return Promise.reject(error);
  }
);
```

## 2. Common Error Responses

The backend generally follows this error structure for logic/validation failures:

```json
{
  "error": {
    "message": "SPECIFIC_ERROR_CODE", // e.g., "INSUFFICIENT_FUNDS"
    // ... optional extra details
  }
}
```

### How to Display
Instead of showing the raw code ("INSUFFICIENT_FUNDS"), map these codes to user-friendly messages in your UI.

| Error Code | User Message |
| :--- | :--- |
| `429 Too Many Requests` | "You're tapping too fast! Please wait a minute." |
| `INSUFFICIENT_FUNDS` | "Your wallet balance is too low for this transaction." |
| `INVALID_PIN` | "Incorrect PIN. Please try again." |
| `NO_FILE_UPLOADED` | "Please select a file to upload." |
| `FILE_UPLOAD_FAILED` | "Upload failed. Please try a smaller file or check your connection." |
| `500 Internal Server Error` | "Something went wrong on our end. Please try again later." |

## 3. Best Practices

1.  **Debounce Inputs**: Avoid sending a request on every keystroke (e.g., search bars). Wait for the user to stop typing for 500ms.
2.  **Disable Buttons**: When a form is submitting, disable the "Submit" button to prevent double-clicks.
3.  **Cache Data**: If data doesn't change often (like `getProfile` or `getKycStatus`), store it in a local state or cache (like React Query) instead of fetching it on every render.
