-- CreateEnum
CREATE TYPE "POSPayMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'SPLIT');

-- CreateEnum
CREATE TYPE "POSSaleStatus" AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED');

-- CreateTable
CREATE TABLE "POSSale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "cashierId" TEXT NOT NULL,
    "registerId" TEXT,
    "paymentMethod" "POSPayMethod" NOT NULL DEFAULT 'CASH',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "amountTendered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "changeDue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "POSSaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POSSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POSSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "POSSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "POSSale_tenantId_createdAt_idx" ON "POSSale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "POSSale_tenantId_cashierId_idx" ON "POSSale"("tenantId", "cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "POSSale_tenantId_receiptNumber_key" ON "POSSale"("tenantId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "POSSale" ADD CONSTRAINT "POSSale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSale" ADD CONSTRAINT "POSSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSale" ADD CONSTRAINT "POSSale_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSaleLine" ADD CONSTRAINT "POSSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "POSSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POSSaleLine" ADD CONSTRAINT "POSSaleLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
