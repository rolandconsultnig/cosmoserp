-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "kycFormData" JSONB,
ADD COLUMN "kycRejectionReason" TEXT;

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('CAC_CERTIFICATE', 'CAC_PARTICULARS', 'CAC_FORM', 'DIRECTOR_ID', 'DIRECTOR_PHOTO', 'PROOF_OF_ADDRESS', 'UTILITY_BILL', 'BANK_STATEMENT', 'TAX_CLEARANCE', 'OTHER');

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "notes" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDocument_tenantId_idx" ON "KycDocument"("tenantId");
CREATE INDEX "KycDocument_documentType_idx" ON "KycDocument"("documentType");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
