-- Staff portal + HR: link Employee to User and add tables that existed in schema but were never migrated.

-- 1) Employee.userId (login link for staff portal)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Employee_userId_fkey'
  ) THEN
    ALTER TABLE "Employee"
      ADD CONSTRAINT "Employee_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 2) Enums
DO $$ BEGIN
  CREATE TYPE "EmployeeDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ResignationStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'WITHDRAWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) EmployeeDocument
CREATE TABLE IF NOT EXISTS "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "EmployeeDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployeeDocument_tenantId_idx" ON "EmployeeDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_tenantId_fkey') THEN
    ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_employeeId_fkey') THEN
    ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeDocument_uploadedById_fkey') THEN
    ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) LeaveRequest
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeaveRequest_tenantId_idx" ON "LeaveRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_tenantId_fkey') THEN
    ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_employeeId_fkey') THEN
    ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaveRequest_decidedById_fkey') THEN
    ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_decidedById_fkey"
      FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) Resignation
CREATE TABLE IF NOT EXISTS "Resignation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWorkingDate" TIMESTAMP(3),
    "reason" TEXT,
    "status" "ResignationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "Resignation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Resignation_tenantId_idx" ON "Resignation"("tenantId");
CREATE INDEX IF NOT EXISTS "Resignation_employeeId_idx" ON "Resignation"("employeeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resignation_tenantId_fkey') THEN
    ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resignation_employeeId_fkey') THEN
    ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resignation_decidedById_fkey') THEN
    ALTER TABLE "Resignation" ADD CONSTRAINT "Resignation_decidedById_fkey"
      FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) IntranetMessage
CREATE TABLE IF NOT EXISTS "IntranetMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntranetMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IntranetMessage_tenantId_idx" ON "IntranetMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "IntranetMessage_senderId_idx" ON "IntranetMessage"("senderId");
CREATE INDEX IF NOT EXISTS "IntranetMessage_recipientId_idx" ON "IntranetMessage"("recipientId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntranetMessage_tenantId_fkey') THEN
    ALTER TABLE "IntranetMessage" ADD CONSTRAINT "IntranetMessage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntranetMessage_senderId_fkey') THEN
    ALTER TABLE "IntranetMessage" ADD CONSTRAINT "IntranetMessage_senderId_fkey"
      FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntranetMessage_recipientId_fkey') THEN
    ALTER TABLE "IntranetMessage" ADD CONSTRAINT "IntranetMessage_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
