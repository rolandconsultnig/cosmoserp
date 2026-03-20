# Tenant scoping (multi-tenancy)

Guidelines for API routes that run under `authenticate` + `requireTenantUser` (`req.tenantId` set from the JWT).

## Rules

1. **Every Prisma read/update/delete** for tenant-owned models MUST include `tenantId: req.tenantId` (or an equivalent join/filter), except where the handler explicitly targets a platform-global resource.
2. **Path parameters** (`:id`, `:invoiceId`, etc.) are never trusted alone: always combine with `tenantId` in `findFirst` / `updateMany` / `deleteMany` `where` clauses.
3. **Admin routes** use `req.admin` and may use `tenantId` from params for cross-tenant operations; those handlers should still scope writes to the intended tenant.
4. **Impersonation** (`req.impersonatedByAdminId`): the session is still a normal tenant user JWT; tenant scoping rules apply. Audit logs record impersonation via `metadata` / `impersonation` where implemented.

## Review checklist

When adding a route:

- [ ] List handler: `where: { tenantId: req.tenantId, ... }`
- [ ] Single-resource handler: `findFirst({ where: { id: req.params.id, tenantId: req.tenantId } })`
- [ ] Nested creates: set `tenantId: req.tenantId` on the parent row
- [ ] Transactions: every inner query repeats tenant scope (no “id only” lookups)

## Verified patterns (sampling, #82)

The following tenant-scoped flows have been reviewed for `tenantId` / line-level checks:

- Chart of accounts & GL: `/api/accounts/*` (journal create/post/delete, periods, trial balance).
- Payroll: `/api/payroll/*` (`req.tenantId` on runs).
- Marketplace seller: `/api/seller/marketplace/*` (order access via `lines.some({ tenantId })`).
- Logistics tenant: `GET /api/logistics/tenant/deliveries`; `POST /api/logistics/deliveries/request` with `orderId` requires a matching marketplace line for `req.tenantId`.

Re-run this list when adding new modules; prefer `findFirst({ where: { id, tenantId } })` over `findUnique` unless the id is globally unique and ownership is implicit.

## Route map

See **`docs/AUDIT-TENANT-ROUTES.md`** for a full mount-point checklist (#82).

## Related

- Admin impersonation: `POST /admin/tenants/:tenantId/impersonate` (SUPER_ADMIN only)
- JWT tenant claim is enforced in `auth.middleware.js`
- Marketplace seller APIs: `/api/seller/marketplace/*` (scoped by lines.`tenantId`, not mounted under `/api/marketplace` to avoid route shadowing)
- Logistics `POST /api/logistics/deliveries/request` with `orderId`: order is accepted only if it has at least one `MarketplaceOrderLine` for `req.tenantId`; customer name, email, phone, and address default from the order (body fields override when sent).
