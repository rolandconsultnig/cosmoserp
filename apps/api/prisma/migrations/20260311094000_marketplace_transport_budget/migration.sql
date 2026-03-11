CREATE TABLE IF NOT EXISTS "TransportBooking" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "price" NUMERIC(18,2) NOT NULL,
  "eta" TEXT NULL,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "TransportBooking_customer_created_idx"
  ON "TransportBooking" ("customerId", "createdAt");

ALTER TABLE "TransportBooking"
  ADD CONSTRAINT "TransportBooking_customer_fkey"
  FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "BudgetPlan" (
  "id" TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "incomes" JSONB NOT NULL,
  "expenses" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "BudgetPlan_customer_month_unique"
  ON "BudgetPlan" ("customerId", "month");

CREATE INDEX IF NOT EXISTS "BudgetPlan_customer_idx"
  ON "BudgetPlan" ("customerId");

ALTER TABLE "BudgetPlan"
  ADD CONSTRAINT "BudgetPlan_customer_fkey"
  FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

