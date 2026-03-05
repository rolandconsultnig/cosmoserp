-- CreateEnum
CREATE TYPE "TicketChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'WALK_IN', 'WEB_FORM');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GENERAL', 'BILLING', 'TECHNICAL', 'DELIVERY', 'COMPLAINT', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'NO_ANSWER', 'VOICEMAIL', 'BUSY', 'FAILED');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "channel" "TicketChannel" NOT NULL DEFAULT 'EMAIL',
    "category" "TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "agentId" TEXT,
    "direction" "CallDirection" NOT NULL DEFAULT 'INBOUND',
    "outcome" "CallOutcome" NOT NULL DEFAULT 'CONNECTED',
    "durationSeconds" INTEGER,
    "notes" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_idx" ON "SupportTicket"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_createdAt_idx" ON "SupportTicket"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_tenantId_ticketNumber_key" ON "SupportTicket"("tenantId", "ticketNumber");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "CallLog_tenantId_createdAt_idx" ON "CallLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "CallLog_ticketId_idx" ON "CallLog"("ticketId");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
