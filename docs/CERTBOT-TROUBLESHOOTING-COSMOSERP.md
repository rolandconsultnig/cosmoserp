# Certbot / Let's Encrypt issues (cosmoserp.com.ng)

## 1. "Could not read file ... invalid character. Only UTF-8 encoding is supported"

The file `/etc/nginx/sites-enabled/cosmoserp` (or `sites-available`) contains **bytes Certbot rejects**: UTF-8 BOM, smart quotes (`"` `"`), copied arrows, or text pasted from Word/PDF.

**Fix: replace the file with a clean ASCII config**

On the server:

```bash
sudo rm -f /etc/nginx/sites-enabled/cosmoserp
sudo nano /etc/nginx/sites-available/cosmoserp
```

Paste the contents of **`docs/nginx-cosmoserp-cosmoserp.com.ng.conf`** from this repo (after fixing `/root/cosmoserp` paths). Save.

Or copy from git and fix path in one line:

```bash
sudo cp /root/cosmoserp/docs/nginx-cosmoserp-cosmoserp.com.ng.conf /etc/nginx/sites-available/cosmoserp
# sudo sed -i 's|/root/cosmoserp|/home/ubuntu/cosmoserp|g' /etc/nginx/sites-available/cosmoserp
sudo ln -sf /etc/nginx/sites-available/cosmoserp /etc/nginx/sites-enabled/cosmoserp
sudo nginx -t && sudo systemctl reload nginx
```

Do **not** paste from email or rich text; use `nano`, `vim`, or `scp` the file.

Check encoding:

```bash
file /etc/nginx/sites-available/cosmoserp
# Expect: ASCII text or UTF-8 Unicode text (no "BOM")
```

---

## 2. "unauthorized" / ACME 404 / wrong IP in the error (e.g. 147.124.214.59)

Let's Encrypt uses **public DNS**. If the error shows:

`Detail: 147.124.214.59: Invalid response from http://cosmoserp.com.ng/.well-known/...`

then **cosmoserp.com.ng currently resolves to 147.124.214.59**, not to the machine where you run Nginx.

**Fix:**

1. On **this** server, get its public IP:
   ```bash
   curl -s ifconfig.me
   ```
2. At your DNS provider, set **A** records:
   - `@` (or `cosmoserp.com.ng`) -> **that** IP  
   - `www` -> **same** IP (or CNAME to apex)
3. Wait for propagation, then verify **from your laptop**:
   ```bash
   dig +short cosmoserp.com.ng
   dig +short www.cosmoserp.com.ng
   ```
   Both must match the server where Nginx runs.

4. Run Certbot again only after DNS is correct.

---

## 3. SSL after DNS is fixed (two ways)

### A) Nginx plugin (config file must be clean UTF-8 / ASCII)

```bash
sudo certbot --nginx -d cosmoserp.com.ng -d www.cosmoserp.com.ng \
  --email info@cosmoserp.com.ng --agree-tos --no-eff-email -n
```

(`-n` non-interactive if you already agreed to terms.)

### B) Webroot (works well with our `acme-challenge` location)

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d cosmoserp.com.ng -d www.cosmoserp.com.ng \
  --email info@cosmoserp.com.ng --agree-tos --no-eff-email -n
```

Then add the `ssl_certificate` / `listen 443 ssl` blocks Certbot prints, or run `sudo certbot install --cert-name cosmoserp.com.ng` if prompted.

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Invalid email during interactive Certbot

You pressed Enter on an empty email once; use a real address or:

```bash
sudo certbot ... --email you@yourdomain.com --agree-tos
```

---

See also **`docs/NGINX-COSMOSERP-COM-NG.md`**.

---

## 5. Certificate issued but "Could not install certificate" / invalid character

Certbot may still **obtain** a cert (e.g. webroot/standalone) even when it **cannot read** your Nginx site file.

**Fix:** Replace `/etc/nginx/sites-available/cosmoserp` with a **clean ASCII** config that already includes `ssl_certificate` paths, then reload Nginx.

1. Copy from the repo (on the server):

   **`docs/nginx-cosmoserp-cosmoserp.com.ng-https.conf`**

2. Fix repo path and install:

   ```bash
   sudo cp /root/cosmoserp/docs/nginx-cosmoserp-cosmoserp.com.ng-https.conf /etc/nginx/sites-available/cosmoserp
   # If repo is not under /root/cosmoserp:
   # sudo sed -i 's|/root/cosmoserp|/home/ubuntu/cosmoserp|g' /etc/nginx/sites-available/cosmoserp
   sudo mkdir -p /var/www/certbot
   sudo ln -sf /etc/nginx/sites-available/cosmoserp /etc/nginx/sites-enabled/cosmoserp
   sudo nginx -t
   ```

3. If `nginx -t` fails on `options-ssl-nginx.conf`, install Certbot nginx snippets:

   ```bash
   sudo apt install --reinstall certbot python3-certbot-nginx
   ```

   Or comment out the `include /etc/letsencrypt/options-ssl-nginx.conf;` line and add minimal:

   ```nginx
   ssl_protocols TLSv1.2 TLSv1.3;
   ```

4. Reload:

   ```bash
   sudo systemctl reload nginx
   ```

5. Optional: after the file is clean UTF-8, you can run:

   ```bash
   sudo certbot install --cert-name cosmoserp.com.ng
   ```

   so future Certbot edits apply; not required if the hand-made HTTPS config works.

6. Verify:

   ```bash
   curl -sI https://cosmoserp.com.ng/ | head -3
   ```
