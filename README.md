# Mixtio ERP & Mixio Marketplace

A full-stack, multi-tenant ERP platform (**Mixtio ERP**) and public marketplace (**Mixio Marketplace**) for Nigerian SMEs by Roland Consult.

## Architecture

```
cosmos-erp/
├── apps/
│   ├── api/          # Node.js + Express + Prisma backend
│   ├── erp/          # React ERP dashboard (for business tenants)
│   ├── marketplace/  # React public e-commerce marketplace
│   └── admin/        # React super-admin portal (Roland Consult)
├── packages/
│   └── shared/       # Shared types, utils, constants
└── docs/
```

## Core Modules

### 1. Finance & NRS Tax Compliance
- Smart Chart of Accounts (Nigerian standards)
- NRS E-Invoicing Engine (B2B/B2G Clearance, B2C Reporting, UBL/XML)
- VAT (7.5%) & Withholding Tax management
- Multi-Currency (NGN, USD, GBP)

### 2. Inventory & Supply Chain
- Multi-Warehouse tracking
- Low-stock alerts & draft POs
- Landed cost tracking
- Barcode/QR integration

### 3. Sales & CRM
- Quotation-to-Invoice workflow
- Credit limit controls
- WhatsApp invoice delivery

### 4. HR & Nigerian Payroll
- PAYE, Pension (8%/10%), NHF, ITF calculations
- NIBSS bank payment schedules

### 5. E-Commerce Marketplace
- Global product search
- Seller toggle (publish to Cosmos Market)
- Escrow payments via Cosmos Escrow
- Logistics API (GIG Logistics, Kobo360)

### 6. Super Admin Platform (Roland Consult)
- KYC/TIN tenant onboarding
- Subscription billing engine
- Platform analytics & GMV monitoring
- NRS Bridge Monitor

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| Cache | Redis |
| Frontend | React, Vite, TailwindCSS, shadcn/ui |
| Auth | JWT + Refresh tokens, RBAC |
| Payments | Cosmos Escrow |
| Search | Elasticsearch / Algolia |
| Messaging | WhatsApp Business API |
| Tax | NRS/FIRS API |

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start all services
npm run dev
```

## Security & Compliance
- Nigerian data residency (Azure South Africa / local DC)
- Immutable audit trail on all tax-related actions
- API rate limiting
- RBAC with tenant isolation
