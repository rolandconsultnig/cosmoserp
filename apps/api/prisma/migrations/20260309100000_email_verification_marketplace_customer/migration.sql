-- Add email verification fields to MarketplaceCustomer
ALTER TABLE "MarketplaceCustomer" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketplaceCustomer" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "MarketplaceCustomer" ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3);
