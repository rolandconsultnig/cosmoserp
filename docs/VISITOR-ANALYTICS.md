# Site visitor analytics

Anonymous page views from the **marketplace** SPA are sent to `POST /api/public/visits` and stored in the **`SiteVisit`** table. Admins review them under **Site visits** in the admin app (`/visitor-analytics`).

## What is stored

| Field | Source |
|--------|--------|
| Path, optional title, referrer, session ID | Client |
| IP | `X-Forwarded-For`, `CF-Connecting-IP`, or socket |
| User-Agent | Request header |
| Browser, OS, device type/vendor/model | Parsed server-side (`ua-parser-js`) |
| Country / city / lat-lon | Optional (see below) |

## Location (geo)

1. **Cloudflare**: If the API is behind Cloudflare, `CF-IPCountry` is stored as `countryCode` (and a short name map for common codes).
2. **Optional lookup**: Set `ENABLE_VISIT_GEO_LOOKUP=true` on the API to call **ipwho.is** once per visit (subject to their terms and rate limits). Not recommended for very high traffic without a self-hosted GeoIP database.

## Environment

| Variable | App | Purpose |
|----------|-----|---------|
| `ENABLE_VISIT_GEO_LOOKUP` | API | `true` to enrich public IPs via ipwho.is |
| `VITE_ENABLE_VISIT_ANALYTICS` | Marketplace | `false` to disable beacons |
| `VITE_API_URL` | Marketplace | API base (required if the SPA is not same-origin as `/api`) |

## Database

Apply migrations so `SiteVisit` exists:

```bash
cd apps/api
npx prisma migrate deploy
```

## Privacy / compliance

Visitor logs include **IP addresses** and may include **approximate location**. Use only as allowed by your privacy policy and applicable law (e.g. disclose in policy, set retention if you add a cleanup job).

## Admin API

- `GET /api/admin/site-visits/stats?period=7d|30d|90d|1y` — aggregates for charts  
- `GET /api/admin/site-visits?page=&limit=&search=` — paginated log (admin JWT required)
