const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');

async function getDashboard(req, res) {
  try {
    const [pendingKyc, totalAgents, totalBusinesses] = await Promise.all([
      prisma.tenant.count({ where: { kycStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
      prisma.user.count({ where: { role: 'FIELD_AGENT', isActive: true } }),
      prisma.tenant.count(),
    ]);

    res.json({
      data: {
        pendingKyc,
        totalAgents,
        totalBusinesses,
      },
    });
  } catch (error) {
    logger.error('CRM getDashboard error:', error);
    res.status(500).json({ error: 'Failed to load CRM dashboard' });
  }
}

async function listAgents(req, res) {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'FIELD_AGENT', isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: { firstName: 'asc' },
    });
    res.json({ data: agents });
  } catch (error) {
    logger.error('CRM listAgents error:', error);
    res.status(500).json({ error: 'Failed to load agents' });
  }
}

async function listBusinesses(req, res) {
  try {
    const { kycStatus, search, page = 1, limit = 20 } = req.query;
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
    logger.error('CRM listBusinesses error:', error);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
}

async function updateBusinessKYC(req, res) {
  try {
    const { tenantId } = req.params;
    const { kycStatus, notes } = req.body;
    if (!kycStatus) {
      return res.status(400).json({ error: 'kycStatus is required' });
    }

    const allowed = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'];
    if (!allowed.includes(kycStatus)) {
      return res.status(400).json({ error: `Invalid kycStatus. Must be one of: ${allowed.join(', ')}` });
    }

    const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!existing) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        kycStatus,
      },
    });

    await createAuditLog({
      tenantId: tenantId,
      adminUserId: req.admin?.id,
      action: 'CRM_UPDATE_KYC',
      resource: 'Tenant',
      resourceId: tenantId,
      oldValues: existing,
      newValues: { kycStatus, notes },
      req,
    });

    res.json({ message: 'KYC status updated', data: updated });
  } catch (error) {
    logger.error('CRM updateBusinessKYC error:', error);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
}

module.exports = {
  getDashboard,
  listAgents,
  listBusinesses,
  updateBusinessKYC,
};

