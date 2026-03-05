const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Cosmos ERP database...');

  // ── Super Admin ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'Admin@Cosmos2024!', 12);
  await prisma.adminUser.upsert({
    where: { email: process.env.SUPER_ADMIN_EMAIL || 'admin@rolandconsult.ng' },
    update: {},
    create: {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@rolandconsult.ng',
      passwordHash: adminHash,
      firstName: 'Roland',
      lastName: 'Consult',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Super admin created');

  // ── Product Categories ────────────────────────────────────────────────────────
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

  // ── Demo Tenant (Lagos Trading Co.) ──────────────────────────────────────────
  const demoHash = await bcrypt.hash('Demo@12345', 12);
  let demoTenant = await prisma.tenant.findUnique({ where: { email: 'demo@lagostrading.ng' } });

  if (!demoTenant) {
    demoTenant = await prisma.tenant.create({
      data: {
        businessName: 'Lagos Trading Company Ltd',
        tradingName: 'LTC Stores',
        email: 'demo@lagostrading.ng',
        phone: '08012345678',
        address: '15 Broad Street',
        city: 'Lagos',
        state: 'Lagos',
        tin: '12345678-0001',
        rcNumber: 'RC-789456',
        businessType: 'LIMITED_LIABILITY',
        industry: 'Wholesale & Retail Trade',
        kycStatus: 'APPROVED',
        kycVerifiedAt: new Date(),
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
        subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        bankName: 'First Bank of Nigeria',
        bankAccountNumber: '3012345678',
        bankAccountName: 'Lagos Trading Company Ltd',
        bankSortCode: '011',
        isMarketplaceSeller: true,
        nrsTaxpayerId: 'NRS-LTC-001',
      },
    });

    // Owner user
    await prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        email: 'demo@lagostrading.ng',
        passwordHash: demoHash,
        firstName: 'Adewale',
        lastName: 'Okonkwo',
        role: 'OWNER',
      },
    });

    // Additional users
    await prisma.user.createMany({
      data: [
        { tenantId: demoTenant.id, email: 'accountant@lagostrading.ng', passwordHash: demoHash, firstName: 'Ngozi', lastName: 'Eze', role: 'ACCOUNTANT' },
        { tenantId: demoTenant.id, email: 'sales@lagostrading.ng', passwordHash: demoHash, firstName: 'Emeka', lastName: 'Nwosu', role: 'SALES' },
        { tenantId: demoTenant.id, email: 'warehouse@lagostrading.ng', passwordHash: demoHash, firstName: 'Fatima', lastName: 'Bello', role: 'WAREHOUSE' },
      ],
    });

    // Default Chart of Accounts
    const accounts = [
      { code: '1000', name: 'Cash and Bank', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
      { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true, balance: 1250000 },
      { code: '1200', name: 'Inventory', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true, balance: 3800000 },
      { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
      { code: '1500', name: 'Fixed Assets', type: 'ASSET', subType: 'Non-Current Asset', isSystemAccount: true, balance: 5000000 },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true, balance: 850000 },
      { code: '2100', name: 'VAT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true, balance: 45000 },
      { code: '2110', name: 'VAT Recoverable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
      { code: '2200', name: 'WHT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
      { code: '2300', name: 'PAYE Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true, balance: 120000 },
      { code: '2310', name: 'Pension Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true, balance: 96000 },
      { code: '3000', name: "Owner's Equity", type: 'EQUITY', subType: 'Equity', isSystemAccount: true, balance: 8000000 },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subType: 'Equity', isSystemAccount: true, balance: 1035000 },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true, balance: 12500000 },
      { code: '4100', name: 'Service Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true, balance: 850000 },
      { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE', subType: 'Cost of Sales', isSystemAccount: true, balance: 8200000 },
      { code: '5100', name: 'Salaries & Wages', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true, balance: 960000 },
      { code: '5200', name: 'Rent & Utilities', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true, balance: 480000 },
      { code: '5300', name: 'Marketing & Advertising', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true, balance: 120000 },
      { code: '5500', name: 'Bank Charges', type: 'EXPENSE', subType: 'Financial Expense', isSystemAccount: true, balance: 15000 },
      { code: '5900', name: 'Miscellaneous Expense', type: 'EXPENSE', subType: 'Operating Expense', isSystemAccount: true, balance: 45000 },
    ];

    await prisma.account.createMany({
      data: accounts.map((a) => ({ ...a, tenantId: demoTenant.id })),
      skipDuplicates: true,
    });

    // Currencies
    await prisma.tenantCurrency.createMany({
      data: [
        { tenantId: demoTenant.id, code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exchangeRate: 1, isBase: true },
        { tenantId: demoTenant.id, code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1580 },
        { tenantId: demoTenant.id, code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 2010 },
      ],
    });

    // Warehouses
    const lagoswh = await prisma.warehouse.create({
      data: { tenantId: demoTenant.id, name: 'Lagos Main Warehouse', code: 'LGS-MAIN', address: '15 Apapa Road', city: 'Lagos', state: 'Lagos', isDefault: true },
    });
    const kanowh = await prisma.warehouse.create({
      data: { tenantId: demoTenant.id, name: 'Kano Distribution Centre', code: 'KNO-DIST', address: '8 Bompai Road', city: 'Kano', state: 'Kano' },
    });

    // Customers
    const customers = await prisma.customer.createMany({
      data: [
        { tenantId: demoTenant.id, name: 'Alhaji Sule Enterprises', email: 'sule@enterprises.ng', phone: '08023456789', whatsapp: '2348023456789', address: '5 Kano Road', city: 'Kano', state: 'Kano', tin: '22334455-0001', creditLimit: 2000000, currency: 'NGN' },
        { tenantId: demoTenant.id, name: 'Mama Nkechi Superstore', email: 'nkechi@superstore.ng', phone: '08034567890', whatsapp: '2348034567890', address: '7 Aba Road', city: 'Port Harcourt', state: 'Rivers', creditLimit: 1500000, currency: 'NGN' },
        { tenantId: demoTenant.id, name: 'Federal Ministry of Works', email: 'procurement@fmw.gov.ng', phone: '09012345678', address: '1 Aguiyi-Ironsi Street', city: 'Abuja', state: 'FCT', tin: '99887766-0001', currency: 'NGN' },
        { tenantId: demoTenant.id, name: 'Sunrise Hardware Ltd', email: 'sunrise@hardware.ng', phone: '08045678901', address: '12 Balogun Market', city: 'Lagos', state: 'Lagos', creditLimit: 500000, currency: 'NGN' },
      ],
    });

    // Supplier
    const supplier = await prisma.supplier.create({
      data: { tenantId: demoTenant.id, name: 'Dangote Industries Plc', email: 'supply@dangote.com', phone: '01-2345678', address: 'Union Marble House', city: 'Lagos', state: 'Lagos', tin: '10203040-0001', currency: 'NGN', paymentTerms: 30 },
    });

    // Products
    const powerCat = await prisma.productCategory.findUnique({ where: { slug: 'power-energy' } });
    const electroCat = await prisma.productCategory.findUnique({ where: { slug: 'electronics' } });

    const products = [
      { sku: 'GEN-6500', name: 'Sumec Firman 6.5KVA Generator', categoryId: powerCat?.id, costPrice: 385000, sellingPrice: 480000, reorderPoint: 5, reorderQty: 10, unit: 'unit', barcode: '8901234567890', hscode: '8502110000', isMarketplace: true },
      { sku: 'INV-5KVA', name: 'Felicity Solar Inverter 5KVA', categoryId: powerCat?.id, costPrice: 275000, sellingPrice: 340000, reorderPoint: 3, reorderQty: 6, unit: 'unit', barcode: '8901234567891', isMarketplace: true },
      { sku: 'SOL-300W', name: 'Jinko Solar Panel 300W Monocrystalline', categoryId: powerCat?.id, costPrice: 95000, sellingPrice: 125000, reorderPoint: 10, reorderQty: 20, unit: 'unit', barcode: '8901234567892', isMarketplace: true },
      { sku: 'LAPTOP-HP15', name: 'HP Laptop 15.6" Core i5 16GB RAM', categoryId: electroCat?.id, costPrice: 420000, sellingPrice: 520000, reorderPoint: 5, reorderQty: 10, unit: 'unit', barcode: '8901234567893', isMarketplace: true },
      { sku: 'PHONE-S24', name: 'Samsung Galaxy S24 256GB', categoryId: electroCat?.id, costPrice: 580000, sellingPrice: 720000, reorderPoint: 5, reorderQty: 10, unit: 'unit', barcode: '8901234567894', isMarketplace: true },
      { sku: 'BATT-200AH', name: 'Luminous Battery 200AH Deep Cycle', categoryId: powerCat?.id, costPrice: 145000, sellingPrice: 185000, reorderPoint: 8, reorderQty: 15, unit: 'unit', barcode: '8901234567895', isMarketplace: true },
    ];

    for (const prod of products) {
      const p = await prisma.product.create({ data: { tenantId: demoTenant.id, vatRate: 0.075, whtRate: 0, ...prod } });

      // Set initial stock
      const lagosQty = Math.floor(Math.random() * 20) + 5;
      const kanoQty = Math.floor(Math.random() * 10) + 2;

      await prisma.stockLevel.createMany({
        data: [
          { tenantId: demoTenant.id, productId: p.id, warehouseId: lagoswh.id, quantity: lagosQty },
          { tenantId: demoTenant.id, productId: p.id, warehouseId: kanowh.id, quantity: kanoQty },
        ],
      });

      if (prod.isMarketplace) {
        const { slugify } = require('../src/utils/helpers');
        const slug = `${slugify(prod.name)}-${p.id.slice(0, 8)}`;
        await prisma.marketplaceListing.create({
          data: {
            tenantId: demoTenant.id,
            productId: p.id,
            title: prod.name,
            description: `Premium quality ${prod.name}. Available for fast delivery nationwide.`,
            price: prod.sellingPrice,
            currency: 'NGN',
            stock: lagosQty + kanoQty,
            images: [],
            slug,
            isActive: true,
            isFeatured: true,
            publishedAt: new Date(),
          },
        });
      }
    }

    // Employees
    const employees = [
      { staffId: 'EMP-0001', firstName: 'Adewale', lastName: 'Okonkwo', email: 'adewale@lagostrading.ng', phone: '08012345678', department: 'Management', jobTitle: 'Managing Director', grossSalary: 500000, bankName: 'First Bank', bankAccountNumber: '3012345678', pensionPin: 'PEN-001', nhfNumber: 'NHF-001' },
      { staffId: 'EMP-0002', firstName: 'Ngozi', lastName: 'Eze', email: 'ngozi@lagostrading.ng', department: 'Finance', jobTitle: 'Chief Accountant', grossSalary: 300000, bankName: 'GTBank', bankAccountNumber: '0123456789' },
      { staffId: 'EMP-0003', firstName: 'Emeka', lastName: 'Nwosu', email: 'emeka@lagostrading.ng', department: 'Sales', jobTitle: 'Sales Manager', grossSalary: 250000, bankName: 'Zenith Bank', bankAccountNumber: '2012345678' },
      { staffId: 'EMP-0004', firstName: 'Fatima', lastName: 'Bello', email: 'fatima@lagostrading.ng', department: 'Warehouse', jobTitle: 'Warehouse Supervisor', grossSalary: 180000, bankName: 'Access Bank', bankAccountNumber: '0712345678' },
      { staffId: 'EMP-0005', firstName: 'Chukwudi', lastName: 'Obi', email: 'chukwudi@lagostrading.ng', department: 'Sales', jobTitle: 'Sales Representative', grossSalary: 150000, bankName: 'UBA', bankAccountNumber: '2112345678' },
    ];

    await prisma.employee.createMany({
      data: employees.map((e) => ({ tenantId: demoTenant.id, employmentType: 'FULL_TIME', employmentDate: new Date('2023-01-01'), isActive: true, ...e })),
    });

    console.log('✅ Demo tenant created: Lagos Trading Company Ltd');
    console.log('   📧 Login: demo@lagostrading.ng / Demo@12345');
  } else {
    console.log('ℹ️  Demo tenant already exists, skipping');
  }

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Access credentials:');
  console.log('   Super Admin: admin@rolandconsult.ng / Admin@Cosmos2024!');
  console.log('   Demo Tenant: demo@lagostrading.ng / Demo@12345');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
