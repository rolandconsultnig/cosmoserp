# Staff portal (ERP)

The **Staff Portal** uses `GET /api/staff-portal/me`, `/documents`, etc. It requires:

1. **Migrations applied** — including `20260322140000_staff_portal_hr_tables`, which adds:
   - `Employee.userId` (links ERP login user ↔ HR employee)
   - `EmployeeDocument`, `LeaveRequest`, `Resignation`, `IntranetMessage`

   From the repo root:

   ```bash
   cd apps/api && npx prisma migrate deploy
   ```

2. **User ↔ employee link** — In HR, the staff member must have an **Employee** record with **`userId`** set to their **User** id. Without this, the API returns **403** with a clear message.

3. **Role** — User must be **STAFF**, **HR**, **ADMIN**, or **OWNER** (see `staffPortal.routes.js`).

After deploy, restart the API and reload the Staff Portal.
