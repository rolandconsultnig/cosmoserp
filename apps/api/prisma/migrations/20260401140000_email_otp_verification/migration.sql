-- CreateEnum
CREATE TYPE "EmailOtpPurpose" AS ENUM ('TENANT_REGISTRATION', 'ERP_PASSWORD_RESET', 'ADMIN_PASSWORD_RESET', 'MARKETPLACE_REGISTRATION', 'MARKETPLACE_PASSWORD_RESET');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "Tenant" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "EmailOtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_idx" ON "EmailOtp"("email", "purpose");

-- CreateIndex
CREATE INDEX "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt");
