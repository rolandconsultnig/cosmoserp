/*
  Warnings:

  - A unique constraint covering the columns `[budgetId,accountId,month,category,costCenter,projectCode]` on the table `BudgetLine` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BudgetLineCategory" AS ENUM ('OPEX', 'CAPEX', 'HEADCOUNT', 'SALARY', 'PROJECT');

-- DropIndex
DROP INDEX "BudgetLine_budgetId_accountId_month_key";

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "allocationMode" TEXT,
ADD COLUMN     "category" "BudgetLineCategory" NOT NULL DEFAULT 'OPEX',
ADD COLUMN     "costCenter" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "headcount" INTEGER,
ADD COLUMN     "projectCode" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "BudgetLine_tenantId_category_idx" ON "BudgetLine"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BudgetLine_tenantId_costCenter_idx" ON "BudgetLine"("tenantId", "costCenter");

-- CreateIndex
CREATE INDEX "BudgetLine_tenantId_projectCode_idx" ON "BudgetLine"("tenantId", "projectCode");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_budgetId_accountId_month_category_costCenter_pro_key" ON "BudgetLine"("budgetId", "accountId", "month", "category", "costCenter", "projectCode");
