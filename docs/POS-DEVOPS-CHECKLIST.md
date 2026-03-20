# POS & DevOps checklist (#81)

## POS (point of sale)

- [ ] Cashiers complete **POS login** (`/pos-login`) and **end-of-day** reconciliation where used.
- [ ] **Offline sales** (if enabled) sync without duplicate `receiptNumber` (see API POS controller).
- [ ] **Void / refund** flows audited (admin void exists under `/api/admin/pos/sales/:saleId/void`).
- [ ] Dashboard **POS this month** matches reporting expectations (`/api/dashboard/tenant`).

## DevOps / production

- [ ] Follow `docs/DEPLOYMENT-UBUNTU-PRODUCTION.md` for Node, Postgres, Nginx, SSL.
- [ ] Set `JWT_SECRET`, database URL, `PAYSTACK_SECRET_KEY` (payments + **transfers** for marketplace payouts).
- [ ] **Backups**: Postgres daily; `uploads/` volume for KYC, POD, logos.
- [ ] **Process manager**: `pm2` or `systemd` for `apps/api` with restart policy.
- [ ] **CORS**: `ERP_URL`, `MARKETPLACE_URL`, `ADMIN_URL`, `API_PUBLIC_URL` aligned with real domains.
- [ ] Optional SMS: `TERMII_*` or `TWILIO_*` for logistics customer SMS.

## Marketplace payouts (Paystack)

- Register webhook URL and events per **`docs/PAYSTACK-WEBHOOKS.md`** (`charge.success` + `transfer.*`).
- Seller tenants need **bank account number** + **Paystack bank code** in `Tenant.bankSortCode`.
- Platform balance must allow **transfers** in Paystack dashboard.
- Use **Admin → Market Escrow** to release escrow and trigger **Paystack payout** per seller (logged in `MarketplaceSellerPayout`).
