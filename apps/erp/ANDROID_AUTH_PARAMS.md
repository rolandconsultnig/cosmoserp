# Native Android App — Authentication Parameters

Reference for the Cosmos POS/ERP Android app (Capacitor) authentication: env, API endpoints, request/response shapes, and storage.

---

## 1. Build-time parameter (required for APK)

| Parameter        | Description |
|------------------|-------------|
| **`VITE_API_URL`** | Full base URL of your API **including** `/api`. Set when building the web assets so the APK talks to your server. |

**Examples:**

```bash
# Production
export VITE_API_URL="https://13.53.33.63/api"
# or with domain
export VITE_API_URL="https://api.yourcompany.com/api"
```

- No trailing slash.
- Must be the URL the **device** can reach (use server IP or public domain, not `localhost`).

---

## 2. API base URL used by the app

- **Web (browser):** If `VITE_API_URL` is not set, the app uses relative `/api` (same origin).
- **Android APK:** Must set `VITE_API_URL` at build time (see above). The app then uses that as `baseURL` for all requests (including auth).

---

## 3. Auth endpoints (all under `{baseURL}/auth`)

Base path: **`/api/auth`** (so full URL is `{VITE_API_URL}/auth/...` since `VITE_API_URL` already includes `/api`).

| Method | Endpoint           | Purpose |
|--------|--------------------|---------|
| POST   | `/auth/login`      | Log in (ERP/POS user). Returns `accessToken`, `refreshToken`, `user`. |
| POST   | `/auth/refresh`    | Get new access token using refresh token. |
| GET    | `/auth/me`         | Current user (requires `Authorization: Bearer <accessToken>`). |
| POST   | `/auth/logout`     | Log out (optional body: `{ refreshToken }`). Requires Bearer token. |

---

## 4. Login (ERP / POS user)

**Request**

- **URL:** `POST {baseURL}/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "email": "user@example.com",
  "password": "YourPassword"
}
```

**Success response (200)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "...",
    "lastName": "...",
    "role": "OWNER",
    "permissions": [],
    "tenant": {
      "id": "uuid",
      "businessName": "...",
      "tradingName": "...",
      "logoUrl": null,
      "kycStatus": "...",
      "subscriptionStatus": "...",
      "subscriptionPlan": null,
      "isActive": true
    }
  }
}
```

**Error responses**

- `400` — Missing email or password.
- `401` — Invalid email or password.
- `403` — Tenant suspended.

---

## 5. Refresh token

**Request**

- **URL:** `POST {baseURL}/auth/refresh`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "refreshToken": "<refreshToken from login>"
}
```

**Success response (200)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Use the new `accessToken` for subsequent `Authorization` headers.

---

## 6. Current user (me)

**Request**

- **URL:** `GET {baseURL}/auth/me`
- **Headers:** `Authorization: Bearer <accessToken>`

**Success response (200)**  
Same `user` object shape as in login (without tokens).

---

## 7. Logout

**Request**

- **URL:** `POST {baseURL}/auth/logout`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Body (optional):** `{ "refreshToken": "<refreshToken>" }`

---

## 8. Local storage (in-app)

The app uses `localStorage` (WebView) for tokens:

| Key            | Content |
|----------------|--------|
| **`accessToken`**  | JWT for API requests. Sent as `Authorization: Bearer <accessToken>`. |
| **`refreshToken`**| Used to call `/auth/refresh` when the access token expires. |

On logout or 401 after refresh failure, the app clears `localStorage` and redirects to login.

---

## 9. Summary for Android / backend

- **Android build:** Set `VITE_API_URL` to your API base including `/api` (e.g. `https://13.53.33.63/api`).
- **Login:** `POST /api/auth/login` with `{ email, password }` → store `accessToken` and `refreshToken`.
- **Authenticated requests:** Header `Authorization: Bearer <accessToken>`.
- **Refresh:** On 401 with `TOKEN_EXPIRED`, `POST /api/auth/refresh` with `{ refreshToken }` → replace `accessToken`.
- **User supply:** Users type email and password in the app; no credentials are hardcoded.
