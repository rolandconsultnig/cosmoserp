-- AP payment processing: batches, methods, early payment discount, payment status tracking

CREATE TYPE "ApPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'CASH');
CREATE TYPE "ApPaymentRequestApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ApPaymentBatchType" AS ENUM ('SINGLE', 'BATCH');
CREATE TYPE "ApPaymentBatchStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'EXECUTING', 'COMPLETED', 'PARTIALLY_FAILED', 'CANCELLED');
CREATE TYPE "ApPaymentBatchLineStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

ALTER TABLE "VendorBill" ADD COLUMN "earlyPaymentDiscountPercent" DECIMAL(8,6),
ADD COLUMN "earlyPaymentDeadline" TIMESTAMP(3);

ALTER TABLE "VendorBillPayment" ADD COLUMN "batchId" TEXT,
ADD COLUMN "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "journalPostedAt" TIMESTAMP(3);

CREATE TABLE "ApPaymentBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "batchType" "ApPaymentBatchType" NOT NULL DEFAULT 'BATCH',
    "status" "ApPaymentBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "autoExecute" BOOLEAN NOT NULL DEFAULT false,
    "approvalLevelsRequired" INTEGER NOT NULL DEFAULT 1,
    "approval1Status" "ApPaymentRequestApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById1" TEXT,
    "approvedAt1" TIMESTAMP(3),
    "approval2Status" "ApPaymentRequestApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approvedById2" TEXT,
    "approvedAt2" TIMESTAMP(3),
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "notes" TEXT,
    "createdById" TEXT,
    "executedAt" TIMESTAMP(3),
    "failureSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApPaymentBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApPaymentBatchLine" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "apMethod" "ApPaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "lineStatus" "ApPaymentBatchLineStatus" NOT NULL DEFAULT 'PENDING',
    "paymentId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApPaymentBatchLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApPaymentBatchLine_paymentId_key" ON "ApPaymentBatchLine"("paymentId");

CREATE UNIQUE INDEX "ApPaymentBatch_tenantId_reference_key" ON "ApPaymentBatch"("tenantId", "reference");
CREATE INDEX "ApPaymentBatch_tenantId_status_idx" ON "ApPaymentBatch"("tenantId", "status");
CREATE INDEX "ApPaymentBatch_tenantId_scheduledFor_idx" ON "ApPaymentBatch"("tenantId", "scheduledFor");

CREATE INDEX "ApPaymentBatchLine_batchId_idx" ON "ApPaymentBatchLine"("batchId");
CREATE INDEX "ApPaymentBatchLine_billId_idx" ON "ApPaymentBatchLine"("billId");

ALTER TABLE "ApPaymentBatch" ADD CONSTRAINT "ApPaymentBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ApPaymentBatchLine" ADD CONSTRAINT "ApPaymentBatchLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ApPaymentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApPaymentBatchLine" ADD CONSTRAINT "ApPaymentBatchLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApPaymentBatchLine" ADD CONSTRAINT "ApPaymentBatchLine_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "VendorBillPaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendorBillPayment" ADD CONSTRAINT "VendorBillPayment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ApPaymentBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApPaymentBatchLine" ADD CONSTRAINT "ApPaymentBatchLine_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "VendorBillPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "VendorBillPayment_tenantId_batchId_idx" ON "VendorBillPayment"("tenantId", "batchId");
CREATE INDEX "VendorBillPayment_tenantId_status_idx" ON "VendorBillPayment"("tenantId", "status");
