-- CreateTable
CREATE TABLE "InvoiceImport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "importType" TEXT NOT NULL DEFAULT 'CSV',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "duplicatesFound" INTEGER NOT NULL DEFAULT 0,
    "mappingConfig" JSONB,
    "createdById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceOCRData" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "ocrStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "extractedText" TEXT,
    "extractedData" JSONB,
    "confidence" DOUBLE PRECISION,
    "manualEdits" JSONB,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "validationNotes" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceOCRData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nextInvoiceDate" TIMESTAMP(3) NOT NULL,
    "lastInvoiceDate" TIMESTAMP(3),
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "description" TEXT,
    "lines" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "workflowStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "currentApprover" TEXT,
    "approverLevel" INTEGER NOT NULL DEFAULT 1,
    "maxApprovalLevels" INTEGER NOT NULL DEFAULT 2,
    "approvalHistory" JSONB,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "estimatedCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDuplicateCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "supplierId" TEXT,
    "vendorInvoiceNo" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "duplicateOf" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "matchReason" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "checkStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDuplicateCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceNumbering" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 1000,
    "prefix" TEXT NOT NULL DEFAULT 'INV',
    "suffix" TEXT,
    "formatPattern" TEXT NOT NULL DEFAULT '{PREFIX}-{NUMBER}-{YEAR}',
    "separator" TEXT NOT NULL DEFAULT '-',
    "yearFormat" TEXT NOT NULL DEFAULT 'YYYY',
    "resetFrequency" TEXT NOT NULL DEFAULT 'YEARLY',
    "lastResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceNumbering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceImport_tenantId_status_idx" ON "InvoiceImport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InvoiceImport_createdAt_idx" ON "InvoiceImport"("createdAt");

-- CreateIndex
CREATE INDEX "InvoiceOCRData_tenantId_ocrStatus_idx" ON "InvoiceOCRData"("tenantId", "ocrStatus");

-- CreateIndex
CREATE INDEX "InvoiceOCRData_invoiceId_idx" ON "InvoiceOCRData"("invoiceId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_tenantId_isActive_idx" ON "RecurringInvoice"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextInvoiceDate_idx" ON "RecurringInvoice"("nextInvoiceDate");

-- CreateIndex
CREATE INDEX "InvoiceApprovalWorkflow_tenantId_workflowStatus_idx" ON "InvoiceApprovalWorkflow"("tenantId", "workflowStatus");

-- CreateIndex
CREATE INDEX "InvoiceApprovalWorkflow_invoiceId_idx" ON "InvoiceApprovalWorkflow"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceApprovalWorkflow_currentApprover_idx" ON "InvoiceApprovalWorkflow"("currentApprover");

-- CreateIndex
CREATE INDEX "InvoiceDuplicateCheck_tenantId_isDuplicate_idx" ON "InvoiceDuplicateCheck"("tenantId", "isDuplicate");

-- CreateIndex
CREATE INDEX "InvoiceDuplicateCheck_invoiceId_idx" ON "InvoiceDuplicateCheck"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceDuplicateCheck_checkStatus_idx" ON "InvoiceDuplicateCheck"("checkStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceNumbering_tenantId_key" ON "InvoiceNumbering"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceNumbering_tenantId_idx" ON "InvoiceNumbering"("tenantId");

-- AddForeignKey
ALTER TABLE "InvoiceImport" ADD CONSTRAINT "InvoiceImport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceOCRData" ADD CONSTRAINT "InvoiceOCRData_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceApprovalWorkflow" ADD CONSTRAINT "InvoiceApprovalWorkflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDuplicateCheck" ADD CONSTRAINT "InvoiceDuplicateCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceNumbering" ADD CONSTRAINT "InvoiceNumbering_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
