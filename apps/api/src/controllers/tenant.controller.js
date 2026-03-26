const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

async function register(req, res) {
  try {
    const { businessName, email, phone, password, address, city, state, tin, rcNumber, businessType, industry } = req.body;
    if (!businessName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Business name, email, phone, and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existingTenant = await prisma.tenant.findUnique({ where: { email: email.toLowerCase() } });
    if (existingTenant) return res.status(409).json({ error: 'A business with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          businessName,
          email: email.toLowerCase(),
          phone,
          address: address || '',
          city: city || '',
          state: state || '',
          tin,
          rcNumber,
          businessType: businessType || 'SOLE_PROPRIETORSHIP',
          industry,
          kycStatus: 'PENDING',
          subscriptionPlan: 'STARTER',
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
        },
      });

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
          passwordHash,
          firstName: businessName,
          lastName: 'Admin',
          role: 'OWNER',
        },
      });

      // Create default chart of accounts
      await createDefaultChartOfAccounts(tx, tenant.id);

      return { tenant, owner };
    });

    logger.info(`New tenant registered: ${businessName} (${email})`);
    res.status(201).json({
      message: 'Business registered successfully. Your 5-day free trial has started. Please complete KYC to unlock all features.',
      tenantId: result.tenant.id,
      trialEndsAt,
    });
  } catch (error) {
    logger.error('Tenant registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

async function createDefaultChartOfAccounts(tx, tenantId) {
  const accounts = [
    // Assets
    { code: '1000', name: 'Cash and Bank', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1200', name: 'Inventory', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', subType: 'Current Asset', isSystemAccount: true },
    { code: '1500', name: 'Fixed Assets', type: 'ASSET', subType: 'Non-Current Asset', isSystemAccount: true },
    { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET', subType: 'Non-Current Asset', isSystemAccount: true },
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2100', name: 'VAT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2110', name: 'VAT Recoverable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2200', name: 'WHT Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2300', name: 'PAYE Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2310', name: 'Pension Payable', type: 'LIABILITY', subType: 'Current Liability', isSystemAccount: true },
    { code: '2400', name: 'Loans Payable', type: 'LIABILITY', subType: 'Non-Current Liability', isSystemAccount: true },
    // Equity
    { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', subType: 'Equity', isSystemAccount: true },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', subType: 'Equity', isSystemAccount: true },
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true },
    { code: '4100', name: 'Service Revenue', type: 'REVENUE', subType: 'Operating Revenue', isSystemAccount: true },
    { code: '4900', name: 'Other Income', type: 'REVENUE', subType: 'Other Revenue', isSystemAccount: true },
    // Expenses
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

  // Set up default currencies
  await tx.tenantCurrency.createMany({
    data: [
      { tenantId, code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exchangeRate: 1, isBase: true },
      { tenantId, code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1550 },
      { tenantId, code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 1980 },
    ],
    skipDuplicates: true,
  });
}

async function getMyTenant(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      include: {
        currencies: true,
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { users: true, products: true, customers: true, invoices: true, employees: true } },
      },
    });
    res.json({ data: tenant });
  } catch (error) {
    logger.error('Get tenant error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
}

/** Fields tenants may not change themselves (legal / registration identity). */
const TENANT_SELF_SERVICE_LOCKED = new Set([
  'businessName',
  'tradingName',
  'email',
  'address',
  'city',
  'state',
  'country',
  'tin',
  'rcNumber',
  'businessType',
  'nrsTaxpayerId',
  'isMarketplaceSeller',
  'kycStatus',
  'kycDocuments',
  'kycFormData',
  'kycRejectionReason',
  'subscriptionPlan',
  'subscriptionStatus',
  'trialEndsAt',
  'subscriptionEndsAt',
  'isActive',
]);

/** Fields allowed on PUT /tenants/me (logo also via POST /tenants/me/logo). */
const TENANT_SELF_SERVICE_ALLOWED = [
  'phone',
  'website',
  'industry',
  'bankName',
  'bankAccountNumber',
  'bankAccountName',
  'bankSortCode',
  'logoUrl',
  'invoiceTemplate',
];

async function updateMyTenant(req, res) {
  try {
    const body = req.body || {};
    for (const key of Object.keys(body)) {
      if (TENANT_SELF_SERVICE_LOCKED.has(key)) {
        return res.status(422).json({
          error:
            'Business name, address, email, and other legal details cannot be changed here. Contact platform support to update your registration.',
          code: 'TENANT_FIELD_LOCKED',
          field: key,
        });
      }
    }

    const data = {};
    for (const key of TENANT_SELF_SERVICE_ALLOWED) {
      if (body[key] !== undefined) {
        if (key === 'logoUrl') {
          data.logoUrl = body.logoUrl === '' || body.logoUrl === null ? null : String(body.logoUrl).trim() || null;
        } else {
          data[key] = body[key];
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided', code: 'NO_CHANGES' });
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data,
    });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE', resource: 'Tenant', resourceId: req.tenantId, req });
    res.json({ data: tenant });
  } catch (error) {
    logger.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
}

async function uploadTenantLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded', code: 'LOGO_FILE_REQUIRED' });
    }
    const publicUrl = `/uploads/tenant-logos/${req.tenantId}/${req.file.filename}`;
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { logoUrl: publicUrl },
    });
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'UPDATE',
      resource: 'Tenant',
      resourceId: req.tenantId,
      newValues: { logoUrl: publicUrl },
      req,
    });
    res.json({ data: { logoUrl: publicUrl, tenant } });
  } catch (error) {
    logger.error('Upload tenant logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
}

async function submitKYC(req, res) {
  try {
    const { tin, rcNumber, kycDocuments } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: { tin, rcNumber, kycDocuments, kycStatus: 'UNDER_REVIEW' },
    });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'KYC_SUBMIT', resource: 'Tenant', resourceId: req.tenantId, req });
    res.json({ message: 'KYC documents submitted. Review takes 1–3 business days.', kycStatus: tenant.kycStatus });
  } catch (error) {
    logger.error('KYC submit error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
}

async function list(req, res) {
  try {
    const { page, limit, kycStatus, subscriptionStatus, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (subscriptionStatus) where.subscriptionStatus = subscriptionStatus;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { tin: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where, take, skip,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { invoices: true, employees: true, products: true } } },
      }),
      prisma.tenant.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('List tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
}

async function getOne(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, lastLoginAt: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
        currencies: true,
        _count: { select: { invoices: true, products: true, customers: true, employees: true, nrsLogs: true } },
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ data: tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
}

async function updateKYCStatus(req, res) {
  try {
    const { kycStatus, reason } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        kycStatus,
        kycVerifiedAt: kycStatus === 'APPROVED' ? new Date() : null,
        kycVerifiedBy: req.admin?.id,
      },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'KYC_UPDATE', resource: 'Tenant', resourceId: req.params.id, newValues: { kycStatus, reason }, req });
    res.json({ message: `KYC status updated to ${kycStatus}`, data: tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
}

async function updateSubscription(req, res) {
  try {
    const { subscriptionPlan, subscriptionStatus, subscriptionEndsAt } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { subscriptionPlan, subscriptionStatus, subscriptionEndsAt: subscriptionEndsAt ? new Date(subscriptionEndsAt) : undefined },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'SUBSCRIPTION_UPDATE', resource: 'Tenant', resourceId: req.params.id, newValues: { subscriptionPlan, subscriptionStatus }, req });
    res.json({ data: tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
}

async function toggleActive(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const updated = await prisma.tenant.update({ where: { id: req.params.id }, data: { isActive: !tenant.isActive } });
    await createAuditLog({ adminUserId: req.admin.id, action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE', resource: 'Tenant', resourceId: req.params.id, req });
    res.json({ message: `Tenant ${updated.isActive ? 'activated' : 'deactivated'}`, isActive: updated.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle tenant status' });
  }
}

module.exports = {
  register,
  getMyTenant,
  updateMyTenant,
  uploadTenantLogo,
  submitKYC,
  list,
  getOne,
  updateKYCStatus,
  updateSubscription,
  toggleActive,
};
