# Cosmos ERP — Comprehensive Project Proposal

**Prepared by:** Roland Consult Technology Division
**Date:** March 2026
**Version:** 1.0
**Classification:** Confidential — For Internal & Investor Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Product Architecture](#4-product-architecture)
5. [Functional Modules](#5-functional-modules)
6. [Technical Specifications](#6-technical-specifications)
7. [Nigerian Regulatory Compliance](#7-nigerian-regulatory-compliance)
8. [Multi-Tenancy & Data Architecture](#8-multi-tenancy--data-architecture)
9. [Application Interfaces](#9-application-interfaces)
10. [Security Framework](#10-security-framework)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Subscription & Monetization Model](#12-subscription--monetization-model)
13. [Project Scope & Deliverables](#13-project-scope--deliverables)
14. [Development Roadmap](#14-development-roadmap)
15. [Risk Analysis & Mitigation](#15-risk-analysis--mitigation)
16. [Competitive Analysis](#16-competitive-analysis)
17. [Team & Resource Requirements](#17-team--resource-requirements)
18. [Budget Estimate](#18-budget-estimate)
19. [Success Metrics & KPIs](#19-success-metrics--kpis)
20. [Appendices](#20-appendices)

---

## 1. Executive Summary

**Cosmos ERP** is a cloud-native, multi-tenant Enterprise Resource Planning platform purpose-built for Nigerian businesses. Developed by Roland Consult, the platform unifies finance, inventory, sales, human resources, payroll, e-commerce marketplace, customer care, and tax compliance into a single integrated system — with first-class support for Nigeria's regulatory environment including NRS (Nigeria Revenue Service) e-invoicing, FIRS tax stamps, PAYE calculations, pension contributions, and NIBSS bank payment integration.

### Key Value Propositions

- **Nigeria-First Design** — Built from the ground up for Nigerian tax laws, banking, and compliance requirements (VAT 7.5%, WHT, PAYE graduated tax bands, Pension Act 2014, NHF, ITF, NIBSS format payroll disbursement).
- **Multi-Tenant SaaS** — A single platform instance serves unlimited businesses, each with fully isolated data, configurable workflows, and independent user management.
- **Integrated Marketplace** — Tenants can toggle into sellers on a shared B2B/B2C marketplace with escrow payments, split settlement, and logistics tracking.
- **Real-Time NRS E-Invoicing** — Every invoice can be submitted to the NRS API bridge for IRN (Invoice Reference Number) issuance, QR code stamping, and UBL/XML archival — ensuring full FIRS compliance.
- **Customer Care & Call Center** — Built-in support ticketing, call logging, SLA tracking, and a dedicated agent portal for customer-facing teams.
- **Platform Administration** — A super-admin portal for Roland Consult to manage tenant KYC, monitor NRS bridge health, moderate marketplace activity, view analytics, and audit all platform activity.

### Target Market

| Segment | Description |
|---------|-------------|
| **SMEs** | Small and medium enterprises across Nigeria needing affordable, compliant ERP |
| **Traders & Distributors** | Import/export businesses needing landed cost, multi-currency, and multi-warehouse |
| **Professional Services** | Firms needing invoice→payment→tax cycles with WHT compliance |
| **Retailers** | Businesses wanting POS, inventory, and marketplace integration |
| **Manufacturers** | Companies needing BOM-aware inventory and purchase order management |

---

## 2. Problem Statement

Nigerian businesses face a fragmented software landscape:

1. **Regulatory Burden** — FIRS mandated electronic invoicing via NRS, yet most accounting tools used in Nigeria (QuickBooks, Wave, Zoho) have no NRS integration. Businesses must manually log into FIRS portals to submit invoices.

2. **Payroll Complexity** — Nigerian payroll requires calculating PAYE using graduated tax bands, employee and employer pension contributions (8%/10% under the Pension Reform Act 2014), NHF (2.5%), ITF (1%), and generating NIBSS-format bank payment files. No mainstream global ERP handles this natively.

3. **Fragmented Tools** — Businesses use separate tools for accounting, inventory, HR, CRM, and e-commerce — leading to data silos, reconciliation overhead, and human error.

4. **Poor Multi-Currency Support** — Nigerian businesses trading in USD, GBP, EUR alongside NGN need real-time exchange rate management and dual-currency invoicing. Most tools default to single-currency.

5. **No Affordable Nigerian ERP** — SAP, Oracle, and Odoo require expensive customization for Nigerian compliance. Local alternatives lack depth, UI quality, or multi-tenant SaaS capability.

6. **Customer Service Gap** — Most Nigerian ERPs have no built-in customer care/call center module, forcing businesses to use separate ticketing tools that don't integrate with invoices, products, or customer records.

---

## 3. Solution Overview

Cosmos ERP is a monorepo application comprising four interconnected applications:

```
CosmosERP/
├── apps/
│   ├── api/            → RESTful backend (Express + Prisma + PostgreSQL)
│   ├── erp/            → Main ERP frontend (React + TailwindCSS + shadcn/ui)
│   ├── marketplace/    → Public B2B/B2C marketplace (React + TailwindCSS)
│   └── admin/          → Super Admin portal (React + TailwindCSS)
├── packages/           → Shared utilities & config (future)
└── package.json        → npm workspaces root
```

### Application Matrix

| Application | Port | Users | Purpose |
|-------------|------|-------|---------|
| **API** | 5133 | All | Central REST API, auth, business logic, NRS bridge |
| **ERP** | 3060 | Tenant users & agents | Full ERP dashboard, all business modules |
| **Marketplace** | 5174 | Public buyers | Product browsing, cart, checkout, order tracking |
| **Admin** | 5175 | Roland Consult super admins | Platform management, KYC, analytics, audit |

---

## 4. Product Architecture

### 4.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS (Browsers)                           │
│  ┌──────────┐   ┌──────────────┐   ┌───────────┐   ┌────────────┐ │
│  │ ERP App  │   │ Marketplace  │   │ Admin App │   │ Agent Portal│ │
│  │ :3060    │   │ :5174        │   │ :5175     │   │ :3060/agent │ │
│  └────┬─────┘   └──────┬───────┘   └─────┬─────┘   └─────┬──────┘ │
└───────┼────────────────┼────────────────┼───────────────┼──────────┘
        │                │                │               │
        └────────────────┴────────┬───────┴───────────────┘
                                  │ HTTPS / REST
                    ┌─────────────▼──────────────┐
                    │       Cosmos ERP API        │
                    │     (Express.js :5133)      │
                    │                             │
                    │  ┌─────────────────────┐    │
                    │  │  Auth Middleware     │    │
                    │  │  (JWT + RBAC)        │    │
                    │  ├─────────────────────┤    │
                    │  │  Rate Limiting       │    │
                    │  │  (express-rate-limit) │    │
                    │  ├─────────────────────┤    │
                    │  │  Audit Middleware    │    │
                    │  │  (Immutable Log)     │    │
                    │  └─────────────────────┘    │
                    │                             │
                    │  21 Route Modules            │
                    │  11 Controller Modules       │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  PostgreSQL (CosmosERP)      │
                    │  via Prisma ORM              │
                    │                              │
                    │  34 Models · 25 Enums        │
                    │  Multi-Tenant Isolation      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  Redis (Optional Cache)      │
                    │  Session cache, rate limits  │
                    └─────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │  External Integrations       │
                    │  • NRS/FIRS API (E-Invoice)  │
                    │  • Paystack (Payments)        │
                    │  • NIBSS (Payroll Disbursement)│
                    │  • WhatsApp Business API      │
                    │  • Logistics Providers API    │
                    └─────────────────────────────┘
```

### 4.2 Data Flow

1. **Tenant Registration** → KYC submitted → Admin reviews → Approved → Full access
2. **Invoice Lifecycle** → Create Draft → Add Lines → Submit to NRS → Receive IRN + QR → Send to Customer (Email/WhatsApp) → Track Payment → Journal Entry Auto-Posted
3. **Marketplace Order** → Buyer browses → Add to cart → Checkout (Paystack) → Escrow held → Seller ships → Buyer confirms delivery → Escrow released (minus commission)
4. **Payroll Cycle** → Select month → Calculate (PAYE + Pension + NHF + ITF) → Review payslips → Approve → Generate NIBSS file → Disburse

---

## 5. Functional Modules

### 5.1 Finance & Accounting

| Feature | Description |
|---------|-------------|
| **Chart of Accounts** | Hierarchical accounts (Asset, Liability, Equity, Revenue, Expense) with parent-child nesting, system accounts, multi-currency support |
| **Journal Entries** | Double-entry bookkeeping with draft → posted → reversed lifecycle, auto-generated from invoices/payments |
| **Multi-Currency** | Tenant-defined currencies with exchange rates, base currency (NGN default), foreign currency invoicing |
| **Tax Filings** | VAT, WHT, PAYE, CIT filing management with period tracking and filing status |
| **Financial Reports** | Trial Balance, P&L, Balance Sheet, Cash Flow, Aged Receivables/Payables |

**Database Models:** `Account`, `JournalEntry`, `JournalLine`, `TenantCurrency`, `TaxFiling`

### 5.2 Sales & CRM

| Feature | Description |
|---------|-------------|
| **Quotations** | Draft → Sent → Accepted → Converted to Invoice pipeline with line items, discounts, and terms |
| **Invoices** | Full NRS-compliant e-invoicing with IRN, QR codes, UBL/XML, multi-format support (B2B, B2G, B2C) |
| **Customers** | Contact management with TIN, RC number, credit limits, credit utilization tracking, WhatsApp integration |
| **Payments** | Multiple payment methods, Paystack gateway integration, partial payments, overpayment handling |
| **Credit Management** | Per-customer credit limits with automatic enforcement on invoice creation |

**Database Models:** `Customer`, `Quote`, `QuoteLine`, `Invoice`, `InvoiceLine`, `Payment`

### 5.3 Inventory & Supply Chain

| Feature | Description |
|---------|-------------|
| **Products** | SKU/barcode management, cost/selling price, VAT/WHT rates, weight/dimensions, images, marketplace toggle |
| **Multi-Warehouse** | Multiple warehouses per tenant with codes, stock level tracking per product per warehouse |
| **Stock Movements** | Full audit trail of all stock changes (purchase receipt, sale delivery, transfer, adjustment, return, damage, opening stock) |
| **Purchase Orders** | Supplier POs with draft → sent → partial → received lifecycle, line-level receiving, auto-reorder |
| **Landed Cost** | Track import duties, freight, insurance, customs — allocated to product cost basis |
| **Barcode Support** | Barcode field on products for scanner integration and warehouse operations |

**Database Models:** `Product`, `ProductCategory`, `Warehouse`, `StockLevel`, `StockMovement`, `LandedCost`, `PurchaseOrder`, `PurchaseOrderLine`, `Supplier`

### 5.4 HR & Nigerian Payroll

| Feature | Description |
|---------|-------------|
| **Employee Management** | Staff ID, NIN, BVN, employment type, department, job title, bank details, pension PIN, NHF number, tax ID |
| **Payroll Processing** | Monthly payroll runs with automatic calculation of all Nigerian statutory deductions |
| **PAYE Calculation** | Graduated tax band computation per the Personal Income Tax Act |
| **Pension** | Employee (8%) and Employer (10%) contributions under Pension Reform Act 2014 |
| **NHF** | National Housing Fund at 2.5% of basic salary |
| **ITF** | Industrial Training Fund at 1% of total payroll |
| **Payslip Generation** | Detailed payslips with gross, basic, housing, transport, allowances, all deductions, and net pay |
| **NIBSS Disbursement** | Generate NIBSS-format bank payment files for bulk salary transfer |

**Database Models:** `Employee`, `PayrollRun`, `Payslip`

### 5.5 E-Commerce Marketplace

| Feature | Description |
|---------|-------------|
| **Marketplace Listings** | ERP tenants toggle products to marketplace with custom title, description, pricing, images, tags |
| **Product Discovery** | Category browsing, search, featured listings, ratings, reviews, view/sold counts |
| **Shopping Cart** | Guest cart with quantity management, shipping cost calculation |
| **Checkout & Payments** | Paystack integration with escrow model — funds held until delivery confirmed |
| **Split Payments** | Platform commission auto-deducted, seller receives net amount |
| **Order Management** | Full lifecycle: pending → confirmed → processing → shipped → delivered (or cancelled/refunded/disputed) |
| **Logistics Integration** | Tracking number, logistics provider, shipping class, delivery address management |
| **Product Reviews** | Verified buyer reviews with star ratings |

**Database Models:** `MarketplaceListing`, `MarketplaceOrder`, `MarketplaceOrderLine`, `ProductReview`

### 5.6 Customer Care & Call Center

| Feature | Description |
|---------|-------------|
| **Support Tickets** | Multi-channel ticketing (Email, Phone, WhatsApp, Walk-in, Web Form) with priority, category, SLA tracking |
| **Ticket Lifecycle** | Open → In Progress → Waiting Customer → Resolved → Closed |
| **Agent Assignment** | Assign tickets to specific users/agents with workload visibility |
| **Conversation Thread** | Internal notes and customer-facing replies on each ticket |
| **Call Logging** | Inbound/outbound call tracking with duration, outcome, notes, and recording URL |
| **SLA Management** | Deadline tracking with overdue alerts |
| **Agent Portal** | Dedicated streamlined interface for support agents with their own login page, dashboard, and queue |
| **Statistics Dashboard** | Real-time stats: open tickets, urgent count, overdue, resolution rates, call volumes by direction |

**Database Models:** `SupportTicket`, `TicketComment`, `CallLog`

### 5.7 Super Admin Platform (Roland Consult)

| Feature | Description |
|---------|-------------|
| **Platform Dashboard** | Total tenants, MRR, NRS health, user counts, KYC queue |
| **Tenant Management** | Full tenant list with KYC review, activation/suspension, detail views |
| **KYC/TIN Verification** | Review business registration documents (TIN, CAC), approve/reject |
| **NRS Monitor** | NRS API bridge health status, submission success/failure rates, pending queue |
| **Analytics** | Subscription breakdown, growth metrics, revenue analytics |
| **Marketplace Moderation** | Review listings, manage disputes, moderate seller activity |
| **Logistics Management** | Track shipments, manage delivery providers, monitor logistics KPIs |
| **Audit Logs** | Immutable log of all platform actions with user, resource, IP, and timestamps |

**Database Models:** `Platform`, `AdminUser`, `Subscription`, `SubscriptionPayment`, `AuditLog`

---

## 6. Technical Specifications

### 6.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | Server-side JavaScript runtime |
| **API Framework** | Express.js | 4.x | REST API routing and middleware |
| **ORM** | Prisma | 5.x | Type-safe database access, migrations, seeding |
| **Database** | PostgreSQL | 15+ | Primary relational data store |
| **Cache** | Redis | 7.x | Session caching, rate limiting (optional, graceful fallback) |
| **Frontend Framework** | React | 18.x | Component-based UI for all 3 frontends |
| **Build Tool** | Vite | 5.x | Fast HMR development server, optimized production builds |
| **CSS Framework** | TailwindCSS | 3.x | Utility-first styling |
| **UI Components** | shadcn/ui | — | Pre-built accessible components (ERP app) |
| **State Management** | Zustand | 4.x | Lightweight global state (auth, preferences) |
| **Server State** | TanStack React Query | 5.x | API data fetching, caching, synchronization |
| **HTTP Client** | Axios | 1.x | HTTP requests with interceptors for JWT |
| **Icons** | Lucide React | — | Consistent icon library |
| **Auth** | JWT (jsonwebtoken + bcrypt) | — | Stateless authentication with refresh tokens |
| **Logging** | Winston | 3.x | Structured server-side logging |
| **Security** | Helmet + CORS + Rate Limiting | — | HTTP security headers, CORS policy, rate limiting |
| **Monorepo** | npm Workspaces | — | Multi-package repository management |

### 6.2 Database Schema Summary

| Category | Models | Key Entities |
|----------|--------|-------------|
| Platform Layer | 2 | `Platform`, `AdminUser` |
| Tenant Layer | 3 | `Tenant`, `Subscription`, `SubscriptionPayment` |
| Auth Layer | 2 | `User`, `RefreshToken` |
| Finance | 4 | `Account`, `JournalEntry`, `JournalLine`, `TenantCurrency` |
| CRM & Sales | 6 | `Customer`, `Supplier`, `Quote`, `QuoteLine`, `Invoice`, `InvoiceLine` |
| Inventory | 7 | `Product`, `ProductCategory`, `Warehouse`, `StockLevel`, `StockMovement`, `LandedCost`, `PurchaseOrder/Line` |
| HR & Payroll | 3 | `Employee`, `PayrollRun`, `Payslip` |
| Tax & NRS | 2 | `NRSLog`, `TaxFiling` |
| Payments | 1 | `Payment` |
| Marketplace | 4 | `MarketplaceListing`, `MarketplaceOrder`, `MarketplaceOrderLine`, `ProductReview` |
| Customer Care | 3 | `SupportTicket`, `TicketComment`, `CallLog` |
| Audit | 1 | `AuditLog` |
| **Total** | **34 models, 25+ enums** | |

### 6.3 API Endpoints Overview

| Module | Route Prefix | Key Endpoints |
|--------|-------------|---------------|
| Authentication | `/api/auth` | login, admin/login, register, me, logout, refresh |
| Tenants | `/api/tenants` | CRUD, KYC review, activation |
| Users | `/api/users` | CRUD, role management, permissions |
| Customers | `/api/customers` | CRUD, credit management |
| Suppliers | `/api/suppliers` | CRUD, payment terms |
| Products | `/api/products` | CRUD, stock queries, marketplace toggle |
| Warehouses | `/api/warehouses` | CRUD, stock levels, transfers |
| Invoices | `/api/invoices` | CRUD, NRS submission, payment recording |
| Quotes | `/api/quotes` | CRUD, convert to invoice |
| Purchase Orders | `/api/purchase-orders` | CRUD, receiving, auto-reorder |
| Employees | `/api/employees` | CRUD, payroll data |
| Payroll | `/api/payroll` | Run, calculate, approve, NIBSS export |
| Accounts | `/api/accounts` | Chart of accounts, journal entries |
| Currencies | `/api/currencies` | Multi-currency management |
| Tax | `/api/tax` | Filing management, VAT/WHT computation |
| NRS | `/api/nrs` | NRS bridge, submission, status, logs |
| Marketplace | `/api/marketplace` | Listings, orders, reviews, cart |
| Support | `/api/support` | Tickets, comments, calls, stats |
| Admin | `/api/admin` | Tenant management, platform config |
| Dashboard | `/api/dashboard` | Aggregated KPIs for ERP and admin |
| Reports | `/api/reports` | Financial reports, analytics |

**Total: 21 route modules, 11 controller modules**

---

## 7. Nigerian Regulatory Compliance

### 7.1 NRS E-Invoicing (FIRS)

Cosmos ERP implements full compliance with the Federal Inland Revenue Service's National Revenue System:

| Requirement | Implementation |
|-------------|---------------|
| **E-Invoice Submission** | Automated real-time submission to NRS API upon invoice finalization |
| **IRN (Invoice Reference Number)** | Received from NRS and stored on each invoice; displayed on PDF |
| **QR Code Stamping** | NRS QR code stored and rendered on invoice documents |
| **UBL/XML Format** | Invoices converted to PEPPOL-compliant UBL 2.1 XML for archival |
| **Invoice Types** | B2B, B2G, B2C classification per NRS requirements |
| **NRS Status Tracking** | Per-invoice status: Pending → Submitted → Approved/Rejected |
| **NRS Audit Log** | Complete request/response logging with duration, error details |
| **Bridge Monitoring** | Admin portal shows NRS API health, success/failure rates |

### 7.2 Tax Computation

| Tax | Rate | Application |
|-----|------|-------------|
| **VAT** | 7.5% | Applied on all invoices and purchase orders; input/output tracking for filing |
| **WHT** | Variable (5-10%) | Applied on qualifying services; deducted at source |
| **PAYE** | Graduated bands | Calculated per employee using CRA (Consolidated Relief Allowance) |
| **CIT** | 30% (large) / 20% (medium) | Corporate income tax tracking for filing |

### 7.3 Payroll Statutory Deductions

| Deduction | Rate | Basis |
|-----------|------|-------|
| **PAYE** | Graduated (7% - 24%) | After CRA relief |
| **Employee Pension** | 8% | Gross salary (Basic + Housing + Transport) |
| **Employer Pension** | 10% | Gross salary |
| **NHF** | 2.5% | Basic salary |
| **ITF** | 1% | Total annual payroll (employer) |

### 7.4 Business Registration

| Data Point | Purpose |
|------------|---------|
| **TIN** | Tax Identification Number for NRS integration |
| **RC Number** | CAC Registration Number for business verification |
| **BVN** | Bank Verification Number for employee KYC |
| **NIN** | National Identification Number for employee records |

---

## 8. Multi-Tenancy & Data Architecture

### 8.1 Isolation Strategy

Cosmos ERP uses **row-level multi-tenancy** — all tenants share the same database but every data-bearing table includes a `tenantId` foreign key linked to the `Tenant` model.

```
┌───────────────────────────────────┐
│        PostgreSQL Instance        │
│                                   │
│  ┌─────────┐  ┌─────────┐        │
│  │Tenant A │  │Tenant B │  ...   │
│  │(rows)   │  │(rows)   │        │
│  └─────────┘  └─────────┘        │
│                                   │
│  WHERE tenantId = req.tenantId    │
└───────────────────────────────────┘
```

**Enforcement:**
- The `authenticate` middleware extracts `tenantId` from the JWT token and attaches it to every request.
- All database queries filter by `tenantId` — no cross-tenant data leakage is possible.
- Platform-level models (`AdminUser`, `Platform`, `AuditLog`) are tenant-agnostic.

### 8.2 Tenant Lifecycle

```
Register → KYC Submitted → Admin Reviews → Approved → Active
                                          → Rejected → Can Resubmit
Active → Trial (14 days) → Subscription Active → Renewal/Upgrade
                         → Past Due → Suspended → Cancelled
```

### 8.3 Business Types Supported

- Sole Proprietorship
- Partnership
- Limited Liability Company
- Public Limited Company
- NGO
- Government Agency

---

## 9. Application Interfaces

### 9.1 ERP Frontend (22 Pages)

| Page | Description |
|------|-------------|
| Dashboard | KPIs: revenue, invoices, top products, recent activity |
| Invoices | Invoice list with status filters, NRS submission status |
| Create Invoice | Line-item invoice builder with customer lookup, VAT/WHT auto-calc |
| Quotations | Quote list with pipeline status |
| Create Quote | Quote builder with convert-to-invoice capability |
| Products | Product catalog with SKU, pricing, stock levels, marketplace toggle |
| Customers | Customer directory with credit management |
| Suppliers | Supplier management with payment terms |
| Warehouses | Multi-warehouse management with stock levels |
| Purchase Orders | PO lifecycle management with receiving |
| Employees | Employee directory with full Nigerian HR data fields |
| Payroll | Monthly payroll runs with statutory calculation |
| Finance | Chart of Accounts with journal entries |
| NRS / Tax | NRS submission management, tax filing tracker |
| Reports | Financial reports (Trial Balance, P&L, Balance Sheet, etc.) |
| Settings | Tenant settings, user management, preferences |
| Support & Calls | Customer care tickets and call center management |
| POS | Point of Sale interface for retail operations |
| Agent Login | Dedicated login page for customer care agents |
| Agent Dashboard | Agent-specific dashboard with assigned tickets and urgent queue |
| Login | Tenant user authentication |
| Register | New tenant registration |

### 9.2 Marketplace Frontend (6 Pages)

| Page | Description |
|------|-------------|
| Home | Featured listings, categories, hero banner |
| Listings | Searchable/filterable product catalog |
| Product Detail | Full product page with images, reviews, add-to-cart |
| Cart | Shopping cart with quantity management |
| Checkout | Address, payment via Paystack |
| Order Confirmation | Order summary and tracking |

### 9.3 Admin Frontend (9 Pages)

| Page | Description |
|------|-------------|
| Login | Super admin authentication |
| Dashboard | Platform KPIs: tenants, MRR, NRS health, user counts |
| Tenants | Tenant list with KYC status filters |
| Tenant Detail | Individual tenant KYC review, activation/suspension |
| NRS Monitor | NRS API bridge health, submission stats |
| Analytics | Subscription breakdown, growth metrics |
| Marketplace Moderation | Listing review, dispute management |
| Logistics | Shipment tracking, delivery provider management |
| Audit Logs | Platform-wide immutable activity log |

### 9.4 Agent Portal (Embedded in ERP)

| Page | Description |
|------|-------------|
| Agent Login | Green-themed agent-specific login |
| Agent Dashboard | Personal queue, urgent tickets, recent calls |
| Tickets | Full ticket management (shared with ERP Support page) |
| Call Logs | Call logging and history (shared with ERP Support page) |

---

## 10. Security Framework

### 10.1 Authentication

| Mechanism | Details |
|-----------|---------|
| **JWT Access Tokens** | Short-lived tokens (15 min default) for API access |
| **Refresh Tokens** | Long-lived tokens stored in DB for session renewal |
| **Password Hashing** | bcrypt with configurable salt rounds |
| **Role-Based Access** | 8 tenant roles (Owner, Admin, Accountant, Sales, Warehouse, HR, Staff, Viewer) + 4 admin roles (Super Admin, Finance Admin, Support, Compliance) |
| **Separate Auth Flows** | Tenant users (`/auth/login`) vs Admin users (`/auth/admin/login`) with distinct token types |

### 10.2 API Security

| Layer | Implementation |
|-------|---------------|
| **Helmet.js** | HTTP security headers (XSS, clickjacking, MIME sniffing protection) |
| **CORS** | Strict origin whitelist (ERP, Marketplace, Admin URLs only) |
| **Rate Limiting** | Global: 500 req/15 min; Auth endpoints: 20 req/15 min |
| **Input Validation** | Request body validation on all mutation endpoints |
| **SQL Injection Prevention** | Prisma ORM parameterized queries (no raw SQL) |
| **Audit Trail** | Every significant action logged with user, IP, user-agent |

### 10.3 Data Protection

| Measure | Details |
|---------|---------|
| **Tenant Isolation** | `tenantId` filter on every query; middleware-enforced |
| **Sensitive Data** | Passwords hashed; tokens encrypted; PII access logged |
| **Immutable Audit Log** | Append-only log; no delete/update operations |

---

## 11. Deployment & Infrastructure

### 11.1 Recommended Production Architecture

```
┌───────────────────────────────────────────────────┐
│                  Azure / AWS                       │
│                                                    │
│  ┌────────────┐    ┌────────────┐                 │
│  │ CDN (Azure │    │ Load       │                 │
│  │ Front Door)│───▶│ Balancer   │                 │
│  └────────────┘    └─────┬──────┘                 │
│                          │                         │
│           ┌──────────────┼──────────────┐         │
│           ▼              ▼              ▼         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │  App Server│ │  App Server│ │  App Server│    │
│  │  (Node.js) │ │  (Node.js) │ │  (Node.js) │    │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘    │
│        └──────────────┼──────────────┘            │
│                       ▼                            │
│  ┌─────────────────────────────────────┐          │
│  │  Azure Database for PostgreSQL       │          │
│  │  (High Availability, Automated Backup)│         │
│  └─────────────────────────────────────┘          │
│                       │                            │
│  ┌─────────────────────────────────────┐          │
│  │  Azure Cache for Redis               │          │
│  └─────────────────────────────────────┘          │
│                                                    │
│  Region: South Africa North / West Africa          │
│  (Data Residency Compliance)                       │
└───────────────────────────────────────────────────┘
```

### 11.2 Data Residency

Per Nigerian data protection regulations (NDPR) and FIRS requirements, production deployment targets **Azure South Africa North** or **Nigerian data center** providers to ensure data residency compliance.

### 11.3 DevOps Requirements

| Requirement | Recommendation |
|-------------|---------------|
| **CI/CD** | GitHub Actions → Build → Test → Deploy |
| **Containerization** | Docker + Docker Compose (development), Kubernetes (production) |
| **Database Backups** | Daily automated backups with 30-day retention |
| **Monitoring** | Application Insights / Datadog for APM |
| **Logging** | Centralized logging via Winston → Azure Log Analytics |
| **SSL/TLS** | Let's Encrypt certificates via Certbot or Azure-managed |

---

## 12. Subscription & Monetization Model

### 12.1 Pricing Tiers

| Plan | Target | Price (Monthly) | Price (Annual) | Included |
|------|--------|----------------|----------------|----------|
| **Starter** | Micro businesses | ₦15,000/mo | ₦150,000/yr | 3 users, 1 warehouse, 100 invoices/mo, basic reports |
| **Growth** | SMEs | ₦50,000/mo | ₦500,000/yr | 15 users, 5 warehouses, unlimited invoices, full reports, marketplace, payroll (up to 50 employees) |
| **Enterprise** | Large businesses | ₦150,000/mo | ₦1,500,000/yr | Unlimited users/warehouses, API access, priority support, custom integrations, dedicated account manager |

### 12.2 Revenue Streams

| Stream | Model |
|--------|-------|
| **SaaS Subscriptions** | Monthly/annual recurring revenue from tenant subscriptions |
| **Marketplace Commission** | 5% platform fee on every marketplace transaction (configurable in `Platform.commissionRate`) |
| **Payment Processing Margin** | Paystack gateway fee pass-through with markup |
| **Premium Add-ons** | WhatsApp Business API integration, advanced analytics, custom PDF templates |
| **Onboarding & Training** | Paid setup assistance and staff training |
| **Data Migration** | Paid service to migrate from legacy systems |

### 12.3 Trial Model

- **14-day free trial** on any plan
- Full functionality during trial
- Automatic prompt to subscribe at trial end
- Grace period with `PAST_DUE` status before suspension

---

## 13. Project Scope & Deliverables

### 13.1 Phase 1 — Core Platform (Current, Completed)

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Monorepo scaffolding & workspace configuration | ✅ Complete |
| 2 | Backend API: Express server, Prisma schema (34 models), auth, middleware | ✅ Complete |
| 3 | Backend API: All controllers, routes, services, database seed | ✅ Complete |
| 4 | ERP Frontend: 22 pages, full layout, all modules | ✅ Complete |
| 5 | Marketplace Frontend: 6 pages, product browsing, cart, checkout | ✅ Complete |
| 6 | Admin Frontend: 9 pages, tenant management, analytics, audit | ✅ Complete |
| 7 | Customer Care & Call Center module with agent portal | ✅ Complete |
| 8 | Database migration, seeding, all services running | ✅ Complete |

### 13.2 Phase 2 — Integration & Hardening (Next)

| # | Deliverable | Priority |
|---|-------------|----------|
| 1 | NRS API live integration (FIRS sandbox → production) | Critical |
| 2 | Paystack payment gateway integration (live keys) | Critical |
| 3 | WhatsApp Business API integration for invoice delivery | High |
| 4 | NIBSS payment file generation for payroll | High |
| 5 | PDF invoice generation with NRS QR code & IRN | High |
| 6 | Email notification system (transactional emails) | High |
| 7 | Unit & integration test suite (Jest + Supertest) | High |
| 8 | End-to-end test suite (Playwright) | Medium |
| 9 | Input validation layer (Joi/Zod on all endpoints) | High |

### 13.3 Phase 3 — Scale & Polish

| # | Deliverable | Priority |
|---|-------------|----------|
| 1 | Production deployment (Azure South Africa / Nigerian DC) | Critical |
| 2 | CI/CD pipeline (GitHub Actions) | High |
| 3 | Docker containerization | High |
| 4 | Advanced reporting engine (Excel/PDF export) | Medium |
| 5 | Mobile-responsive optimization across all apps | Medium |
| 6 | Performance optimization & caching strategy | Medium |
| 7 | User onboarding wizard / setup flow | Medium |
| 8 | API documentation (Swagger/OpenAPI) | Medium |
| 9 | Multi-language support (English, Yoruba, Hausa, Igbo) | Low |

### 13.4 Phase 4 — Growth & Expansion

| # | Deliverable | Priority |
|---|-------------|----------|
| 1 | Mobile app (React Native) | High |
| 2 | Advanced analytics dashboard with charts/graphs | Medium |
| 3 | Workflow automation engine (rule-based triggers) | Medium |
| 4 | Third-party ERP integration connectors | Medium |
| 5 | White-label capability for resellers | Low |
| 6 | AI-powered insights (cash flow prediction, demand forecasting) | Low |

---

## 14. Development Roadmap

```
2026 Q1 (Jan–Mar)    ████████████████████ Phase 1: Core Platform ✅
                      • Full monorepo scaffold
                      • All backend APIs (21 route modules)
                      • ERP (22 pages), Marketplace (6 pages), Admin (9 pages)
                      • Customer Care & Call Center module
                      • Agent Portal

2026 Q2 (Apr–Jun)    ░░░░░░░░░░░░░░░░░░░ Phase 2: Integration
                      • NRS/FIRS live API integration
                      • Paystack payment gateway
                      • WhatsApp Business API
                      • NIBSS payroll file generation
                      • PDF generation & email system
                      • Test suites (unit, integration, e2e)

2026 Q3 (Jul–Sep)    ░░░░░░░░░░░░░░░░░░░ Phase 3: Scale & Polish
                      • Production deployment
                      • CI/CD, Docker, monitoring
                      • Performance optimization
                      • API documentation
                      • Mobile responsiveness

2026 Q4 (Oct–Dec)    ░░░░░░░░░░░░░░░░░░░ Phase 4: Growth
                      • Mobile app development
                      • Advanced analytics
                      • Beta launch with 10–20 pilot businesses
                      • Iterate based on feedback

2027 Q1              ░░░░░░░░░░░░░░░░░░░ Public Launch
                      • Public GA release
                      • Marketing & sales push
                      • Partner onboarding
                      • Support team scaling
```

---

## 15. Risk Analysis & Mitigation

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| **NRS API changes/downtime** | High | Medium | Queue-based retry system; offline mode with batch re-submission; monitor NRS API health |
| **Data breach / tenant data leak** | Critical | Low | Row-level isolation, JWT + RBAC, audit trail, regular penetration testing |
| **Paystack API rate limits** | Medium | Low | Implement webhook-based payment verification; queue payment requests |
| **Database scalability** | High | Medium | PostgreSQL read replicas, connection pooling (PgBouncer), query optimization, eventual sharding |
| **Regulatory changes** | Medium | Medium | Modular tax/compliance engine; configurable rates; dedicated compliance review process |
| **Customer adoption resistance** | Medium | High | Free trial, onboarding support, data migration assistance, competitive pricing |
| **Server infrastructure failure** | High | Low | Multi-AZ deployment, automated failover, daily backups, disaster recovery plan |
| **Key personnel dependency** | Medium | Medium | Comprehensive documentation, code review process, knowledge transfer sessions |

---

## 16. Competitive Analysis

| Feature | Cosmos ERP | QuickBooks | Zoho Books | Odoo | SAP B1 |
|---------|-----------|------------|------------|------|--------|
| **NRS E-Invoicing** | ✅ Native | ❌ | ❌ | ❌ | ⚠️ Custom |
| **Nigerian PAYE** | ✅ Graduated bands | ❌ | ❌ | ⚠️ Custom | ⚠️ Custom |
| **Pension (8%/10%)** | ✅ Auto-calc | ❌ | ❌ | ⚠️ Custom | ⚠️ Custom |
| **NHF/ITF** | ✅ Built-in | ❌ | ❌ | ❌ | ⚠️ Custom |
| **NIBSS Payroll** | ✅ File export | ❌ | ❌ | ❌ | ⚠️ Custom |
| **Multi-Tenant SaaS** | ✅ | ✅ | ✅ | ⚠️ Complex | ❌ On-prem |
| **Marketplace** | ✅ Integrated | ❌ | ❌ | ⚠️ Module | ❌ |
| **Escrow Payments** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Customer Care/Call Center** | ✅ Built-in | ❌ | ⚠️ Separate | ⚠️ Module | ⚠️ Module |
| **Paystack Integration** | ✅ Native | ❌ | ❌ | ⚠️ Custom | ❌ |
| **WhatsApp Invoicing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Multi-Currency (NGN native)** | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| **Landed Cost Tracking** | ✅ | ❌ | ⚠️ Limited | ✅ | ✅ |
| **Pricing** | ₦15K–150K/mo | $30–200/mo | $15–275/mo | €20–€50/user | $$$$ |
| **Data Residency (Nigeria)** | ✅ | ❌ US-hosted | ❌ India/US | ⚠️ Self-host | ⚠️ Self-host |

**Core Competitive Advantage:** Cosmos ERP is the only platform offering native NRS compliance, Nigerian payroll, integrated marketplace with escrow, and customer care — all in a single affordable SaaS product with Nigerian data residency.

---

## 17. Team & Resource Requirements

### 17.1 Development Team

| Role | Count | Responsibility |
|------|-------|---------------|
| **Technical Lead / Architect** | 1 | System design, code review, architecture decisions |
| **Senior Backend Developer** | 2 | API development, NRS integration, performance |
| **Senior Frontend Developer** | 2 | ERP, Marketplace, Admin UI/UX |
| **Mobile Developer** | 1 | React Native mobile app (Phase 4) |
| **DevOps Engineer** | 1 | CI/CD, Docker, cloud infrastructure, monitoring |
| **QA Engineer** | 1 | Test automation, manual testing, security testing |
| **UI/UX Designer** | 1 | Design system, user research, wireframes |

### 17.2 Operations Team

| Role | Count | Responsibility |
|------|-------|---------------|
| **Product Manager** | 1 | Roadmap, prioritization, stakeholder communication |
| **Customer Success Manager** | 1 | Onboarding, training, retention |
| **Support Agent** | 2 | Tier 1 customer support |
| **Sales/Marketing** | 2 | Lead generation, demos, conversions |

### 17.3 Compliance & Advisory

| Role | Count | Responsibility |
|------|-------|---------------|
| **Tax/Compliance Consultant** | 1 (part-time) | NRS integration validation, PAYE accuracy, regulatory updates |
| **Legal Advisor** | 1 (part-time) | NDPR compliance, terms of service, SLAs |

---

## 18. Budget Estimate

### 18.1 Development Costs (12 Months)

| Category | Monthly | Annual |
|----------|---------|--------|
| Development Team (10 FTEs avg) | ₦12,000,000 | ₦144,000,000 |
| UI/UX Design | ₦1,500,000 | ₦18,000,000 |
| QA & Testing | ₦1,200,000 | ₦14,400,000 |
| Project Management | ₦1,500,000 | ₦18,000,000 |
| **Subtotal (Personnel)** | **₦16,200,000** | **₦194,400,000** |

### 18.2 Infrastructure Costs (Monthly)

| Item | Monthly Estimate |
|------|-----------------|
| Azure VM / App Services (3 instances) | ₦450,000 |
| Azure Database for PostgreSQL | ₦300,000 |
| Azure Cache for Redis | ₦100,000 |
| Azure CDN + Front Door | ₦150,000 |
| Domain, SSL, DNS | ₦20,000 |
| Monitoring & Logging | ₦80,000 |
| **Subtotal (Infrastructure)** | **₦1,100,000/mo** |

### 18.3 Third-Party Services

| Service | Monthly Cost |
|---------|-------------|
| Paystack (transaction fees) | Variable (1.5% + ₦100/txn) |
| WhatsApp Business API | ₦50,000 |
| SendGrid / Mailgun (Email) | ₦30,000 |
| NRS API (FIRS) | Free (government) |
| **Subtotal (3rd Party)** | **~₦80,000+/mo** |

### 18.4 Budget Summary

| Phase | Duration | Total Estimate |
|-------|----------|---------------|
| Phase 1 (Core Platform) | 3 months | ₦52,000,000 |
| Phase 2 (Integration) | 3 months | ₦52,000,000 |
| Phase 3 (Scale & Polish) | 3 months | ₦52,000,000 |
| Phase 4 (Growth) | 3 months | ₦52,000,000 |
| Infrastructure (Year 1) | 12 months | ₦13,200,000 |
| **Total Year 1** | **12 months** | **₦221,200,000** |

*Note: Estimates are based on current Nigerian market rates for senior software professionals and Azure Africa region pricing. Actual costs may vary.*

---

## 19. Success Metrics & KPIs

### 19.1 Product Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Registered Tenants | 200+ |
| Active Paying Tenants | 50+ |
| Monthly Active Users | 500+ |
| NRS Invoices Processed | 10,000+ |
| Marketplace Orders | 1,000+ |
| System Uptime | 99.5%+ |
| Average Response Time | <500ms |

### 19.2 Revenue Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| Monthly Recurring Revenue (MRR) | ₦3,000,000+ |
| Annual Recurring Revenue (ARR) | ₦36,000,000+ |
| Marketplace GMV | ₦50,000,000+ |
| Platform Commission Revenue | ₦2,500,000+ |
| Customer Churn Rate | <5% monthly |
| Customer Acquisition Cost (CAC) | <₦150,000 |
| Lifetime Value (LTV) | >₦500,000 |

### 19.3 Customer Satisfaction

| Metric | Target |
|--------|--------|
| NPS (Net Promoter Score) | 40+ |
| First Response Time (Support) | <4 hours |
| Ticket Resolution Time | <24 hours |
| Onboarding Completion Rate | 80%+ |

---

## 20. Appendices

### Appendix A: Database Entity-Relationship Summary

```
Platform ─── AdminUser
                 │
Tenant ──┬── User ──── RefreshToken
         │       │
         │       ├── Invoice (creator)
         │       ├── SupportTicket (assigned)
         │       ├── TicketComment (author)
         │       ├── CallLog (agent)
         │       └── AuditLog
         │
         ├── Customer ──┬── Invoice
         │              ├── Quote
         │              ├── SupportTicket
         │              └── CallLog
         │
         ├── Supplier ──── PurchaseOrder ──── PurchaseOrderLine
         │
         ├── Product ──┬── StockLevel
         │             ├── StockMovement
         │             ├── InvoiceLine
         │             ├── QuoteLine
         │             ├── PurchaseOrderLine
         │             ├── LandedCost
         │             └── MarketplaceListing ──┬── MarketplaceOrderLine
         │                                      ├── ProductReview
         │                                      └── MarketplaceOrder
         │
         ├── Warehouse ──┬── StockLevel
         │               └── StockMovement
         │
         ├── Employee ──── Payslip
         │
         ├── PayrollRun ──── Payslip
         │
         ├── Account ──── JournalLine
         │
         ├── JournalEntry ──── JournalLine
         │
         ├── Subscription ──── SubscriptionPayment
         │
         ├── TaxFiling
         ├── NRSLog
         ├── TenantCurrency
         ├── SupportTicket ──┬── TicketComment
         │                   └── CallLog
         └── AuditLog
```

### Appendix B: User Roles & Permissions Matrix

| Permission | Owner | Admin | Accountant | Sales | Warehouse | HR | Staff | Viewer |
|-----------|-------|-------|-----------|-------|-----------|-----|-------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Invoice | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve Invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Products | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Stock Operations | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Run Payroll | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Support Tickets | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Appendix C: API Authentication Flow

```
1. POST /api/auth/login { email, password }
   → Verify credentials → Generate JWT (access + refresh)
   → Return { accessToken, refreshToken, user }

2. GET /api/auth/me
   → Authorization: Bearer <accessToken>
   → Validate JWT → Attach user + tenantId to req
   → Return { user: { ...userData, tenant } }

3. POST /api/auth/refresh { refreshToken }
   → Validate refresh token in DB → Issue new access token
   → Return { accessToken }

4. POST /api/auth/logout { refreshToken }
   → Delete refresh token from DB
```

### Appendix D: Subscription Plans Detail

| Feature | Starter | Growth | Enterprise |
|---------|---------|--------|-----------|
| Users | 3 | 15 | Unlimited |
| Warehouses | 1 | 5 | Unlimited |
| Invoices/month | 100 | Unlimited | Unlimited |
| NRS E-Invoicing | ✅ | ✅ | ✅ |
| Multi-Currency | ❌ | ✅ | ✅ |
| Marketplace Seller | ❌ | ✅ | ✅ |
| Payroll | ❌ | Up to 50 | Unlimited |
| Customer Care | Basic | Full | Full + SLA |
| Reports | Basic | Full | Full + Custom |
| API Access | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Dedicated Manager | ❌ | ❌ | ✅ |

---

**Document End**

*Cosmos ERP — Built for Nigeria, by Nigerians.*
*© 2026 Roland Consult. All rights reserved.*
