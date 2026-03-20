# CosmosERP Updated TODO (Export)

Last updated: 2026-03-01

## Active

- [ ] **#81** Completion plan — use `docs/ROADMAP-CHECKLIST.md` + **`docs/POS-DEVOPS-CHECKLIST.md`**
- [ ] **#82** Deep tenant audit — **`docs/AUDIT-TENANT-ROUTES.md`** (spot-check handlers per release)
- [ ] **#83** Finance — posted reversal UI/API done; add policy (who can reverse, period locks) as needed
- [ ] **#86** Reports — extend per-module analytics beyond dashboard snapshot
- [ ] **#85** HR — employee portal (token link) done; add password/MFA if required

## Pending

- [ ] **#88** Logistics — tune auto-assign (capacity, zones); SMS provider credentials in production

## Completed (recent bulk)

- [x] **#87** Marketplace Paystack — **`/api/webhooks/paystack`**: `charge.success` (order finalize) + `transfer.*` → `MarketplaceSellerPayout`; idempotent payment; see **`docs/PAYSTACK-WEBHOOKS.md`** (production: register URL + live smoke test only)
- [x] Paystack **transfer** service + **admin** escrow queue + **per-seller payout** records (`MarketplaceSellerPayout`)
- [x] **Admin app** `/marketplace-escrow` (release escrow + trigger payouts)
- [x] Logistics **auto-assign** agent (least active deliveries in company) + optional **SMS** (Termii/Twilio)
- [x] **Employee self-service**: `POST /employees/:id/portal-access`, **`/erp/employee-portal`**, API `/api/employee-portal/*`
- [x] **Journal reversal** `POST /accounts/journal-entries/:id/reverse` + ERP **Reverse** button
- [x] **Tenant audit doc** `docs/AUDIT-TENANT-ROUTES.md`

## Completed (historical)

- [x] **#69** Prisma generate / DLL
- [x] **#84** Inventory ledger
- [x] **#79** Lint cleanup
- [x] **#89** Admin impersonation
