# Let's Encrypt (HTTPS) for CosmosERP

End-to-end TLS for **Nginx + static frontends + API proxy** on Ubuntu.

---

## What you get

- Browsers load `https://yourdomain.com/`, `/erp/`, `/admin/`
- API stays on **127.0.0.1:5133**; Nginx terminates TLS and proxies `/api`
- Free certs from **Let's Encrypt**, auto-renew via **`certbot.timer`**

---

## Prerequisites

| Check | Command / action |
|--------|------------------|
| DNS **A** for apex + `www` → **this server's public IP** | `dig +short yourdomain.com` (must match `curl -s ifconfig.me` on the server) |
| Ports **80** and **443** open | UFW + cloud Security Group |
| Nginx installed, site enabled | `sudo nginx -t` |
| API on **5133** | `curl -s http://127.0.0.1:5133/health` |
| Nginx config is **valid UTF-8 / ASCII** | If Certbot says *invalid character*, see **`docs/CERTBOT-TROUBLESHOOTING-COSMOSERP.md`** |

---

## 1. Nginx site (HTTP first)

Use the repo file (ASCII comments, ACME webroot path included):

- **`docs/nginx-cosmoserp-cosmoserp.com.ng.conf`** — replace `cosmoserp.com.ng` / paths as needed, or copy and edit `server_name` + `/root/cosmoserp`.

```bash
sudo cp /root/cosmoserp/docs/nginx-cosmoserp-cosmoserp.com.ng.conf /etc/nginx/sites-available/cosmoserp
# sudo sed -i 's|/root/cosmoserp|/home/ubuntu/cosmoserp|g' /etc/nginx/sites-available/cosmoserp
sudo ln -sf /etc/nginx/sites-available/cosmoserp /etc/nginx/sites-enabled/cosmoserp
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
```

---

## 2. Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

---

## 3. Obtain certificate (pick one)

### Option A — **Certbot Nginx plugin** (simplest)

Edits Nginx for you (adds `listen 443 ssl` and redirects HTTP→HTTPS):

```bash
sudo certbot --nginx \
  -d cosmoserp.com.ng -d www.cosmoserp.com.ng \
  --email your-email@example.com \
  --agree-tos --no-eff-email -n
```

Replace domains and email. Use **non-interactive** `-n` only after terms are already accepted once.

### Option B — **Webroot** (if the plugin fails)

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d cosmoserp.com.ng -d www.cosmoserp.com.ng \
  --email your-email@example.com \
  --agree-tos --no-eff-email -n
```

Then either run **`sudo certbot install --cert-name cosmoserp.com.ng`** if offered, or add SSL to Nginx manually using:

- `ssl_certificate /etc/letsencrypt/live/cosmoserp.com.ng/fullchain.pem;`
- `ssl_certificate_key /etc/letsencrypt/live/cosmoserp.com.ng/privkey.pem;`
- `include /etc/letsencrypt/options-ssl-nginx.conf;` (if present)

and a **`listen 443 ssl`** server block duplicating your `location`s. Easiest is to use **Option A** after DNS is correct.

---

## 4. API environment (production HTTPS)

In **`apps/api/.env`** set public URLs to **https**:

```env
API_PUBLIC_URL=https://cosmoserp.com.ng
ERP_URL=https://cosmoserp.com.ng
MARKETPLACE_URL=https://cosmoserp.com.ng
ADMIN_URL=https://cosmoserp.com.ng
```

Restart API:

```bash
pm2 restart cosmos-api
```

**CORS** in `apps/api/src/app.js` uses these env vars — wrong scheme causes browser blocks after moving to HTTPS.

---

## 5. Frontends

Default ERP/marketplace/admin clients use **relative** `/api` (see `VITE_API_URL` in code). If you did **not** bake an absolute `http://...` into build-time env, **rebuild is optional** for same-domain HTTPS.

If you set `VITE_API_URL=http://old-ip/api`, rebuild:

```bash
cd /path/to/cosmoserp && npm run build
sudo systemctl reload nginx
```

---

## 6. Paystack / webhooks

Dashboard webhook URL must use **https**:

`https://cosmoserp.com.ng/api/webhooks/paystack`

See **`docs/PAYSTACK-WEBHOOKS.md`**.

---

## 7. Renewal

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Certs renew automatically; Nginx reload is triggered by Certbot hooks when needed.

---

## 8. Quick verification

```bash
curl -sI https://cosmoserp.com.ng/ | head -5
curl -sI https://cosmoserp.com.ng/api/health | head -5
openssl s_client -connect cosmoserp.com.ng:443 -servername cosmoserp.com.ng </dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## Certificate exists but Nginx was not updated

If Certbot says **invalid character** on your site file but the cert was saved anyway, deploy TLS by replacing the site config with **`docs/nginx-cosmoserp-cosmoserp.com.ng-https.conf`** (ASCII-only, includes `listen 443 ssl` and cert paths). See **`docs/CERTBOT-TROUBLESHOOTING-COSMOSERP.md` section 5**.

---

## Related docs

| Doc | Purpose |
|-----|---------|
| **`docs/CERTBOT-TROUBLESHOOTING-COSMOSERP.md`** | UTF-8 error, ACME 404, wrong DNS IP, cert-without-install |
| **`docs/NGINX-COSMOSERP-COM-NG.md`** | Nginx + domain checklist |
| **`docs/DEPLOYMENT-UBUNTU-PRODUCTION.md`** | Full Ubuntu deploy |
