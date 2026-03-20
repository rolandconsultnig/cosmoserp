-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "paystackRecipientCode" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalAccessToken" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalAccessTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_portalAccessToken_key" ON "Employee"("portalAccessToken");

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS "reversesEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_reversesEntryId_key" ON "JournalEntry"("reversesEntryId");

-- AddForeignKey
DO $$ BEGIN
 ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversesEntryId_fkey" FOREIGN KEY ("reversesEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MarketplaceSellerPayout" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paystackReference" TEXT,
    "paystackTransferCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSellerPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketplaceSellerPayout_orderId_idx" ON "MarketplaceSellerPayout"("orderId");
CREATE INDEX IF NOT EXISTS "MarketplaceSellerPayout_tenantId_idx" ON "MarketplaceSellerPayout"("tenantId");

DO $$ BEGIN
 ALTER TABLE "MarketplaceSellerPayout" ADD CONSTRAINT "MarketplaceSellerPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "MarketplaceSellerPayout" ADD CONSTRAINT "MarketplaceSellerPayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
