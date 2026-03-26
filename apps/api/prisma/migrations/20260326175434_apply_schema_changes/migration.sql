-- CreateEnum
CREATE TYPE "InvoiceTemplate" AS ENUM ('CLASSIC', 'MODERN', 'COMPACT', 'BLUE', 'MINIMAL');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "invoiceTemplate" "InvoiceTemplate" NOT NULL DEFAULT 'CLASSIC';
