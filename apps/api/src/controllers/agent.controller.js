const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');

async function getMe(req, res) {
  try {
    const user = req.user;
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        id: true,
        businessName: true,
        tradingName: true,
        city: true,
        state: true,
        kycStatus: true,
        subscriptionStatus: true,
      },
    });

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant,
      },
    });
  } catch (error) {
    logger.error('Agent getMe error:', error);
    res.status(500).json({ error: 'Failed to load agent profile' });
  }
}

async function listBusinesses(req, res) {
  try {
    const { search, kycStatus, page = 1, limit = 20 } = req.query;
    const where = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = Number(limit) || 20;
    const skip = (Number(page) - 1) * take;

    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          businessName: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          kycStatus: true,
          subscriptionStatus: true,
          createdAt: true,
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      data,
      meta: {
        page: Number(page) || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error('Agent listBusinesses error:', error);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
}

async function createBusiness(req, res) {
  try {
    const { businessName, email, phone, address, city, state, industry } = req.body;
    if (!businessName || !email || !phone) {
      return res.status(400).json({ error: 'Business name, email, and phone are required' });
    }

    const existing = await prisma.tenant.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'A business with this email already exists' });
    }

    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        businessName,
        email: email.toLowerCase(),
        phone,
        address: address || '',
        city: city || '',
        state: state || '',
        industry,
        kycStatus: 'PENDING',
        subscriptionPlan: 'STARTER',
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
      },
    });

    await createAuditLog({
      tenantId: tenant.id,
      userId: req.user.id,
      action: 'AGENT_ONBOARD_BUSINESS',
      resource: 'Tenant',
      resourceId: tenant.id,
      newValues: tenant,
      req,
    });

    res.status(201).json({
      message: 'Business created and lodged for KYC review.',
      data: tenant,
    });
  } catch (error) {
    logger.error('Agent createBusiness error:', error);
    res.status(500).json({ error: 'Failed to create business' });
  }
}

module.exports = {
  getMe,
  listBusinesses,
  createBusiness,
};

