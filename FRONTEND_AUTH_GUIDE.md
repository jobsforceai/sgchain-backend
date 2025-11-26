# Frontend Authentication Integration Guide

This document details the changes to the authentication system. We have moved from a strictly "OTP-only" login to a **Password-based login** system, with OTPs reserved for "Forgot Password" or "Login via Code" scenarios.

## 1. Overview of Flows

### A. Standard Login (Primary)
Users should primarily log in using their **Email** and **Password**.
1. User enters Email and Password.
2. Frontend calls `POST /api/auth/login`.
3. System returns JWT.

### B. Forgot Password / Login via OTP (Recovery)
If a user forgets their password, they can choose "Login with Code" or "Forgot Password".
1. User enters Email.
2. Frontend calls `POST /api/auth/otp/request`.
3. User receives OTP via Email (SMTP).
4. User enters Email and OTP.
5. Frontend calls `POST /api/auth/login`.
6. System returns JWT.

---

## 2. API Reference

### Login Endpoint
**URL:** `POST /api/auth/login`

This endpoint now handles both authentication methods based on the payload provided.

#### Scenario A: Login with Password
Used for the standard login form.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "user_secure_password"
}
```

#### Scenario B: Login with OTP
Used after the user has requested an OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "accessToken": "eyJh...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

**Response (Error):**
```json
{
  "status": "error",
  "message": "Invalid email or password" // or "Invalid or expired OTP"
}
```

---

### Request OTP Endpoint
**URL:** `POST /api/auth/otp/request`

Trigger this when the user clicks "Forgot Password" or "Send Code".

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If a user with that email exists, an OTP has been sent."
}
```
*Note: The API always returns a success message to prevent email enumeration.*

---

### Registration Endpoint
**URL:** `POST /api/auth/register`

Ensure the registration form captures a password.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

---

## 3. Recommended UI/UX Updates

1.  **Login Screen**:
    *   **Input Fields**: Email, Password.
    *   **Primary Button**: "Log In" (Calls Login API with password).
    *   **Secondary Action**: "Forgot Password?" or "Login with Code".

2.  **Forgot Password / OTP Screen**:
    *   **Step 1**: Input Email -> Button "Send Code" (Calls Request OTP API).
    *   **Step 2**: Input OTP (6 digits) -> Button "Verify & Login" (Calls Login API with OTP).

3.  **Registration Screen**:
    *   Ensure the `password` field is present and validated (min 8 characters).
