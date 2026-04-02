-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('SUPPLIER', 'CONTRACTOR', 'UTILITY', 'SERVICE_PROVIDER', 'LOGISTICS', 'OTHER');

-- CreateEnum
CREATE TYPE "VendorRating" AS ENUM ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "accountHolderName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankCode" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "blacklistReason" TEXT,
ADD COLUMN     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN     "category" "VendorCategory" NOT NULL DEFAULT 'SUPPLIER',
ADD COLUMN     "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onTimeDeliveries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "performanceRating" "VendorRating" NOT NULL DEFAULT 'AVERAGE',
ADD COLUMN     "qualityIssues" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalOrders" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VendorPerformanceRating" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "rating" "VendorRating" NOT NULL,
    "feedback" TEXT,
    "ratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPerformanceRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorPerformanceRating_supplierId_idx" ON "VendorPerformanceRating"("supplierId");

-- CreateIndex
CREATE INDEX "Supplier_isBlacklisted_idx" ON "Supplier"("isBlacklisted");

-- AddForeignKey
ALTER TABLE "VendorPerformanceRating" ADD CONSTRAINT "VendorPerformanceRating_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
