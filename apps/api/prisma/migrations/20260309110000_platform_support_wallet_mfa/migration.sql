-- CHAT enum value added in 20260309105000_add_chat_to_ticket_channel (must be committed before use).

-- MFA and platform tickets on AdminUser
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;

-- MFA on User (tenant)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;

-- MFA on MarketplaceCustomer
ALTER TABLE "MarketplaceCustomer" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MarketplaceCustomer" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;

-- PlatformSupportTicket (use WEB_FORM default so this runs even if CHAT not yet added; set to CHAT in next migration)
CREATE TABLE IF NOT EXISTS "PlatformSupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "marketplaceCustomerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "channel" "TicketChannel" NOT NULL DEFAULT 'WEB_FORM',
    "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSupportTicket_ticketNumber_key" ON "PlatformSupportTicket"("ticketNumber");
CREATE INDEX IF NOT EXISTS "PlatformSupportTicket_status_idx" ON "PlatformSupportTicket"("status");
CREATE INDEX IF NOT EXISTS "PlatformSupportTicket_marketplaceCustomerId_idx" ON "PlatformSupportTicket"("marketplaceCustomerId");
CREATE INDEX IF NOT EXISTS "PlatformSupportTicket_assignedToAdminId_idx" ON "PlatformSupportTicket"("assignedToAdminId");
CREATE INDEX IF NOT EXISTS "PlatformSupportTicket_createdAt_idx" ON "PlatformSupportTicket"("createdAt");

DO $$ BEGIN
    ALTER TABLE "PlatformSupportTicket" ADD CONSTRAINT "PlatformSupportTicket_marketplaceCustomerId_fkey"
    FOREIGN KEY ("marketplaceCustomerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "PlatformSupportTicket" ADD CONSTRAINT "PlatformSupportTicket_assignedToAdminId_fkey"
    FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PlatformTicketComment
CREATE TABLE IF NOT EXISTS "PlatformTicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformTicketComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformTicketComment_ticketId_idx" ON "PlatformTicketComment"("ticketId");

DO $$ BEGIN
    ALTER TABLE "PlatformTicketComment" ADD CONSTRAINT "PlatformTicketComment_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "PlatformSupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CustomerWallet
CREATE TABLE IF NOT EXISTS "CustomerWallet" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerWallet_customerId_key" ON "CustomerWallet"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerWallet_customerId_idx" ON "CustomerWallet"("customerId");

DO $$ BEGIN
    ALTER TABLE "CustomerWallet" ADD CONSTRAINT "CustomerWallet_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "MarketplaceCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- WalletTransaction
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2),
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

DO $$ BEGIN
    ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "CustomerWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Escrow
CREATE TABLE IF NOT EXISTS "Escrow" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "marketplaceOrderId" TEXT,
    "buyerCustomerId" TEXT NOT NULL,
    "sellerTenantId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Escrow_marketplaceOrderId_idx" ON "Escrow"("marketplaceOrderId");
CREATE INDEX IF NOT EXISTS "Escrow_buyerCustomerId_idx" ON "Escrow"("buyerCustomerId");
CREATE INDEX IF NOT EXISTS "Escrow_status_idx" ON "Escrow"("status");
