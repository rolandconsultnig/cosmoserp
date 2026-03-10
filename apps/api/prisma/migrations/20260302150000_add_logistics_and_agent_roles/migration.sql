-- Add FIELD_AGENT and CRM_MANAGER to UserRole (required for seed and agent portal)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FIELD_AGENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CRM_MANAGER';

-- CreateEnum (Logistics) - idempotent: skip if type already exists
DO $$ BEGIN
  CREATE TYPE "LogisticsStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "LogisticsAgentStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'OFFLINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "VehicleType" AS ENUM ('BIKE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DeliveryPriority" AS ENUM ('EXPRESS', 'STANDARD', 'ECONOMY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable LogisticsCompany (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "LogisticsCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "contactPerson" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "coverageAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logoUrl" TEXT,
    "cacNumber" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankCode" TEXT,
    "status" "LogisticsStatus" NOT NULL DEFAULT 'PENDING',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable LogisticsAgent (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "LogisticsAgent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "tenantId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "agentCode" TEXT,
    "vehicleType" "VehicleType",
    "vehiclePlate" TEXT,
    "coverageZone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "status" "LogisticsAgentStatus" NOT NULL DEFAULT 'PENDING',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "successRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable Delivery (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "Delivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "orderId" TEXT,
    "orderRef" TEXT,
    "invoiceRef" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "companyId" TEXT,
    "agentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "pickupAddress" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "packageDescription" TEXT,
    "packageWeight" DECIMAL(10,3),
    "packageSize" TEXT,
    "deliveryFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "platformCommission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "agentPayout" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING_PICKUP',
    "priority" "DeliveryPriority" NOT NULL DEFAULT 'STANDARD',
    "notes" TEXT,
    "proofOfDelivery" TEXT,
    "failureReason" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsCompany_email_key" ON "LogisticsCompany"("email");
CREATE INDEX IF NOT EXISTS "LogisticsCompany_status_idx" ON "LogisticsCompany"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsAgent_email_key" ON "LogisticsAgent"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "LogisticsAgent_agentCode_key" ON "LogisticsAgent"("agentCode");
CREATE INDEX IF NOT EXISTS "LogisticsAgent_companyId_idx" ON "LogisticsAgent"("companyId");
CREATE INDEX IF NOT EXISTS "LogisticsAgent_status_idx" ON "LogisticsAgent"("status");
CREATE INDEX IF NOT EXISTS "LogisticsAgent_tenantId_idx" ON "LogisticsAgent"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "Delivery_trackingNumber_key" ON "Delivery"("trackingNumber");
CREATE INDEX IF NOT EXISTS "Delivery_tenantId_idx" ON "Delivery"("tenantId");
CREATE INDEX IF NOT EXISTS "Delivery_agentId_idx" ON "Delivery"("agentId");
CREATE INDEX IF NOT EXISTS "Delivery_companyId_idx" ON "Delivery"("companyId");
CREATE INDEX IF NOT EXISTS "Delivery_status_idx" ON "Delivery"("status");
CREATE INDEX IF NOT EXISTS "Delivery_trackingNumber_idx" ON "Delivery"("trackingNumber");

-- AddForeignKey (idempotent: skip if constraint exists)
DO $$ BEGIN
  ALTER TABLE "LogisticsAgent" ADD CONSTRAINT "LogisticsAgent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "LogisticsCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LogisticsAgent" ADD CONSTRAINT "LogisticsAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "LogisticsCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "LogisticsAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
