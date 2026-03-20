# Tenant route audit (#82)

This document maps **API surface** to scoping expectations. It is a **living checklist**, not a proof that every handler is correct—re-verify when you add routes.

## Convention

- **Tenant JWT** (`authenticate` + `requireTenantUser`): `req.tenantId` must appear in `where` for tenant-owned rows.
- **Admin JWT** (`authenticate` + `requireAdmin`): may use `:tenantId` from params for cross-tenant ops; still scope writes to the intended tenant.
- **Public** routes: no tenant; must not leak PII without business justification.

## Mounted routers (`apps/api/src/app.js`)

| Mount | Auth | Notes |
|-------|------|--------|
| `/api/auth` | Mixed | Login/register |
| `/api/employee-portal` | Bearer **portal token** (Employee row) | No tenant JWT |
| `/api/tenants` | Mixed | Registration vs admin |
| `/api/users` | Tenant | |
| `/api/accounts` | Tenant | GL / journals / periods |
| `/api/currencies` | Tenant | |
| `/api/customers` | Tenant | |
| `/api/suppliers` | Tenant | |
| `/api/products` | Tenant | |
| `/api/warehouses` | Tenant | |
| `/api/invoices` | Tenant | |
| `/api/quotes` | Tenant | |
| `/api/purchase-orders` | Tenant | |
| `/api/employees` | Tenant | Portal token issued via `POST /employees/:id/portal-access` |
| `/api/payroll` | Tenant | |
| `/api/tax` | Tenant | |
| `/api/nrs` | Tenant | |
| `/api/seller/marketplace` | Tenant | Scoped by order **lines**.`tenantId` |
| `/api/marketplace` | Customer / public | |
| `/api/admin` | Admin | Includes marketplace escrow & Paystack payout |
| `/api/dashboard` | Tenant / Admin | |
| `/api/reports` | Tenant | |
| `/api/support` | Tenant | |
| `/api/pos` | Tenant / POS | |
| `/api/logistics` | Mixed | Public track, agent JWT, tenant JWT |
| `/api/agents` | Tenant field agent | |
| `/api/crm` | Tenant CRM role | |

## Review procedure

1. Open the route file under `apps/api/src/routes/`.
2. For each handler, confirm `findFirst` / `update` / `delete` includes `tenantId: req.tenantId` (or join equivalent).
3. For `:id` params, never use `findUnique({ where: { id } })` alone for tenant data.

## Recently added / high value

- `POST /api/logistics/deliveries/request` + `orderId` → verified seller line `tenantId`.
- `DELETE` / `POST …/reverse` on journals → `tenantId` on all queries.
- Admin `POST /api/admin/marketplace/orders/:id/*` → platform only (admin JWT).
