-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "onboardedByAgentId" TEXT;

-- CreateIndex
CREATE INDEX "Tenant_onboardedByAgentId_idx" ON "Tenant"("onboardedByAgentId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_onboardedByAgentId_fkey" FOREIGN KEY ("onboardedByAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
