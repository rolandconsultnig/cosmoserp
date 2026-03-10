# Create All Database Tables (Cosmos ERP)

All tables are created by **Prisma migrations**. Run these commands from the server (or locally) with the API `.env` configured (`DATABASE_URL` must point to your PostgreSQL database).

---

## One-time setup (fresh database or first deploy)

From the **repository root** or **apps/api**:

```bash
cd ~/cosmoserp/apps/api
# or: cd /root/cosmoserp/apps/api

npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

- **prisma generate** — generates the Prisma client from the schema.
- **prisma migrate deploy** — applies all pending migrations and creates/updates all tables.
- **npm run db:seed** — seeds initial data (admin user, demo tenant, etc.).

---

## If a migration previously failed (e.g. enum "CHAT" error)

If you had run `migrate deploy` and it failed on `20260309110000_platform_support_wallet_mfa`:

1. Mark that migration as rolled back:
   ```bash
   cd ~/cosmoserp/apps/api
   npx prisma migrate resolve --rolled-back 20260309110000_platform_support_wallet_mfa
   ```

2. Pull latest code (includes the fix that splits the enum into its own migration):
   ```bash
   cd ~/cosmoserp
   git pull origin main
   ```

3. Apply all migrations again:
   ```bash
   cd ~/cosmoserp/apps/api
   npx prisma migrate deploy
   ```

---

## Tables created by migrations

Migrations create (among others):

- **Platform, AdminUser** — super admin
- **Tenant, User, RefreshToken** — tenants and ERP users
- **KycDocument** — KYC uploads
- **Account, JournalEntry, JournalLine, TenantCurrency** — finance
- **Customer, Supplier, Warehouse, Product, ProductCategory, StockLevel, StockMovement** — inventory
- **PurchaseOrder, Quote, Invoice, InvoiceLine, Payment, NRSLog** — sales & invoicing
- **Employee, PayrollRun, Payslip** — HR
- **MarketplaceListing, MarketplaceCustomer, MarketplaceOrder, MarketplaceOrderLine, ProductReview** — marketplace
- **SupportTicket, TicketComment, CallLog** — tenant support
- **PlatformSupportTicket, PlatformTicketComment** — back-office support
- **CustomerWallet, WalletTransaction, Escrow** — customer wallet & escrow
- **POSSale, POSSaleLine** — POS
- **LogisticsCompany, LogisticsAgent, Delivery** — logistics
- **AuditLog** — audit trail

---

## Using npm scripts (from apps/api)

```bash
cd ~/cosmoserp/apps/api
npm run db:generate   # generate Prisma client
npm run db:deploy     # apply migrations (production)
npm run db:seed       # seed initial data
```
