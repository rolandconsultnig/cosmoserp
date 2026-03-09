#!/usr/bin/env bash
# Run on the server to diagnose 502 on /admin. Usage: bash docs/scripts/nginx-502-diagnose.sh

set -e
NGINX_CONF="${NGINX_CONF:-/etc/nginx/sites-available/cosmoserp}"

echo "=== Nginx config: $NGINX_CONF ==="
if [[ ! -f "$NGINX_CONF" ]]; then
  echo "Config not found. Set NGINX_CONF or create the site."
  exit 1
fi

echo ""
echo "--- How /admin is served ---"
grep -E "location /admin|proxy_pass|alias.*admin|@admin" "$NGINX_CONF" || true

echo ""
echo "--- Local HTTP checks ---"
ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/admin/ 2>/dev/null || echo "fail")
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5133/ 2>/dev/null || echo "fail")
echo "GET http://127.0.0.1/admin/  => $ADMIN_CODE"
echo "GET http://127.0.0.1:5133/   => $API_CODE"

echo ""
echo "--- Admin dist path (from config) ---"
ADMIN_ALIAS=$(grep -A1 "location /admin/" "$NGINX_CONF" | grep alias | sed -n 's/.*alias\s*\([^;]*\).*/\1/p' | tr -d ' ')
if [[ -n "$ADMIN_ALIAS" ]]; then
  echo "Alias: $ADMIN_ALIAS"
  if [[ -f "${ADMIN_ALIAS}index.html" ]] || [[ -f "${ADMIN_ALIAS%/}/index.html" ]]; then
    echo "  => index.html exists"
  else
    echo "  => index.html NOT FOUND (wrong path or run: cd apps/admin && npm run build)"
  fi
fi

if grep -q "proxy_pass.*admin\|location /admin[^/].*proxy" "$NGINX_CONF" 2>/dev/null; then
  echo "Admin is PROXIED to a backend. Is that process running and listening? (e.g. pm2 list, ss -tlnp | grep 5175)"
fi

echo ""
if [[ "$ADMIN_CODE" != "200" ]]; then
  echo ">>> Fix: Ensure Nginx uses 'alias' to your admin dist (no proxy_pass for /admin), path matches your repo (e.g. /root/cosmoserp), then: sudo nginx -t && sudo systemctl reload nginx"
fi
if [[ "$API_CODE" != "200" && "$API_CODE" != "404" ]]; then
  echo ">>> API not responding on 5133. Run: pm2 restart cosmos-api && pm2 logs cosmos-api"
fi
