const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ROUNDS = 12;

const DEMO_ADMIN_EMAIL = 'sam@afrinict.net';
const DEMO_ERP_EMAIL = 'tochi@afrinict.com';
const DEMO_POS_EMAIL = 'andpos@afrinict.net';
const DEMO_LOGISTICS_EMAIL = 'ogadriver@afrinict.com';

async function main() {
  console.log('🌱 Seeding Mixtio ERP database...');

  // ── Remove any old demo admin accounts (keep only the designated admin) ─────
  const existingAdmins = await prisma.adminUser.findMany({ select: { email: true } });
  const toRemoveAdmins = existingAdmins.filter((a) => a.email !== DEMO_ADMIN_EMAIL);
  if (toRemoveAdmins.length > 0) {
    await prisma.adminUser.deleteMany({
      where: { email: { in: toRemoveAdmins.map((a) => a.email) } },
    });
    console.log(`✅ Removed ${toRemoveAdmins.length} old demo admin account(s)`);
  }

  // ── Admin (AdminUser) ───────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Samolan123@', ROUNDS);
  await prisma.adminUser.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { passwordHash: adminHash, firstName: 'Sam', lastName: 'Olan', role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: adminHash,
      firstName: 'Sam',
      lastName: 'Olan',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin user: ${DEMO_ADMIN_EMAIL}`);

  // ── ERP demo tenant + user (User) ───────────────────────────────────────────
  let tenant = await prisma.tenant.findUnique({ where: { email: 'erp@afrinict.com' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        businessName: 'AfriNICT ERP Demo',
        tradingName: 'AfriNICT Demo',
        email: 'erp@afrinict.com',
        phone: '08000000000',
        address: 'Lagos',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        businessType: 'LIMITED_LIABILITY',
        industry: 'Technology',
        kycStatus: 'APPROVED',
        kycVerifiedAt: new Date(),
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log('✅ Tenant created: AfriNICT ERP Demo');
  }

  // New schema: marketplace seller + Paystack transfer bank fields (demo / test values)
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      isMarketplaceSeller: true,
      bankName: 'Guaranty Trust Bank (demo)',
      bankAccountNumber: '0123456789',
      bankAccountName: 'AfriNICT ERP Demo Ltd',
      bankSortCode: '058',
    },
  });
  console.log('✅ Tenant: marketplace seller + demo payout bank (bankSortCode 058)');

  const erpHash = await bcrypt.hash('Tobechi123@', ROUNDS);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: DEMO_ERP_EMAIL } },
    update: { passwordHash: erpHash, firstName: 'Tochi', lastName: 'User', role: 'OWNER', isActive: true },
    create: {
      tenantId: tenant.id,
      email: DEMO_ERP_EMAIL,
      passwordHash: erpHash,
      firstName: 'Tochi',
      lastName: 'User',
      role: 'OWNER',
      isActive: true,
    },
  });
  console.log(`✅ ERP user: ${DEMO_ERP_EMAIL}`);

  // ── Tenant admin (ADMIN role — full ERP access except owner-only safeguards) ─
  const DEMO_TENANT_ADMIN_EMAIL = 'tenant.admin@afrinict.net';
  const tenantAdminHash = await bcrypt.hash('TenantAdmin123@', ROUNDS);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: DEMO_TENANT_ADMIN_EMAIL } },
    update: {
      passwordHash: tenantAdminHash,
      firstName: 'Tenant',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      email: DEMO_TENANT_ADMIN_EMAIL,
      passwordHash: tenantAdminHash,
      firstName: 'Tenant',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ ERP tenant admin: ${DEMO_TENANT_ADMIN_EMAIL}`);

  // ── POS user (Android / same tenant, for POS login) ─────────────────────────
  const posHash = await bcrypt.hash('PoS123@', ROUNDS);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: DEMO_POS_EMAIL } },
    update: { passwordHash: posHash, firstName: 'POS', lastName: 'Android', role: 'STAFF', isActive: true },
    create: {
      tenantId: tenant.id,
      email: DEMO_POS_EMAIL,
      passwordHash: posHash,
      firstName: 'POS',
      lastName: 'Android',
      role: 'STAFF',
      isActive: true,
    },
  });
  console.log(`✅ POS user (Android): ${DEMO_POS_EMAIL}`);

  // ── Logistics company + agent (new schema: company for auto-assign) ───────────
  const DEMO_LOGISTICS_COMPANY_EMAIL = 'dispatch@afrinict.com';
  const companyPassHash = await bcrypt.hash('LogisticsCo123@', ROUNDS);
  const logisticsCompany = await prisma.logisticsCompany.upsert({
    where: { email: DEMO_LOGISTICS_COMPANY_EMAIL },
    update: {
      name: 'Demo Dispatch Co',
      phone: '08000000002',
      password: companyPassHash,
      contactPerson: 'Dispatch Admin',
      city: 'Lagos',
      state: 'Lagos',
      coverageAreas: ['Lagos', 'Abuja'],
      status: 'APPROVED',
      isActive: true,
    },
    create: {
      email: DEMO_LOGISTICS_COMPANY_EMAIL,
      name: 'Demo Dispatch Co',
      phone: '08000000002',
      password: companyPassHash,
      contactPerson: 'Dispatch Admin',
      city: 'Lagos',
      state: 'Lagos',
      coverageAreas: ['Lagos', 'Abuja'],
      status: 'APPROVED',
      isActive: true,
    },
  });
  console.log(`✅ Logistics company: ${DEMO_LOGISTICS_COMPANY_EMAIL}`);

  const logisticsHash = await bcrypt.hash('Driver123@', ROUNDS);
  await prisma.logisticsAgent.upsert({
    where: { email: DEMO_LOGISTICS_EMAIL },
    update: {
      password: logisticsHash,
      firstName: 'Oga',
      lastName: 'Driver',
      phone: '08000000001',
      status: 'ACTIVE',
      tenantId: tenant.id,
      companyId: logisticsCompany.id,
    },
    create: {
      email: DEMO_LOGISTICS_EMAIL,
      password: logisticsHash,
      firstName: 'Oga',
      lastName: 'Driver',
      phone: '08000000001',
      status: 'ACTIVE',
      tenantId: tenant.id,
      companyId: logisticsCompany.id,
    },
  });
  console.log(`✅ Logistics agent: ${DEMO_LOGISTICS_EMAIL} (company + tenant linked)`);

  // ── Product Categories (reference data) ──────────────────────────────────────
  const categories = [
    { name: 'Electronics', slug: 'electronics', description: 'Electronic devices and accessories' },
    { name: 'Power & Energy', slug: 'power-energy', description: 'Generators, inverters, solar equipment' },
    { name: 'Building Materials', slug: 'building-materials', description: 'Construction and building supplies' },
    { name: 'Food & Beverages', slug: 'food-beverages', description: 'Food products and drinks' },
    { name: 'Fashion & Apparel', slug: 'fashion-apparel', description: 'Clothing, shoes, and accessories' },
    { name: 'Automobile', slug: 'automobile', description: 'Auto parts and accessories' },
    { name: 'Agriculture', slug: 'agriculture', description: 'Farm produce and agricultural supplies' },
    { name: 'Health & Beauty', slug: 'health-beauty', description: 'Health, beauty, and personal care' },
    { name: 'Office Supplies', slug: 'office-supplies', description: 'Stationery and office equipment' },
    { name: 'Industrial & Manufacturing', slug: 'industrial', description: 'Industrial equipment and supplies' },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }
  console.log('✅ Product categories created');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Access credentials:');
  console.log('   Admin:       sam@afrinict.net / Samolan123@');
  console.log('   ERP (owner): tochi@afrinict.com / Tobechi123@');
  console.log('   ERP (tenant admin): tenant.admin@afrinict.net / TenantAdmin123@');
  console.log('   POS (Android): andpos@afrinict.net / PoS123@');
  console.log('   Logistics co: dispatch@afrinict.com / LogisticsCo123@');
  console.log('   Logistics agent: ogadriver@afrinict.com / Driver123@');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
