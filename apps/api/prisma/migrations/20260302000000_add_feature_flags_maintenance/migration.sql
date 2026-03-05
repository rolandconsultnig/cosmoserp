-- AlterTable
ALTER TABLE "Platform" ADD COLUMN "featureFlags" JSONB,
ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maintenanceMessage" TEXT;
