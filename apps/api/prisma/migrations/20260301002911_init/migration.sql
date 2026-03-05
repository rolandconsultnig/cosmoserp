-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LIMITED_LIABILITY', 'PUBLIC_LIMITED', 'NGO', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "KYCStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES', 'WAREHOUSE', 'HR', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "StockMoveType" AS ENUM ('PURCHASE_RECEIPT', 'SALE_DELIVERY', 'TRANSFER', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'OPENING_STOCK');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('B2B', 'B2G', 'B2C');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'CREDITED');

-- CreateEnum
CREATE TYPE "NRSStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('VAT', 'WHT', 'PAYE', 'CIT');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Cosmos ERP',
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "tradingName" TEXT,
    "tin" TEXT,
    "rcNumber" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "logoUrl" TEXT,
    "website" TEXT,
    "businessType" "BusinessType" NOT NULL DEFAULT 'SOLE_PROPRIETORSHIP',
    "industry" TEXT,
    "kycStatus" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "kycDocuments" JSONB,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycVerifiedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMarketplaceSeller" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "subscriptionStatus" "SubStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionEndsAt" TIMESTAMP(3),
    "nrsTaxpayerId" TEXT,
    "nrsRegisteredAt" TIMESTAMP(3),
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "bankSortCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubStatus" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "paystackSubCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL,
    "reference" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "subType" TEXT,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdById" TEXT,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCurrency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "tin" TEXT,
    "rcNumber" TEXT,
    "creditLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditUsed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "tin" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "costPrice" DECIMAL(18,2) NOT NULL,
    "sellingPrice" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "whtRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER NOT NULL DEFAULT 10,
    "reorderQty" INTEGER NOT NULL DEFAULT 50,
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "marketplaceDesc" TEXT,
    "landedCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hscode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "type" "StockMoveType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandedCost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "poId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "costType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "whtRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "quoteId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'B2B',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "amountPaid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "nrsIRN" TEXT,
    "nrsStamp" TEXT,
    "nrsQrCode" TEXT,
    "nrsSubmittedAt" TIMESTAMP(3),
    "nrsAcknowledgedAt" TIMESTAMP(3),
    "nrsStatus" "NRSStatus" NOT NULL DEFAULT 'PENDING',
    "nrsResponse" JSONB,
    "ublXml" TEXT,
    "paymentMethod" TEXT,
    "paystackRef" TEXT,
    "createdById" TEXT,
    "pdfUrl" TEXT,
    "whatsappSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.075,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "whtRate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "whtAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gateway" TEXT,
    "gatewayRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NRSLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "action" TEXT NOT NULL,
    "requestUrl" TEXT NOT NULL,
    "requestBody" JSONB,
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "irn" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NRSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaxType" NOT NULL,
    "period" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" "FilingStatus" NOT NULL DEFAULT 'DRAFT',
    "vatOutput" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatInput" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatPayable" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "whtPayable" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "filedAt" TIMESTAMP(3),
    "referenceNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxFiling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nin" TEXT,
    "bvn" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "employmentDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grossSalary" DECIMAL(18,2) NOT NULL,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "pensionPin" TEXT,
    "nhfNumber" TEXT,
    "taxId" TEXT,
    "payeeTaxBand" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL(18,2) NOT NULL,
    "totalPaye" DECIMAL(18,2) NOT NULL,
    "totalPension" DECIMAL(18,2) NOT NULL,
    "totalNhf" DECIMAL(18,2) NOT NULL,
    "totalItf" DECIMAL(18,2) NOT NULL,
    "totalNet" DECIMAL(18,2) NOT NULL,
    "nibssFile" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossSalary" DECIMAL(18,2) NOT NULL,
    "basicSalary" DECIMAL(18,2) NOT NULL,
    "housing" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "transport" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherAllowances" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payeeTax" DECIMAL(18,2) NOT NULL,
    "employeePension" DECIMAL(18,2) NOT NULL,
    "employerPension" DECIMAL(18,2) NOT NULL,
    "nhf" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "itf" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "comparePrice" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[],
    "tags" TEXT[],
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "searchVector" TEXT,
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "shippingClass" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "tenantId" TEXT,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "buyerName" TEXT NOT NULL,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "shippingCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "platformFee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sellerAmount" DECIMAL(18,2) NOT NULL,
    "paystackRef" TEXT,
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "deliveryAddress" JSONB NOT NULL,
    "deliveryMethod" TEXT,
    "trackingNumber" TEXT,
    "logisticsProvider" TEXT,
    "logisticsRef" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "vatAmount" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "commission" DECIMAL(18,2) NOT NULL,
    "sellerNet" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "MarketplaceOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_tin_key" ON "Tenant"("tin");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE INDEX "Tenant_kycStatus_idx" ON "Tenant"("kycStatus");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "Tenant"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_reference_key" ON "SubscriptionPayment"("reference");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Account_tenantId_type_idx" ON "Account"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_code_key" ON "Account"("tenantId", "code");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_date_idx" ON "JournalEntry"("tenantId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantCurrency_tenantId_code_key" ON "TenantCurrency"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_tenantId_code_key" ON "Warehouse"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_isMarketplace_idx" ON "Product"("isMarketplace");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "StockLevel_tenantId_idx" ON "StockLevel"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLevel_productId_warehouseId_key" ON "StockLevel"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productId_idx" ON "StockMovement"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockMovement_sourceType_sourceId_idx" ON "StockMovement"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "Quote_tenantId_idx" ON "Quote"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_tenantId_quoteNumber_key" ON "Quote"("tenantId", "quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_quoteId_key" ON "Invoice"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_nrsIRN_key" ON "Invoice"("nrsIRN");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_nrsStatus_idx" ON "Invoice"("nrsStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "NRSLog_tenantId_idx" ON "NRSLog"("tenantId");

-- CreateIndex
CREATE INDEX "NRSLog_invoiceId_idx" ON "NRSLog"("invoiceId");

-- CreateIndex
CREATE INDEX "NRSLog_createdAt_idx" ON "NRSLog"("createdAt");

-- CreateIndex
CREATE INDEX "TaxFiling_tenantId_idx" ON "TaxFiling"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_staffId_key" ON "Employee"("tenantId", "staffId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_idx" ON "PayrollRun"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_tenantId_month_year_key" ON "PayrollRun"("tenantId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollRunId_employeeId_key" ON "Payslip"("payrollRunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_slug_key" ON "MarketplaceListing"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceListing_tenantId_isActive_idx" ON "MarketplaceListing"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "MarketplaceListing_categoryId_idx" ON "MarketplaceListing"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_orderNumber_key" ON "MarketplaceOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_buyerEmail_idx" ON "MarketplaceOrder"("buyerEmail");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_status_idx" ON "MarketplaceOrder"("status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCurrency" ADD CONSTRAINT "TenantCurrency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandedCost" ADD CONSTRAINT "LandedCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NRSLog" ADD CONSTRAINT "NRSLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NRSLog" ADD CONSTRAINT "NRSLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxFiling" ADD CONSTRAINT "TaxFiling_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrderLine" ADD CONSTRAINT "MarketplaceOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrderLine" ADD CONSTRAINT "MarketplaceOrderLine_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
