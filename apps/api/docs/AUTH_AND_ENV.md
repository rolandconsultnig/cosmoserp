# Auth API & env for web and Android

## .env (API)

- **PORT**: Use **5133** when Nginx proxies `/api` to the API. Do **not** set PORT=80 (Nginx listens on 80).
- **DATABASE_URL**: PostgreSQL. Auth requires a **Tenant** (isActive) and a **User** linked to it; password must be a **bcrypt** hash.
- **JWT_SECRET / JWT_REFRESH_SECRET**: Use long random strings in production. Required for login/refresh tokens.
- **CORS**: Set `ERP_URL`, `MARKETPLACE_URL`, `ADMIN_URL`. For the **Android app**, set `API_PUBLIC_URL` to your public API base (e.g. `https://13.53.33.63`) so the API allows that origin; the app also allows requests with no `Origin` (e.g. Capacitor).

See `apps/api/.env.example` for a full template.

---

## Login (ERP / POS user)

**Request**

```bash
curl -X POST http://localhost:5133/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email","password":"your_password"}'
```

With Nginx on port 80:

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email","password":"your_password"}'
```

**Body**

```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Success response (200)**

```json
{
  "accessToken": "ey...",
  "refreshToken": "ey...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "...",
    "lastName": "...",
    "role": "OWNER",
    "permissions": [],
    "tenant": { "id": "...", "businessName": "...", "isActive": true, ... }
  }
}
```

---

## CORS & Nginx (Android / web)

- The API allows **Content-Type** and **Authorization** and methods GET, POST, PUT, PATCH, DELETE, OPTIONS.
- If the API is behind Nginx, Nginx does not strip these headers when proxying; the API still applies CORS.
- For the **Android app**, set `API_PUBLIC_URL` in the API `.env` to your public API base (e.g. `https://13.53.33.63`) so CORS allows that origin. Requests with no `Origin` (e.g. from Capacitor) are also allowed.

---

## Database requirement for login

For `POST /api/auth/login` to succeed:

1. A **Tenant** must exist with `isActive: true`.
2. A **User** must exist linked to that tenant, with `email` (case-insensitive) and `passwordHash` = **bcrypt** hash of the plain password.
3. Run `npm run db:seed` (in `apps/api`) to create seed tenants/users, or create them via your app/migrations.
