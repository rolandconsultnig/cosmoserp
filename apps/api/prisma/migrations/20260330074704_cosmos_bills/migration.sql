-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM ('DRAFT', 'POSTED', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorBillLineMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'PARTIAL');

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillLine" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "poLineId" TEXT,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "whtRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL,
    "lineSubtotal" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "matchedQty" DECIMAL(18,3) NOT NULL,
    "matchStatus" "VendorBillLineMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "method" TEXT,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUCCESS',
    "gateway" TEXT,
    "gatewayRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_supplierId_idx" ON "VendorBill"("tenantId", "supplierId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_status_idx" ON "VendorBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_dueDate_idx" ON "VendorBill"("tenantId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_tenantId_billNumber_key" ON "VendorBill"("tenantId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_billId_idx" ON "VendorBillLine"("billId");

-- CreateIndex
CREATE INDEX "VendorBillLine_poLineId_idx" ON "VendorBillLine"("poLineId");

-- CreateIndex
CREATE INDEX "VendorBillLine_matchStatus_idx" ON "VendorBillLine"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBillPayment_reference_key" ON "VendorBillPayment"("reference");

-- CreateIndex
CREATE INDEX "VendorBillPayment_tenantId_billId_idx" ON "VendorBillPayment"("tenantId", "billId");

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_poLineId_fkey" FOREIGN KEY ("poLineId") REFERENCES "PurchaseOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillPayment" ADD CONSTRAINT "VendorBillPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillPayment" ADD CONSTRAINT "VendorBillPayment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
