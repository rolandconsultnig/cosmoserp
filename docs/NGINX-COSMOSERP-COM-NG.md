# Nginx for **cosmoserp.com.ng** (Ubuntu **13.53.33.63**)

**Production server IP:** `13.53.33.63` — DNS **A** records for `cosmoserp.com.ng` and `www` should point here.

**HTTPS — choose one:**

| File | Use when |
|------|----------|
| `docs/nginx-cosmoserp-cosmoserp.com.ng-https.conf` | **Proxy mode** (current default in repo): Nginx forwards to **5173** (marketplace `/`), **3060** (`/erp/`), **5175** (`/admin/`), **5133** (`/api`, `/uploads`). Requires those Node/Vite processes running on the server. |
| `docs/nginx-cosmoserp-cosmoserp.com.ng-https-static-dist.conf` | **Static `dist/`** — no dev servers; Nginx serves built files from `apps/*/dist` and only proxies `/api` to **5133**. |

Older HTTPS copies had **two `location = /logistic-login` blocks** (invalid); current files use **`/logistic-login`** and **`/logistics-login`** redirects.

Use this when your VPS IP is **13.53.33.63** and the public hostname is **cosmoserp.com.ng**.

**Certbot errors** (invalid UTF-8, ACME 404, wrong IP in error): see **`docs/CERTBOT-TROUBLESHOOTING-COSMOSERP.md`**.

---

## 1. DNS (at your registrar)

Point the domain to the server:

| Type | Name / Host | Value        | TTL |
|------|----------------|--------------|-----|
| **A**  | `@` (or blank) | `13.53.33.63` | 300–3600 |
| **A**  | `www`            | `13.53.33.63` | optional |

Wait until `dig +short cosmoserp.com.ng` returns `13.53.33.63` before running Let’s Encrypt.

---

## 2. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

On **AWS EC2**, Security Group inbound: **22**, **80**, **443** from `0.0.0.0/0` (or your IP for 22).

---

## 3. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 4. Site config (HTTP first)

Replace **`COSMOS_ROOT`** with your clone path (`/home/ubuntu/cosmoserp` or `/root/cosmoserp`).

```bash
sudo nano /etc/nginx/sites-available/cosmoserp
```

Paste the contents of **`docs/nginx-cosmoserp-cosmoserp.com.ng.conf`** from this repo, then **replace every** `/root/cosmoserp` with your real path.

Or copy from the repo on the server:

```bash
# Example if repo is /root/cosmoserp
sudo cp /root/cosmoserp/docs/nginx-cosmoserp-cosmoserp.com.ng.conf /etc/nginx/sites-available/cosmoserp
# If repo is under /home/ubuntu/cosmoserp instead:
# sudo sed -i 's|/root/cosmoserp|/home/ubuntu/cosmoserp|g' /etc/nginx/sites-available/cosmoserp
```

Enable site and disable default if it conflicts:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/cosmoserp /etc/nginx/sites-enabled/cosmoserp
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Permissions (if you see 403/500 on static files)

Nginx runs as `www-data` and must read `dist/` folders:

```bash
# Use YOUR repo root
sudo chmod 755 /root
sudo chmod -R o+rX /root/cosmoserp/apps/marketplace/dist
sudo chmod -R o+rX /root/cosmoserp/apps/admin/dist
sudo chmod -R o+rX /root/cosmoserp/apps/erp/dist
```

---

## 6. API must listen on 5133 (localhost)

```bash
# apps/api/.env
PORT=5133
```

Start API with PM2 (see `DEPLOYMENT-UBUNTU-PRODUCTION.md`):

```bash
pm2 restart cosmos-api   # or your process name
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5133/health
```

---

## 7. HTTPS with Let’s Encrypt

Follow **`docs/LETS-ENCRYPT.md`** (prerequisites, `certbot --nginx`, API `.env`, renewal).

Quick version after DNS resolves:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d cosmoserp.com.ng -d www.cosmoserp.com.ng --email you@example.com --agree-tos -n
```

If anything fails, use **`docs/CERTBOT-TROUBLESHOOTING-COSMOSERP.md`**.

---

## 8. API `.env` and CORS (production URLs)

After HTTPS, set **at least** (adjust if you omit `www`):

```env
# apps/api/.env
API_PUBLIC_URL=https://cosmoserp.com.ng
ERP_URL=https://cosmoserp.com.ng
MARKETPLACE_URL=https://cosmoserp.com.ng
ADMIN_URL=https://cosmoserp.com.ng
```

Rebuild frontends if they embed API URL at build time; ensure Vite `base` stays `/erp/`, `/admin/`, `/` for marketplace as in the monorepo.

Restart API:

```bash
pm2 restart cosmos-api
```

---

## 9. URLs to test

| App         | URL |
|------------|-----|
| Marketplace | `https://cosmoserp.com.ng/` |
| Admin       | `https://cosmoserp.com.ng/admin/` |
| ERP         | `https://cosmoserp.com.ng/erp/` |
| API health  | `https://cosmoserp.com.ng/api/health` or `http://127.0.0.1:5133/health` |

```bash
curl -sI https://cosmoserp.com.ng/ | head -5
curl -sI https://cosmoserp.com.ng/api/health | head -5
```

---

## Troubleshooting

- **502 on `/api`**: API not running or wrong `PORT`; check `pm2 logs cosmos-api`.
- **Wrong site / default Nginx page**: Ensure `sites-enabled/default` is removed and `cosmoserp` is linked; `sudo nginx -t`.
- **Certbot fails**: DNS must point to **13.53.33.63**; port **80** must be reachable from the internet.

Full stack steps: **`docs/DEPLOYMENT-UBUNTU-PRODUCTION.md`**.
