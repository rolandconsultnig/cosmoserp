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

async function listLeads(req, res) {
  try {
    const { stage, search } = req.query;
    const where = { tenantId: req.tenantId };
    if (stage) where.stage = String(stage).toUpperCase();
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const rows = await prisma.lead.findMany({
      where,
      orderBy: [{ convertedAt: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    });
    res.json({ data: rows });
  } catch (error) {
    logger.error('CRM listLeads error:', error);
    res.status(500).json({ error: 'Failed to load leads' });
  }
}

async function createLead(req, res) {
  try {
    const firstName = String(req.body?.firstName || '').trim();
    if (!firstName) return res.status(400).json({ error: 'firstName is required' });

    const row = await prisma.lead.create({
      data: {
        tenantId: req.tenantId,
        firstName,
        lastName: req.body?.lastName ? String(req.body.lastName).trim() : null,
        company: req.body?.company ? String(req.body.company).trim() : null,
        email: req.body?.email ? String(req.body.email).trim().toLowerCase() : null,
        phone: req.body?.phone ? String(req.body.phone).trim() : null,
        source: req.body?.source ? String(req.body.source).trim() : null,
        stage: req.body?.stage ? String(req.body.stage).toUpperCase() : 'NEW',
        estimatedValue: req.body?.estimatedValue ? parseFloat(req.body.estimatedValue) : null,
        nextFollowUpAt: req.body?.nextFollowUpAt ? new Date(req.body.nextFollowUpAt) : null,
        notes: req.body?.notes ? String(req.body.notes).trim() : null,
        assignedToId: req.body?.assignedToId ? String(req.body.assignedToId) : null,
        createdById: req.user.id,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'CRM_CREATE_LEAD',
      resource: 'Lead',
      resourceId: row.id,
      newValues: row,
      req,
    });
    res.status(201).json({ data: row });
  } catch (error) {
    logger.error('CRM createLead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
}

async function updateLead(req, res) {
  try {
    const leadId = String(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const payload = {};
    const fields = ['firstName', 'lastName', 'company', 'email', 'phone', 'source', 'notes', 'assignedToId'];
    fields.forEach((k) => {
      if (req.body?.[k] !== undefined) {
        payload[k] = req.body[k] === '' ? null : String(req.body[k]).trim();
      }
    });
    if (req.body?.email !== undefined && payload.email) payload.email = payload.email.toLowerCase();
    if (req.body?.estimatedValue !== undefined) payload.estimatedValue = req.body.estimatedValue ? parseFloat(req.body.estimatedValue) : null;
    if (req.body?.nextFollowUpAt !== undefined) payload.nextFollowUpAt = req.body.nextFollowUpAt ? new Date(req.body.nextFollowUpAt) : null;
    if (req.body?.stage !== undefined) payload.stage = String(req.body.stage).toUpperCase();

    const updated = await prisma.lead.update({ where: { id: existing.id }, data: payload });
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'CRM_UPDATE_LEAD',
      resource: 'Lead',
      resourceId: existing.id,
      oldValues: existing,
      newValues: payload,
      req,
    });
    res.json({ data: updated });
  } catch (error) {
    logger.error('CRM updateLead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
}

async function convertLead(req, res) {
  try {
    const leadId = String(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: req.tenantId },
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (lead.convertedAt) return res.status(400).json({ error: 'Lead already converted' });

    let customer = null;
    if (lead.company || lead.firstName || lead.email || lead.phone) {
      customer = await prisma.customer.create({
        data: {
          tenantId: req.tenantId,
          name: lead.company || `${lead.firstName}${lead.lastName ? ` ${lead.lastName}` : ''}`,
          email: lead.email || null,
          phone: lead.phone || null,
          address: null,
          city: null,
          state: null,
          country: null,
          tin: null,
        },
      });
    }

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: 'WON',
        convertedAt: new Date(),
        convertedById: req.user.id,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'CRM_CONVERT_LEAD',
      resource: 'Lead',
      resourceId: lead.id,
      newValues: { customerId: customer?.id || null },
      req,
    });
    res.json({ data: { lead: updated, customer } });
  } catch (error) {
    logger.error('CRM convertLead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
}

module.exports = {
  getDashboard,
  listAgents,
  listBusinesses,
  updateBusinessKYC,
  listLeads,
  createLead,
  updateLead,
  convertLead,
};

