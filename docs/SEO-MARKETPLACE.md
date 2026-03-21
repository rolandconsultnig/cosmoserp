# Marketplace SEO (CosmosERP public site)

The marketplace app (`apps/marketplace`) uses **react-helmet-async** for per-route titles, descriptions, canonical URLs, Open Graph / Twitter cards, and JSON-LD where useful.

## Build-time environment

Set **`VITE_SITE_URL`** when building for production so canonicals and structured data use your real domain (not only `window.location` at runtime):

```bash
cd apps/marketplace
# Windows PowerShell:
$env:VITE_SITE_URL="https://cosmoserp.com.ng"; npm run build
```

Copy `apps/marketplace/.env.example` to `.env.production` (or inject vars in CI) as needed.

## Static files

- **`public/robots.txt`** — allow listing; disallows cart, checkout, auth, account-style paths; points to sitemap.
- **`public/sitemap.xml`** — main public URLs. **Update the domain** inside both files if production is not `cosmoserp.com.ng`.

## After deploy

1. **Google Search Console** — add property for your domain, verify, submit `https://<your-domain>/sitemap.xml`.
2. **Bing Webmaster Tools** — optional; same sitemap URL.
3. Re-check **canonical** URLs on key pages (home, `/products`, product detail, storefront) in “View page source” or Rich Results Test.

## Private / transactional pages

Cart, checkout, and similar routes use **`noindex`** via the shared `Seo` component so they are less likely to be indexed.
