-- POS Phase 1: add tenders and offline fields to POSSale
ALTER TABLE "POSSale" ADD COLUMN "tenders" JSONB;
ALTER TABLE "POSSale" ADD COLUMN "offline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "POSSale" ADD COLUMN "offlineId" TEXT;
ALTER TABLE "POSSale" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "POSSale" ADD COLUMN "terminalId" TEXT;

CREATE INDEX "POSSale_offline_createdAt_idx" ON "POSSale"("offline", "createdAt");
CREATE INDEX "POSSale_offlineId_idx" ON "POSSale"("offlineId");

