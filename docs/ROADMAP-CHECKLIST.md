# CosmosERP roadmap checklist (#81)

High-level completion order (from `Ntodo.md`). Use this as a living checklist; tick in your tracker, not necessarily in this file.

| Area | Status | Notes |
|------|--------|--------|
| DevOps / deploy | ○ | `docs/DEPLOYMENT-UBUNTU-PRODUCTION.md` |
| Security / tenancy | ○ | `docs/TENANT-SCOPING.md`, impersonation (#89) |
| Finance / GL | ○ | Journals (incl. delete draft), periods, trial balance, reports + CSV |
| Inventory | ✓ | Transfers/adjustments (#84) |
| HR / Payroll | ○ | Runs, payslip print, NIBSS export |
| POS | ○ | Terminal + history — see `docs/POS-DEVOPS-CHECKLIST.md` |
| Reports / dashboards | ○ | Financial reports; ERP dashboard + payroll/POS/PO snapshot |
| Marketplace | ○ | Seller orders + **Admin Market Escrow** (release + Paystack payout per seller) |
| Logistics | ○ | Tenant **Shipments**, agent POD, public **/track**, customer emails on status |

## ERP routes (recent)

- `/marketplace-orders` — seller fulfillment (requires `tenant.isMarketplaceSeller`)
- `/shipments` — `GET /api/logistics/tenant/deliveries`

## Marketplace (recent)

- `/track` and `/track/:code` — public logistics tracking (no login)

## API (recent)

- `GET|PATCH|POST /api/seller/marketplace/...` — tenant JWT (mounted **before** `/api/marketplace` so paths are not swallowed)
