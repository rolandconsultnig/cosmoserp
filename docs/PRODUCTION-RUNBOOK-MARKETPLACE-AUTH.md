# Production Runbook: Fix Marketplace Auth (Register / Login 500)

Follow these steps **on the production server** to resolve 500 errors on `/api/marketplace/auth/register` and `/api/marketplace/auth/login`.

**Assumptions:** You have SSH access, repo path is `~/cosmoserp` (or `/root/cosmoserp`). Replace with your actual path if different.

---

## Step 1 — SSH into the server

```bash
ssh -i /path/to/your-key.pem ubuntu@13.53.33.63
# or: ssh root@13.53.33.63
```

---

## Step 2 — Go to the API directory

```bash
cd ~/cosmoserp/apps/api
# If you use root: cd /root/cosmoserp/apps/api
```

---

## Step 3 — Ensure `.env` exists and has required variables

```bash
# Create .env from example if it doesn't exist
test -f .env || cp .env.example .env

# Edit .env (use nano, vim, or your editor)
nano .env
```

**Required for marketplace auth (no 500):**

| Variable | Example / value | Notes |
|----------|-----------------|--------|
| `DATABASE_URL` | `postgresql://cosmos_user:Samolan123@localhost:5432/cosmos_db?schema=public` | Use your real DB user, password, and database name. |
| `JWT_SECRET` | Any long random string (e.g. from `openssl rand -base64 32`) | **Must be set.** If missing, register/login return 500. |
| `JWT_REFRESH_SECRET` | Any long random string | Required for ERP auth. |
| `JWT_EXPIRES_IN` | `7d` or `15m` | Token lifetime. |
| `PORT` | `5133` | API listens here; Nginx on :80 proxies `/api` to this port. |

**Optional for CORS (if the site is on a different host):**  
Set `ERP_URL`, `MARKETPLACE_URL`, `ADMIN_URL` to the public URL (e.g. `http://13.53.33.63` or `https://yourdomain.com`).

Save and exit (in nano: `Ctrl+O`, Enter, `Ctrl+X`).

---

## Step 4 — Verify required variables

```bash
grep -E "JWT_SECRET|DATABASE_URL|PORT" .env
```

You must see non-empty values for `JWT_SECRET`, `DATABASE_URL`, and `PORT=5133`. If any is missing or wrong, edit `.env` again.

---

## Step 5 — Run migrations (so `MarketplaceCustomer` table exists)

```bash
cd ~/cosmoserp/apps/api
npx prisma generate
npx prisma migrate deploy
```

If this fails, check `DATABASE_URL` and that PostgreSQL is running: `sudo systemctl status postgresql`.

---

## Step 6 — Restart the API so it picks up `.env`

```bash
pm2 restart cosmos-api --update-env
# If the process doesn't exist: pm2 start src/index.js --name cosmos-api
```

---

## Step 7 — Check API is running and responding

```bash
# Process should be "online"
pm2 list

# Health check (expect 200)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5133/health

# Optional: test register (should return 201 or 400/409, not 500)
curl -s -X POST http://127.0.0.1:5133/api/marketplace/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}' \
  -w "\nHTTP %{http_code}\n"
```

---

## Step 8 — If you still get 500, check logs

```bash
pm2 logs cosmos-api --lines 100
```

Look for lines like:

- `Marketplace register: JWT_SECRET is not set` → set `JWT_SECRET` in `.env` and restart (Step 6).
- `Marketplace customer register error:` / `Marketplace customer login error:` → the next line(s) show the real error (e.g. DB connection, table missing, Prisma error). Fix that (env, migrations, DB) and restart.

---

## Quick checklist

- [ ] `.env` has `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `PORT=5133`
- [ ] `npx prisma migrate deploy` ran successfully
- [ ] `pm2 restart cosmos-api --update-env` executed
- [ ] `pm2 list` shows `cosmos-api` **online**
- [ ] `curl http://127.0.0.1:5133/health` returns **200**
- [ ] Browser or `curl` to `/api/marketplace/auth/register` and `/api/marketplace/auth/login` return 2xx or 4xx, **not** 500

After these steps, marketplace register and login should work; if not, use Step 8 to fix the specific error from the logs.
