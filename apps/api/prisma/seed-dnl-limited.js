/**
 * Create (or refresh) ERP tenant "DNL Limited" with owner login.
 * Idempotent: safe to run multiple times.
 *
 *   cd apps/api && node prisma/seed-dnl-limited.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const ROUNDS = 12;

const BUSINESS_NAME = 'DNL Limited';
const TENANT_EMAIL = 'erp@dnllimited.ng';
const OWNER_PASSWORD = 'DnlLimited2026!';
const PHONE = '+2348000000002';

async function createDefaultChartOfAccounts(tx, tenantId) {
  const accounts = [
    { code: '1000', name: 'Cash and Bank', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1200', name: 'Inventory', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1500', name: 'Fixed Assets', type: 'ASSET', subType: 'Non-Current Asset', isSystemAccount: true },
    { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', subType: 'Non-Current Asset', isSystemAccount: true },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2100', name: 'VAT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2110', name: 'VAT Recoverable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2200', name: 'WHT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2300', name: 'PAYE Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2310', name: 'Pension Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2400', name: 'Loans Payable', type: 'LIABILITY', subType: 'Non-Current Liability', isSystemAccount: true },
    { code: '3000', name: "Owner's Equity", type: 'EQUITY', subType: 'Equity', isSystemAccount: true },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subType: 'Equity', isSystemAccount: true },
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true },
    { code: '4900', name: 'Other Income', type: 'REVENUE', subType: 'Other Revenue', isSystemAccount: true },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', subType: 'Cost of Sales', isSystemAccount: true },
    { code: '5100', name: 'Salaries & Wages', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true },
    { code: '5200', name: 'Rent & Utilities', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true },
    { code: '5300', name: 'Marketing & Advertising', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true },
    { code: '5400', name: 'Depreciation', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true },
    { code: '5500', name: 'Bank Charges', type: 'EXPENSE', subType: 'Financial Expense', isSystemAccount: true },
    { code: '5900', name: 'Miscellaneous Expense', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true },
  ];

  await tx.account.createMany({
    data: accounts.map((a) => ({ ...a, tenantId })),
    skipDuplicates: true,
  });

  await tx.tenantCurrency.createMany({
    data: [
      { tenantId, code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exchangeRate: 1, isBase: true },
      { tenantId, code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1550 },
      { tenantId, code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 1980 },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  const email = TENANT_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, ROUNDS);

  let tenant = await prisma.tenant.findUnique({ where: { email } });

  if (tenant) {
    const owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email, role: 'OWNER' },
    });
    if (owner) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { passwordHash, isActive: true },
      });
      console.log('✅ DNL Limited tenant already exists — owner password updated.');
    } else {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: 'DNL',
          lastName: 'Limited',
          role: 'OWNER',
          isActive: true,
        },
      });
      console.log('✅ DNL Limited tenant exists — created missing owner user.');
    }
    await createDefaultChartOfAccounts(prisma, tenant.id);
  } else {
    const trialEndsAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(async (tx) => {
      tenant = await tx.tenant.create({
        data: {
          businessName: BUSINESS_NAME,
          tradingName: BUSINESS_NAME,
          email,
          phone: PHONE,
          address: 'Lagos',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          businessType: 'LIMITED_LIABILITY',
          industry: 'General',
          kycStatus: 'APPROVED',
          kycVerifiedAt: new Date(),
          subscriptionPlan: 'GROWTH',
          subscriptionStatus: 'ACTIVE',
          subscriptionEndsAt: trialEndsAt,
          trialEndsAt,
        },
      });

      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName: 'DNL',
          lastName: 'Limited',
          role: 'OWNER',
          isActive: true,
        },
      });

      await createDefaultChartOfAccounts(tx, tenant.id);
    });
    console.log('✅ DNL Limited tenant created with chart of accounts.');
  }

  console.log('\n📋 DNL Limited — ERP login');
  console.log(`   Business: ${BUSINESS_NAME}`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${OWNER_PASSWORD}`);
  console.log('   Sign in:  ERP web app → Login\n');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
