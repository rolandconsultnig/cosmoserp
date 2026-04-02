-- CreateEnum
CREATE TYPE "GRNStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETE', 'REJECTED');

-- CreateEnum
CREATE TYPE "AmendmentType" AS ENUM ('QUANTITY_CHANGE', 'PRICE_CHANGE', 'DATE_CHANGE', 'CANCELLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AmendmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "MatchingType" AS ENUM ('TWO_WAY', 'THREE_WAY', 'GRN_ONLY', 'PARTIAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'PARTIAL_MATCH', 'UNMATCHED', 'VARIANCE', 'REJECTED');

-- CreateTable
CREATE TABLE "GoodsReceivedNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseId" TEXT,
    "notes" TEXT,
    "status" "GRNStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReceivedNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GRNLine" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poLineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "GRNLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderAmendment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "amendmentNumber" TEXT NOT NULL,
    "amendmentType" "AmendmentType" NOT NULL,
    "originalValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "status" "AmendmentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POMatching" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "grnId" TEXT,
    "invoiceId" TEXT,
    "matchingType" "MatchingType" NOT NULL,
    "poLineId" TEXT,
    "grnLineId" TEXT,
    "invoiceLineId" TEXT,
    "poQuantity" INTEGER,
    "grnQuantity" INTEGER,
    "invoiceQuantity" INTEGER,
    "poAmount" DECIMAL(18,2),
    "grnAmount" DECIMAL(18,2),
    "invoiceAmount" DECIMAL(18,2),
    "matchStatus" "MatchStatus" NOT NULL,
    "varianceReason" TEXT,
    "variancePercentage" DECIMAL(5,2),
    "approvedBy" TEXT,
    "approvalNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POMatching_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceivedNote_grnNumber_key" ON "GoodsReceivedNote"("grnNumber");

-- CreateIndex
CREATE INDEX "GoodsReceivedNote_tenantId_idx" ON "GoodsReceivedNote"("tenantId");

-- CreateIndex
CREATE INDEX "GoodsReceivedNote_poId_idx" ON "GoodsReceivedNote"("poId");

-- CreateIndex
CREATE INDEX "PurchaseOrderAmendment_tenantId_idx" ON "PurchaseOrderAmendment"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderAmendment_poId_idx" ON "PurchaseOrderAmendment"("poId");

-- CreateIndex
CREATE INDEX "POMatching_tenantId_idx" ON "POMatching"("tenantId");

-- CreateIndex
CREATE INDEX "POMatching_poId_idx" ON "POMatching"("poId");

-- CreateIndex
CREATE INDEX "POMatching_grnId_idx" ON "POMatching"("grnId");

-- CreateIndex
CREATE INDEX "POMatching_invoiceId_idx" ON "POMatching"("invoiceId");

-- AddForeignKey
ALTER TABLE "GoodsReceivedNote" ADD CONSTRAINT "GoodsReceivedNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivedNote" ADD CONSTRAINT "GoodsReceivedNote_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceivedNote" ADD CONSTRAINT "GoodsReceivedNote_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNLine" ADD CONSTRAINT "GRNLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivedNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GRNLine" ADD CONSTRAINT "GRNLine_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderAmendment" ADD CONSTRAINT "PurchaseOrderAmendment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderAmendment" ADD CONSTRAINT "PurchaseOrderAmendment_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POMatching" ADD CONSTRAINT "POMatching_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POMatching" ADD CONSTRAINT "POMatching_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POMatching" ADD CONSTRAINT "POMatching_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GoodsReceivedNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POMatching" ADD CONSTRAINT "POMatching_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "VendorBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
