# CosmosERP ΓÇö Production Server Setup (Ubuntu)

Step-by-step configuration manual for running CosmosERP on **Ubuntu** with **Nginx**, **PostgreSQL**, and **Node.js**.  
Server IP used in this guide: **13.53.33.62** (replace with your EC2/public IP if different).

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Access](#2-server-access)
3. [Install System Dependencies](#3-install-system-dependencies)
4. [Install and Configure PostgreSQL](#4-install-and-configure-postgresql)
5. [Install Node.js](#5-install-nodejs)
6. [Install Redis](#6-install-redis)
7. [Clone Repository and Install Dependencies](#7-clone-repository-and-install-dependencies)
8. [Environment Variables (.env)](#8-environment-variables-env)
9. [Database Migrations and Seed](#9-database-migrations-and-seed)
10. [Build Frontend Apps](#10-build-frontend-apps)
11. [Run API with PM2](#11-run-api-with-pm2)
12. [Application Ports Reference](#12-application-ports-reference)
13. [Install and Configure Nginx](#13-install-and-configure-nginx)
14. [SSL (Optional) with Let's Encrypt](#14-ssl-optional-with-lets-encrypt)
15. [Verification and URLs](#15-verification-and-urls)

---

## 1. Prerequisites

- Ubuntu Server 22.04 LTS (or 20.04).
- Root or sudo access.
- EC2 Security Group (or firewall) allowing:
  - **22** (SSH)
  - **80** (HTTP)
  - **443** (HTTPS, if using SSL)

---

## 2. Server Access

From your machine (use your key path and IP):

```bash
ssh -i /path/to/your-key.pem ubuntu@13.53.33.62
```

---

## 3. Install System Dependencies

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git build-essential
```

---

## 4. Install and Configure PostgreSQL

### 4.1 Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4.2 Create Database and User (Production Values)

The production server uses the following database details:

| Item     | Value        |
|----------|--------------|
| User     | `cosmos_user` |
| Password | `Samolan123`  |
| Database | `cosmos_db`   |

If you are setting up a new server to match production, switch to the `postgres` user and run:

```bash
sudo -u postgres psql
```

Then run (using the production credentials above):

```sql
CREATE USER cosmos_user WITH PASSWORD 'Samolan123';
CREATE DATABASE cosmos_db OWNER cosmos_user;
GRANT ALL PRIVILEGES ON DATABASE cosmos_db TO cosmos_user;
\c cosmos_db
GRANT ALL ON SCHEMA public TO cosmos_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO cosmos_user;
\q
```

If the database and user are already created on the server, skip to [Section 4.3](#43-allow-local-connections-optional-for-same-server-api).

### 4.3 Allow Local Connections (optional, for same-server API)

If the API runs on the same server, default `localhost` connection is already allowed. To confirm or edit:

```bash
sudo nano /etc/postgresql/14/postgresql.conf
```

Ensure you have (or add):

```
listen_addresses = 'localhost'
```

If your PostgreSQL version is not 14, adjust the path (e.g. `.../15/...`). Then restart:

```bash
sudo systemctl restart postgresql
```

---

## 5. Install Node.js

Use Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x.x
npm -v
```

---

## 6. Install Redis

The API uses Redis for sessions/queues. Install and enable it:

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping   # should reply PONG
```

---

## 7. Clone Repository and Install Dependencies

Use the path where you clone the repo (e.g. `/home/ubuntu` for user `ubuntu`, or `/root` if you are root). This guide uses `$COSMOS_ROOT` for that path; replace it with your actual path (e.g. `/home/ubuntu/cosmoserp` or `/root/cosmoserp`).

```bash
cd /home/ubuntu   # or: cd /root
git clone https://github.com/rolandconsultnig/cosmoserp.git
cd cosmoserp
npm install
```

**Note:** If you cloned as `root`, use `/root/cosmoserp` everywhere below instead of `/home/ubuntu/cosmoserp`.

---

## 8. Environment Variables (.env)

Create and edit the API environment file:

```bash
cd /home/ubuntu/cosmoserp/apps/api
cp .env.example .env
nano .env
```

### 8.1 Generate JWT and encryption secrets (production)

The API reads **JWT_SECRET**, **JWT_REFRESH_SECRET**, and **ENCRYPTION_KEY** from `.env`. Generate strong values on the server and paste them into `.env`. Do not use the placeholder strings in production.

**Generate a 256-bit (32-byte) secret (for JWT_SECRET or ENCRYPTION_KEY):**

```bash
openssl rand -base64 32
```

Example output: `bDevpMGiu/ygVlQagxKB98nrNqdfdVomHezu1Hf4HwA=`

**Generate a longer secret (for JWT_REFRESH_SECRET):**

```bash
openssl rand -base64 64
```

Example output: `C33+bEM0KxQy2NdNE5iADuEuj87kIdFcVBBWypcafvU17ixjB1cYjgtAJ7syfzQw...`

**Generate in hex (32 bytes) if you prefer no special characters in .env:**

```bash
openssl rand -hex 32
```

Example output: `010ac98674c75d1bfd1d1bf01954d6be63a1a4c23348639c19e2f43ce227828b`

Use the first command once for **JWT_SECRET**, once for **ENCRYPTION_KEY** (must be exactly 32 bytes; base64 gives 44 chars that decode to 32 bytes). Use the second command for **JWT_REFRESH_SECRET**. Put each value in `.env` with no quotes (or wrap in double quotes if the value contains spaces).

**Note:** The API uses `.env` and `process.env` only (e.g. `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`). It does not use a separate `config.js` with `ACCESS_TOKEN_SECRET` or `DB_HOST`/`DB_PORT`; keep using the variable names in the `.env` block below.

### 8.2 Full `.env` content

Replace placeholders as needed:

- **Database**: Production uses `cosmos_user` / `Samolan123` / `cosmos_db` (see [Section 4.2](#42-create-database-and-user-production-values)).
- **JWT / Encryption**: Use the values you generated in [Section 8.1](#81-generate-jwt-and-encryption-secrets-production).
- **Paystack, NRS, email, etc.**: Replace with real or placeholder values as needed.

**Full `.env` content for production (server IP 13.53.33.62, production DB):**

```env
# Server
NODE_ENV=production
PORT=5133
API_URL=http://13.53.33.62

# Database (PostgreSQL ΓÇö production: cosmos_user / cosmos_db)
DATABASE_URL=postgresql://cosmos_user:Samolan123@localhost:5432/cosmos_db

# Redis (local)
REDIS_URL=redis://localhost:6379

# JWT (use values from: openssl rand -base64 32 and openssl rand -base64 64)
JWT_SECRET=bDevpMGiu/ygVlQagxKB98nrNqdfdVomHezu1Hf4HwA=
JWT_REFRESH_SECRET=C33+bEM0KxQy2NdNE5iADuEuj87kIdFcVBBWypcafvU17ixjB1cYjgtAJ7syfzQw
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (32 bytes; use: openssl rand -base64 32 or openssl rand -hex 32)
ENCRYPTION_KEY=010ac98674c75d1bfd1d1bf01954d6be63a1a4c23348639c19e2f43ce227828b

# NRS/FIRS API (Nigerian Revenue Service)
NRS_API_URL=https://api.nrs.gov.ng/einvoicing/v1
NRS_API_KEY=your-nrs-api-key
NRS_SANDBOX_URL=https://sandbox.nrs.gov.ng/einvoicing/v1

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public

# Flutterwave
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your-key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your-key

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@cosmoserp.ng

# GIG Logistics
GIG_API_URL=https://api.giglogistics.com/v1
GIG_API_KEY=your-gig-api-key

# Kobo360
KOBO360_API_URL=https://api.kobo360.com/v1
KOBO360_API_KEY=your-kobo360-api-key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Platform Commission
MARKETPLACE_COMMISSION_RATE=0.05

# Super Admin (change password after first login)
SUPER_ADMIN_EMAIL=admin@rolandconsult.ng
SUPER_ADMIN_PASSWORD=ChangeMeImmediately!
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 9. Database Migrations and Seed

From `apps/api`:

```bash
cd /home/ubuntu/cosmoserp/apps/api
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
```

If `migrate deploy` or `seed` fails, check `DATABASE_URL` and PostgreSQL user permissions.

---

## 10. Build Frontend Apps

Build all three frontends so Nginx can serve static files. Replace `/home/ubuntu/cosmoserp` with your actual repo path (e.g. `/root/cosmoserp` if you cloned as root).

**Option A ΓÇö build all from repo root (recommended):**

```bash
cd /home/ubuntu/cosmoserp   # or: cd /root/cosmoserp
npm run build
```

**Option B ΓÇö build each app separately:**

### 10.1 Marketplace (primary at `/`)

Marketplace is the primary app at the site root. Repo has `base: '/'` and no basename.

```bash
cd /home/ubuntu/cosmoserp/apps/marketplace   # or: cd /root/cosmoserp/apps/marketplace
npm run build
```

### 10.2 Admin (served at `/admin`)

```bash
cd /home/ubuntu/cosmoserp/apps/admin   # or: cd /root/cosmoserp/apps/admin
npm run build
```

### 10.3 ERP (served at `/erp`)

```bash
cd /home/ubuntu/cosmoserp/apps/erp   # or: cd /root/cosmoserp/apps/erp
npm run build
```

Build outputs:

- `apps/erp/dist`
- `apps/admin/dist`
- `apps/marketplace/dist`

---

## 11. Run API with PM2

Install PM2 and start the API so it restarts on reboot:

```bash
sudo npm install -g pm2
cd /home/ubuntu/cosmoserp/apps/api
pm2 start src/index.js --name cosmos-api
pm2 save
pm2 startup
# Run the command that pm2 startup prints (sudo env PATH=...)
```

Check:

```bash
pm2 status
pm2 logs cosmos-api
```

API will listen on **5133** (from `PORT=5133` in `.env`).

---

## 12. Application Ports Reference

All ports used by Cosmos ERP:

| Port  | Service              | Where / Purpose |
|-------|----------------------|------------------|
| **80**   | Nginx (HTTP)         | Public — browser traffic; Nginx serves frontends and proxies `/api` to 5133 |
| **443**  | Nginx (HTTPS)        | Public — if you enable SSL with Let's Encrypt |
| **22**   | SSH                  | Server access |
| **5133** | Cosmos ERP API       | **Internal only** — Node.js API; set `PORT=5133` in `apps/api/.env`. Nginx proxies `location /api` to `http://127.0.0.1:5133` |
| 3060  | ERP (dev only)       | Local dev — `npm run dev` in `apps/erp` |
| 5173  | Marketplace (dev)    | Local dev — `apps/marketplace` |
| 5175  | Admin (dev)          | Local dev — `apps/admin` |
| 5000  | API (dev default)    | Fallback if `PORT` is not set in API |
| 6379  | Redis (optional)     | Local — cache/sessions if used |

**Firewall (UFW):** open only **22**, **80**, and **443** to the internet. Do **not** expose **5133**; Nginx is the only public entry.

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

On **AWS EC2**, open the same ports (22, 80, 443) in the instance **Security Group** inbound rules.

---

## 13. Install and Configure Nginx

### 13.1 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 13.2 Create Nginx Configuration

Create a new site config (replace `13.53.33.62` with your domain if you use one later):

```bash
sudo nano /etc/nginx/sites-available/cosmoserp
```

Paste the configuration below. It assumes:

- **Marketplace** (primary) at `http://13.53.33.62/`
- **Admin** at `http://13.53.33.62/admin`
- **ERP** at `http://13.53.33.62/erp`
- **API** at `http://13.53.33.62/api` (proxied to `localhost:5133`). Replace `/home/ubuntu/cosmoserp` with your repo path (e.g. `/root/cosmoserp`).

**Nginx configuration:**  
Set `root`/`alias` to your repo path (e.g. `/root/cosmoserp` if you cloned as root). The API must be running on **port 5133** (set `PORT=5133` in `apps/api/.env`).

```nginx
# CosmosERP — Production
# Ports: 80 (this server), 5133 (API — internal only, proxied below)
# Replace 13.53.33.62 with your server IP or domain

server {
    listen 80;
    listen [::]:80;
    server_name 13.53.33.62;

    root /home/ubuntu/cosmoserp/apps/marketplace/dist;
    index index.html;

    # Proxy /api to Node.js API (must listen on 5133)
    location /api {
        proxy_pass http://127.0.0.1:5133;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Admin app
    location /admin {
        alias /home/ubuntu/cosmoserp/apps/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
        index index.html;
    }

    # ERP app
    location /erp {
        alias /home/ubuntu/cosmoserp/apps/erp/dist/;
        try_files $uri $uri/ /erp/index.html;
        index index.html;
    }

    # Marketplace (primary at /)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: restrict upload size for API
    client_max_body_size 10M;
}
```

Save and exit.

### 13.3 Enable Site and Reload Nginx

```bash
sudo ln -sf /etc/nginx/sites-available/cosmoserp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 13.4 Alternative: Nginx proxying to app ports (port 80 → 5173, 3060, 5175, 5133)

If you want Nginx on port 80 to **proxy** to the running app ports instead of serving static `dist` files, use the config in the repo:

| Nginx path | Proxies to |
|------------|-------------|
| `http://host/` | **5173** (Marketplace) |
| `http://host/erp` | **3060** (ERP) |
| `http://host/admin` | **5175** (Admin) |
| `http://host/api` | **5133** (API) |

Copy and enable it:

```bash
sudo cp /path/to/cosmoserp/docs/nginx-proxy-to-ports.conf /etc/nginx/sites-available/cosmoserp-proxy
sudo ln -sf /etc/nginx/sites-available/cosmoserp-proxy /etc/nginx/sites-enabled/cosmoserp
# Disable the static config if needed: sudo rm /etc/nginx/sites-enabled/cosmoserp
sudo nginx -t && sudo systemctl reload nginx
```

Start the apps first: API on 5133, Marketplace dev on 5173, ERP dev on 3060, Admin dev on 5175.

---

## 14. SSL (Optional) with Let's Encrypt

If you have a **domain** pointing to `13.53.33.62`, you can add HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Then in Nginx config use `server_name yourdomain.com;` and rely on CertbotΓÇÖs HTTPS server block. Restart/reload Nginx as instructed by Certbot.

---

## 15. Verification and URLs

Open in a browser (use your domain instead of IP if you configured SSL). Replace `13.53.33.63` with your server IP (e.g. `13.53.33.62` if different):

| App        | URL                              |
|-----------|-----------------------------------|
| Marketplace (primary) | http://13.53.33.63/        |
| Admin     | http://13.53.33.63/admin          |
| ERP       | http://13.53.33.63/erp             |
| API       | http://13.53.33.63/api/...        |

- **ERP**: Register a tenant and log in.
- **Admin**: Log in with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from `.env` (change password after first login).
- **Marketplace**: Browse and test checkout flow; ensure API calls go to `/api` and succeed.

### Quick smoke test (from your machine or from the server)

Run these to confirm each app returns HTML (status 200):

```bash
# Replace SERVER_IP with your server (e.g. 13.53.33.63)
SERVER_IP=13.53.33.63

curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/"           # Marketplace (expect 200)
curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/admin"     # Admin (expect 200)
curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/erp"        # ERP (expect 200)
```

On the server itself you can also check the API:

```bash
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5133/"   # API root (may be 404; 200 or 404 means API is up)
```

---

## Quick Reference: Key Paths and Ports

| Item        | Path / Value |
|------------|---------------|
| Repo       | `/home/ubuntu/cosmoserp` |
| API .env   | `/home/ubuntu/cosmoserp/apps/api/.env` |
| API port   | `5133` |
| ERP build  | `/home/ubuntu/cosmoserp/apps/erp/dist` |
| Admin build| `/home/ubuntu/cosmoserp/apps/admin/dist` |
| Marketplace build | `/home/ubuntu/cosmoserp/apps/marketplace/dist` |
| Nginx config | `/etc/nginx/sites-available/cosmoserp` |
| PostgreSQL DB | `cosmos_db` |
| PostgreSQL user | `cosmos_user` |
| PostgreSQL password | `Samolan123` (production) |

---

## Frontends not running / not loading

### Local development

1. **Install dependencies** (from repo root):
   ```bash
   npm install
   ```

2. **Start only the three frontends** (if the API fails and you still want to see the UIs):
   ```bash
   npm run dev:frontends
   ```
   - Marketplace: http://localhost:5173  
   - ERP: http://localhost:3060  
   - Admin: http://localhost:5175  

3. **Start everything** (API + all frontends):
   ```bash
   npm run dev
   ```

4. **Port in use:** If a port (3060, 5173, 5175) is already in use, stop the other process or change the port in the app’s `vite.config.js` `server.port`.

5. **Windows:** Use `start_frontends.bat` to launch the three frontends in separate windows (Marketplace 5173, ERP 3060, Admin 5175).

### Production (Nginx serving built frontends)

If the site is blank or 404:

1. **Build all frontends** (from repo root on the server):
   ```bash
   cd ~/cosmoserp   # or /root/cosmoserp
   npm run build
   ```

2. **Check that `dist` folders exist:**
   ```bash
   ls -la apps/marketplace/dist apps/erp/dist apps/admin/dist
   ```
   Each should contain `index.html` and an `assets/` folder.

3. **Nginx paths:** In `/etc/nginx/sites-available/cosmoserp`, ensure `root` and `alias` use the same path as your repo (e.g. `/root/cosmoserp` if you cloned as root, not `/home/ubuntu/cosmoserp`).

4. **Reload Nginx** after any config or build change:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

---

## Troubleshooting

- **502 Bad Gateway**: API not running. Run `pm2 status` and `pm2 logs cosmos-api`.
- **404 on /admin or /erp**: Ensure Vite builds used `base: '/admin/'` and `base: '/erp/'` and Nginx `alias` paths point to the correct `dist` folders. Replace `/home/ubuntu/cosmoserp` with `/root/cosmoserp` in Nginx if you cloned as root.
- **API errors**: Check `apps/api/.env`, `DATABASE_URL`, and `REDIS_URL`. Ensure PostgreSQL and Redis are running.
- **Static assets 404**: Confirm Nginx `root`/`alias` and that `npm run build` was run for each app.
