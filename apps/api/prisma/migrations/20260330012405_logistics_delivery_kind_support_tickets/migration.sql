-- CreateEnum
CREATE TYPE "DeliveryKind" AS ENUM ('STANDARD', 'RETURN');

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "deliveryKind" "DeliveryKind" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "enabledModules" JSONB;

-- CreateTable
CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsSupportTicket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "agentId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_idx" ON "WebAuthnChallenge"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_expiresAt_idx" ON "WebAuthnChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "LogisticsSupportTicket_companyId_idx" ON "LogisticsSupportTicket"("companyId");

-- CreateIndex
CREATE INDEX "LogisticsSupportTicket_agentId_idx" ON "LogisticsSupportTicket"("agentId");

-- CreateIndex
CREATE INDEX "LogisticsSupportTicket_status_idx" ON "LogisticsSupportTicket"("status");

-- AddForeignKey
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsSupportTicket" ADD CONSTRAINT "LogisticsSupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "LogisticsCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsSupportTicket" ADD CONSTRAINT "LogisticsSupportTicket_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "LogisticsAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
