# Cosmos ERP — module roadmap (CSV)

See **`COSMOS-ERP-ROADMAP.csv`** for `module | priority | effort`.

## Priority

| Value | Meaning |
|-------|---------|
| **P0** | Critical / unblock production or compliance (use sparingly) |
| **P1** | High — core ERP parity (HR, inventory, users) |
| **P2** | Medium — productivity & revenue features |
| **P3** | Lower — nice-to-have or larger epics |

## Effort

| Value | Meaning |
|-------|---------|
| **S** | Small (order of days) |
| **M** | Medium (roughly one sprint) |
| **L** | Large (multiple sprints) |
| **XL** | Epic (major initiative) |

Edit the CSV in Excel / Sheets; keep the header row. Re-prioritize per your market (e.g. move **Leads** to P1 if sales CRM is the focus).

## Implemented (Phase 1 — ERP UI)

| Roadmap item | What shipped |
|--------------|----------------|
| **Stock (unified view…)** | `/erp/stock` — inventory valuation, filters (all / low / out), warehouse breakdown; API adds reorder + `lowStock` / `outOfStock` flags on `/api/reports/inventory-valuation`. |
| **Utilities page** | `/erp/utilities` — shortcuts + API ping via `/api/health`. |
| **Warning & alerts center** | `/erp/alerts` — KYC banner, inventory counts, payroll pending (from dashboard). |
| **Dashboard enhancements** | Dashboard cards linking to **Stock**, **Alerts**, and **Calendar**. |
| **Calendar** | `/erp/calendar` — month grid aggregating **task due dates**, **project start/end**, and **announcement** publish/expiry (reads existing `/api/tasks`, `/api/projects`, `/api/announcements`). |
| **Leave management** | `/erp/leave-management` — HR/owner approves or rejects **staff portal** leave requests; **Calendar** shows approved + pending leave spans for Owner/Admin/HR (`GET/PATCH /api/leave-requests`). |
| **Termination workflow** | `/erp/termination-workflow` — HR/owner/admin processes resignation requests from **Staff Portal** (`GET/PATCH /api/resignations`); staff can now withdraw submitted resignation in portal (`POST /api/staff-portal/resignations/:id/withdraw`). |
| **Attendance + shifts** | `/erp/attendance` — HR/owner/admin manages work shifts and attendance logs (`/api/attendance/shifts`, `/api/attendance/entries`); Staff Portal includes **Attendance** tab for clock-in/out (`/api/attendance/me`, `/api/attendance/clock-in`, `/api/attendance/:id/clock-out`). |
| **Mailbox (richer intranet)** | `/erp/mailbox` — internal inbox/sent + compose for all tenant users; API via `/api/mailbox` (`/users`, `/inbox`, `/sent`, send, mark-read), built on `IntranetMessage`. |
| **Knowledge base** | `/erp/knowledge-base` — searchable internal articles with categories; API via `/api/knowledge-base` (`/categories`, `/articles`), with role-based content management (Owner/Admin/HR). |
| **Transactions hub** | `/erp/transactions-hub` — unified ledger feed across journals, invoices, payments, payroll runs, and purchase orders; API via `/api/accounts/transactions-hub` with date/type/search filters and per-kind totals. |
| **Promotion & pricing rules** | `/erp/promotion-pricing` — create pricing rules and promo codes, and evaluate final prices; API via `/api/pricing` (`/rules`, `/codes`, `/evaluate`). |
| **Leads pipeline** | CRM portal now includes lead capture, stage pipeline updates, and lead conversion to customer (`/api/crm/leads`, `/api/crm/leads/:id/convert`). |

**API:** `GET /api/health` — same JSON as `GET /health`, works through Vite `/api` proxy.

## Next on the roadmap (P1)

From **`COSMOS-ERP-ROADMAP.csv`**: attendance baseline is now in place; remaining items are medium/large enhancements (timesheet approvals, overtime rules, shift templates, payroll sync hardening).

### User & roles (shipped)

| Item | Details |
|------|--------|
| **Bulk invite** | `POST /api/users/bulk-invite` — up to 50 rows; generated temp passwords returned once; **OWNER** only can assign **ADMIN**. |
| **Audit** | `GET /api/audit-logs?resource=User` — Owner/Admin; user CREATE/UPDATE and **BULK_INVITE** logged. |
| **ERP** | **Settings → Users** — sub-tabs **Directory**, **Bulk invite**, **Audit log**. |
