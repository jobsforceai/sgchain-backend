Below is a **clean, polished, production-ready API doc** (rewritten professionally) AND **frontend architecture + implementation guidelines** so your frontend team follows correct standards.

I’m giving you a **single unified document** you can directly forward to the team.

---

# ✅ **SGChain User API + Frontend Integration Guidelines (Final Draft)**

*Version 1.0 — Prepared for SGChain Frontend Team*

This document contains:

1. **Final SGChain User API Documentation**
2. **Frontend Best Practices, Patterns & Guidelines**
3. **Examples for API Consumption + UI/State Management**

---

# 1. **SGChain User API (Backend v1)**

Base URL:

```
/api
```

All responses are JSON.

---

# 1. Authentication API

## **1.1 Register User**

Creates a new SGChain account.

**POST** `/auth/register`
**Auth:** None

### Request

```json
{
  "fullName": "string",
  "email": "string",
  "password": "string"
}
```

### Success Response – 201

```json
{
  "_id": "string",
  "fullName": "Test User",
  "email": "test@example.com",
  "status": "ACTIVE",
  "createdAt": "2025-11-16T20:30:00.000Z",
  "updatedAt": "2025-11-16T20:30:00.000Z"
}
```

### Errors

* 400 – user already exists
* 422 – invalid email/password format

---

## **1.2 Request Login OTP**

Sends a 6-digit OTP to registered email.

**POST** `/auth/otp/request`
**Auth:** None

### Request

```json
{ "email": "user@example.com" }
```

### Response – 200

```json
{ "message": "An OTP has been sent to your email." }
```

### Errors

* 400 – no user found

---

## **1.3 Login Using OTP**

Verifies OTP and returns JWT token.

**POST** `/auth/login`
**Auth:** None

### Request

```json
{
  "email": "string",
  "otp": "string"
}
```

### Success Response — 200

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Errors

* 400 – OTP invalid or expired

---

# 2. Wallet API

## **2.1 Get My Wallet**

Returns SGChain wallet balance & value.

**GET** `/me/wallet`
**Auth:** Bearer token required
Headers:

```
Authorization: Bearer <accessToken>
```

### Response — 200

```json
{
  "userId": "string",
  "walletId": "string",
  "sgcBalance": 10.5,
  "sgcOfficialPriceUsd": 115.0,
  "sgcValueUsd": 1207.5,
  "totalAccountValueUsd": 1207.5,
  "status": "ACTIVE"
}
```

### Errors

* 401 – Missing or invalid token

---

# 3. Market API

## **3.1 Get SGC Price**

Fetches official price from admin dashboard.

**GET** `/market/sgc-price`
**Auth:** None

### Response — 200

```json
{
  "symbol": "SGC",
  "priceUsd": 115.0,
  "lastUpdatedAt": "2025-11-16T18:00:00.000Z"
}
```

---

# ✅ 2. FRONTEND GUIDELINES (VERY IMPORTANT)

Your backend is now clean and separated.
To avoid future issues, follow these **frontend rules** across all SGChain apps (Next.js recommended).

---

# 2.1 **Authentication & Session Management**

### ✔ Use `localStorage` ONLY for the JWT token:

Key name:

```
sgchain_access_token
```

### ✔ Store user session in global state (Zustand recommended)

Example shape:

```ts
interface AuthState {
  token: string | null;
  user: { id: string; fullName: string; email: string } | null;
  setToken: (t: string) => void;
  setUser: (u: any) => void;
  logout: () => void;
}
```

### ✔ Automatically attach token using Axios interceptor

```ts
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("sgchain_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

# 2.2 **Frontend API Layer (Never call APIs directly inside components)**

Create:

```
src/services/auth.service.ts
src/services/wallet.service.ts
src/services/market.service.ts
```

Example: wallet service

```ts
export const getMyWallet = () =>
  axios.get("/api/me/wallet").then(res => res.data);
```

This keeps UI clean and makes error handling uniform.

---

# 2.3 **UI/UX Requirements (Official SGChain Standards)**

### ✔ Loading states

Use skeleton loaders for:

* Dashboard main balance
* Market price widget
* Wallet card

### ✔ Error states

Every API should have:

```
toast.error("Something went wrong. Please try again.");
```

### ✔ Auto refresh strategy

Wallet should refresh:

* On login
* Every 10 seconds
* After any SGC buy / sell (future)

### ✔ Responsive design

Target:

* Mobile first
* Works perfectly on iPhone and low-end Android
* Tablet layout for exchanges

### ✔ Reusable UI components

Create:

```
<SGCButton>
<SGCInput>
<SGCCard>
<SGCPriceTag>
<SGCBalanceCard>
```

---

# 2.4 Error Handling (Frontend)

Every API call must catch:

* 400 → show specific message
* 401 → logout user + redirect to login
* 500 → toast generic error

Template:

```ts
try {
  const data = await getMyWallet();
  setWallet(data);
} catch (err: any) {
  if (err.response?.status === 401) logout();
  else toast.error(err.response?.data?.error || "Unexpected error");
}
```

---

# 2.5 **State Management Rules**

### ✔ Separate stores:

```
auth.store.ts
wallet.store.ts
market.store.ts
```

### ✔ Do not mix wallet state with auth state.

Wallet is refreshable; auth is static.

### ✔ Use React Query ONLY for market price & live data

Wallet is foundational → use Zustand.
Price can use React Query polling:

```ts
useQuery(["sgc-price"], getPrice, { refetchInterval: 8000 });
```

---

# 2.6 Routing (Next.js)

Public pages:

```
/login
/register
/otp
/market
```

Protected pages:

```
/dashboard
/wallet
/profile
```

Protect routes using middleware:

`middleware.ts`

```ts
export function middleware(req) {
  const token = req.cookies.get("sgchain_access_token");
  if (!token) return NextResponse.redirect("/login");
}
```

---

# 2.7 Folder Structure (recommended)

```
src/
  components/
  services/
  stores/
  pages/
  hooks/
  utils/
  layouts/
  styles/
```

---

# 2.8 Cache Strategy

* Wallet: **No cache**. Always fetch fresh.
* Market price: Cache for 8 sec.
* User profile: Cache for session only.

---

# 2.9 Security Guidelines

* **Never store password or OTP in state or logs**
* **Always clear sensitive state on logout**
* **Rate-limit OTP requests** (backend already handles)
* **Frontend must validate email + OTP format** before calling backend

---

# 2.10 UI Flow Guidelines

### Registration flow

1. Ask name/email/password
2. Show success → redirect to login

### Login flow

1. Enter email
2. Request OTP
3. Enter OTP
4. Receive token
5. Redirect to dashboard

### Wallet dashboard

* Show:

  * SGC balance
  * USD equivalent
  * Latest price
* Button: **Buy / Sell (coming soon)**
* Button: Refresh

---

# 3️⃣ EXAMPLE: FRONTEND IMPLEMENTATION QUICK START

## services/auth.service.ts

```ts
import axios from "axios";

export const loginWithOtp = (email, otp) =>
  axios.post("/api/auth/login", { email, otp }).then(res => res.data);

export const requestOtp = (email) =>
  axios.post("/api/auth/otp/request", { email }).then(res => res.data);
```

## store/auth.store.ts

```ts
import { create } from "zustand";

const useAuthStore = create(set => ({
  token: null,
  user: null,
  setToken: token => set({ token }),
  setUser: user => set({ user }),
  logout: () => set({ token: null, user: null })
}));

export default useAuthStore;
```

## services/wallet.service.ts

```ts
export const fetchWallet = () => 
  axios.get("/api/me/wallet").then(r => r.data);
```

---

# 🎉 FINAL NOTE

This is now a **production-grade combined doc**:

* Solid backend API documentation
* Strong frontend standards
* Clean folder structure
* UI/UX expectations
* Security practices
* Example code

Your team can use this to build the SGChain frontend with **zero confusion**.

