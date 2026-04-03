const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');
const { createAuditLog } = require('../middleware/audit.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'cosmos-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

function generateTrackingNumber() {
  const prefix = 'COS';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ts}-${rand}`;
}

function generateAgentCode() {
  return `AGT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

/** Flatten MarketplaceOrder.deliveryAddress JSON for Delivery.deliveryAddress string field. */
function stringifyMarketplaceDeliveryAddress(addr) {
  if (addr == null) return '';
  if (typeof addr === 'string') return addr.trim();
  if (typeof addr === 'object') {
    if (typeof addr.address === 'string' && addr.address.trim()) return addr.address.trim();
    const parts = [
      addr.line1,
      addr.line2,
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ].filter((p) => p != null && String(p).trim() !== '');
    if (parts.length) return parts.map((p) => String(p).trim()).join(', ');
  }
  try {
    return JSON.stringify(addr);
  } catch {
    return '';
  }
}

// ══════════════════════════════════════════════
// COMPANY REGISTRATION & AUTH
// ══════════════════════════════════════════════

exports.registerCompany = async (req, res) => {
  try {
    const { name, email, phone, password, contactPerson, address, city, state, coverageAreas, cacNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Company name, email, and password are required' });
    }

    const exists = await prisma.logisticsCompany.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'A company with this email already exists' });

    const hashed = await bcrypt.hash(password, 12);

    const company = await prisma.logisticsCompany.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        contactPerson,
        address,
        city,
        state,
        coverageAreas: coverageAreas || [],
        cacNumber,
      },
    });

    const { password: _, ...safe } = company;
    res.status(201).json({ data: safe, message: 'Registration successful. Pending admin approval.' });
  } catch (err) {
    console.error('Logistics register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

exports.loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const company = await prisma.logisticsCompany.findUnique({ where: { email: email.toLowerCase() } });
    if (!company) return res.status(401).json({ error: 'Invalid credentials' });
    if (company.status === 'REJECTED') return res.status(403).json({ error: 'Your application has been rejected' });

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ companyId: company.id, type: 'logistics_company' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    const { password: _, ...safe } = company;
    await createAuditLog({
      tenantId: null,
      action: 'LOGIN',
      resource: 'LogisticsCompany',
      resourceId: company.id,
      metadata: { logisticsCompanyEmail: company.email },
      req,
    });
    res.json({ data: { company: safe, token } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════
// AGENT REGISTRATION & AUTH
// ══════════════════════════════════════════════

exports.registerAgent = async (req, res) => {
  try {
    const {
      companyId, firstName, lastName, email, phone, password,
      vehicleType, vehiclePlate, coverageZone, city, state,
    } = req.body;
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }

    const exists = await prisma.logisticsAgent.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ error: 'An agent with this email already exists' });

    if (companyId) {
      const company = await prisma.logisticsCompany.findUnique({ where: { id: companyId } });
      if (!company) return res.status(404).json({ error: 'Logistics company not found' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const agent = await prisma.logisticsAgent.create({
      data: {
        companyId: companyId || null,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        agentCode: generateAgentCode(),
        vehicleType: vehicleType || null,
        vehiclePlate: vehiclePlate || null,
        coverageZone: coverageZone || null,
        city: city || null,
        state: state || null,
      },
    });

    const { password: _, ...safe } = agent;
    res.status(201).json({ data: safe, message: 'Agent registered. Pending approval.' });
  } catch (err) {
    console.error('Agent register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

exports.loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const agent = await prisma.logisticsAgent.findUnique({
      where: { email: email.toLowerCase() },
      include: { company: { select: { id: true, name: true, status: true } } },
    });
    if (!agent) return res.status(401).json({ error: 'Invalid credentials' });
    if (agent.status === 'SUSPENDED') return res.status(403).json({ error: 'Your account has been suspended' });

    const valid = await bcrypt.compare(password, agent.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.logisticsAgent.update({
      where: { id: agent.id },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    const token = jwt.sign({ agentId: agent.id, companyId: agent.companyId, type: 'logistics_agent' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    const { password: _, ...safe } = agent;
    await createAuditLog({
      tenantId: null,
      action: 'LOGIN',
      resource: 'LogisticsAgent',
      resourceId: agent.id,
      metadata: { logisticsCompanyId: agent.companyId },
      req,
    });
    res.json({ data: { agent: safe, token } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════
// AGENT PORTAL ENDPOINTS
// ══════════════════════════════════════════════

exports.getAgentProfile = async (req, res) => {
  try {
    const agent = await prisma.logisticsAgent.findUnique({
      where: { id: req.agentId },
      include: { company: { select: { id: true, name: true, logoUrl: true, status: true } } },
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const { password: _, ...safe } = agent;
    res.json({ data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAgentProfile = async (req, res) => {
  try {
    const { phone, vehicleType, vehiclePlate, coverageZone, city, state, isOnline } = req.body;
    const data = {};
    if (phone) data.phone = String(phone).trim();
    if (vehicleType) data.vehicleType = vehicleType;
    if (vehiclePlate) data.vehiclePlate = vehiclePlate;
    if (coverageZone) data.coverageZone = coverageZone;
    if (city) data.city = city;
    if (state) data.state = state;
    if (typeof isOnline === 'boolean') {
      data.isOnline = isOnline;
      data.lastSeenAt = new Date();
    }
    if (Object.keys(data).length === 0) {
      const current = await prisma.logisticsAgent.findUnique({
        where: { id: req.agentId },
        include: { company: { select: { id: true, name: true, logoUrl: true, status: true } } },
      });
      if (!current) return res.status(404).json({ error: 'Agent not found' });
      const { password: _, ...safe } = current;
      return res.json({ data: safe });
    }
    const agent = await prisma.logisticsAgent.update({
      where: { id: req.agentId },
      data,
      include: { company: { select: { id: true, name: true, logoUrl: true, status: true } } },
    });
    const { password: _, ...safe } = agent;
    res.json({ data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** Deliveries tied to this logistics company (direct or via assigned agent). */
function companyDeliveryScope(companyId) {
  return {
    OR: [{ companyId }, { agent: { companyId } }],
  };
}

async function autoAssignAgentToDelivery(companyId, deliveryId) {
  if (!companyId) return null;
  const agents = await prisma.logisticsAgent.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: {
      id: true,
      _count: {
        select: {
          deliveries: {
            where: {
              status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
            },
          },
        },
      },
    },
  });
  if (!agents.length) return null;
  agents.sort((a, b) => a._count.deliveries - b._count.deliveries);
  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { agentId: agents[0].id },
  });
}

async function assertCompanyCanOperate(companyId) {
  const company = await prisma.logisticsCompany.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, error: 'Company not found', status: 404 };
  if (!company.isActive) return { ok: false, error: 'Company account is inactive', status: 403 };
  if (company.status !== 'APPROVED') {
    return { ok: false, error: 'Company is pending approval', status: 403 };
  }
  return { ok: true, company };
}

exports.getCompanyDashboard = async (req, res) => {
  try {
    const companyId = req.companyId;
    const scope = companyDeliveryScope(companyId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalDeliveries,
      activeDeliveries,
      deliveredToday,
      deliveredMonth,
      payoutAgg,
      recentDeliveries,
      rosterAgents,
      failedOrReturned,
      delayedActive,
    ] = await Promise.all([
      prisma.delivery.count({ where: scope }),
      prisma.delivery.count({
        where: {
          AND: [
            scope,
            { status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
          ],
        },
      }),
      prisma.delivery.count({
        where: {
          AND: [
            scope,
            { status: 'DELIVERED', deliveredAt: { gte: startOfDay } },
          ],
        },
      }),
      prisma.delivery.count({
        where: {
          AND: [
            scope,
            { status: 'DELIVERED', deliveredAt: { gte: startOfMonth } },
          ],
        },
      }),
      prisma.delivery.aggregate({
        where: { AND: [scope, { status: 'DELIVERED' }] },
        _sum: { agentPayout: true, deliveryFee: true },
      }),
      prisma.delivery.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          agent: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.logisticsAgent.count({ where: { companyId } }),
      prisma.delivery.count({
        where: {
          AND: [scope, { status: { in: ['FAILED', 'RETURNED'] } }],
        },
      }),
      prisma.delivery.count({
        where: {
          AND: [
            scope,
            { status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
            { expectedDeliveryDate: { not: null, lt: now } },
          ],
        },
      }),
    ]);

    const slaSample = await prisma.delivery.findMany({
      where: {
        AND: [
          scope,
          { status: 'DELIVERED' },
          { expectedDeliveryDate: { not: null } },
          { deliveredAt: { not: null } },
        ],
      },
      select: { deliveredAt: true, expectedDeliveryDate: true },
      take: 500,
      orderBy: { deliveredAt: 'desc' },
    });
    let onTime = 0;
    for (const d of slaSample) {
      if (new Date(d.deliveredAt) <= new Date(d.expectedDeliveryDate)) onTime += 1;
    }
    const onTimeDeliveryRatePct = slaSample.length ? Math.round((100 * onTime) / slaSample.length) : null;

    res.json({
      data: {
        summary: {
          totalDeliveries,
          activeDeliveries,
          deliveredToday,
          deliveredMonth,
          totalAgentPayouts: payoutAgg._sum.agentPayout || 0,
          totalDeliveryFees: payoutAgg._sum.deliveryFee || 0,
          rosterAgents: rosterAgents,
          exceptionsFailedOrReturned: failedOrReturned,
          exceptionsDelayedVsEta: delayedActive,
          onTimeDeliveryRatePct,
          onTimeSampleSize: slaSample.length,
        },
        recentDeliveries,
      },
    });
  } catch (err) {
    logger.error('getCompanyDashboard', err);
    res.status(500).json({ error: err.message || 'Failed to load dashboard' });
  }
};

exports.getCompanyDeliveries = async (req, res) => {
  try {
    const companyId = req.companyId;
    const { page = 1, limit = 20, status, search } = req.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * take;

    const scope = companyDeliveryScope(companyId);
    const and = [{ ...scope }];
    if (status) and.push({ status });
    const kind = req.query.kind;
    if (kind === 'STANDARD' || kind === 'RETURN') and.push({ deliveryKind: kind });
    if (search && String(search).trim()) {
      const q = String(search).trim();
      and.push({
        OR: [
          { trackingNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { orderRef: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    const where = { AND: and };

    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          agent: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page, 10) || 1, limit: take });
  } catch (err) {
    logger.error('getCompanyDeliveries', err);
    res.status(500).json({ error: err.message || 'Failed to list deliveries' });
  }
};

exports.getCompanyAgents = async (req, res) => {
  try {
    const companyId = req.companyId;
    const agents = await prisma.logisticsAgent.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        agentCode: true,
        status: true,
        isOnline: true,
        totalDeliveries: true,
        successRate: true,
        rating: true,
        vehicleType: true,
        vehiclePlate: true,
        city: true,
        state: true,
        coverageZone: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });
    res.json({ data: agents });
  } catch (err) {
    logger.error('getCompanyAgents', err);
    res.status(500).json({ error: err.message || 'Failed to list agents' });
  }
};

exports.createCompanyDelivery = async (req, res) => {
  try {
    const companyId = req.companyId;
    const gate = await assertCompanyCanOperate(companyId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    const {
      customerName, customerPhone, customerEmail,
      pickupAddress, deliveryAddress, city, state,
      packageDescription, packageWeight, packageSize,
      deliveryFee, priority, notes, expectedDeliveryDate,
      orderRef, invoiceRef,
    } = req.body;

    const name = typeof customerName === 'string' ? customerName.trim() : '';
    const addr = typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
    if (!name || !addr) {
      return res.status(400).json({ error: 'Customer name and delivery address are required' });
    }

    const trackingNumber = generateTrackingNumber();
    const fee = parseFloat(deliveryFee) || 1500;
    const commission = fee * 0.15;
    const payout = fee - commission;

    let delivery = await prisma.delivery.create({
      data: {
        tenantId: null,
        orderId: null,
        orderRef: orderRef?.trim() || null,
        invoiceRef: invoiceRef?.trim() || null,
        trackingNumber,
        companyId,
        customerName: name,
        customerPhone: typeof customerPhone === 'string' ? customerPhone.trim() || null : null,
        customerEmail: typeof customerEmail === 'string' ? customerEmail.trim() || null : null,
        pickupAddress: typeof pickupAddress === 'string' ? pickupAddress.trim() || null : null,
        deliveryAddress: addr,
        city: typeof city === 'string' ? city.trim() || null : null,
        state: typeof state === 'string' ? state.trim() || null : null,
        packageDescription: typeof packageDescription === 'string' ? packageDescription.trim() || null : null,
        packageWeight: packageWeight != null && packageWeight !== '' ? parseFloat(packageWeight) : null,
        packageSize: typeof packageSize === 'string' ? packageSize.trim() || null : null,
        deliveryFee: fee,
        platformCommission: commission,
        agentPayout: payout,
        priority: priority || 'STANDARD',
        notes: typeof notes === 'string' ? notes.trim() || null : null,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        deliveryKind: 'STANDARD',
      },
    });

    if (!delivery.agentId) {
      const updated = await autoAssignAgentToDelivery(companyId, delivery.id);
      if (updated) delivery = updated;
    }

    res.status(201).json({ data: delivery });
  } catch (err) {
    logger.error('createCompanyDelivery', err);
    res.status(500).json({ error: err.message || 'Failed to create shipment' });
  }
};

exports.createCompanyReturn = async (req, res) => {
  try {
    const companyId = req.companyId;
    const gate = await assertCompanyCanOperate(companyId);
    if (!gate.ok) return res.status(gate.status).json({ error: gate.error });

    const {
      customerName, customerPhone, customerEmail,
      pickupAddress, deliveryAddress, city, state,
      packageDescription, packageWeight, packageSize,
      deliveryFee, priority, notes, expectedDeliveryDate,
      originalTrackingNumber,
    } = req.body;

    const name = typeof customerName === 'string' ? customerName.trim() : '';
    const pick = typeof pickupAddress === 'string' ? pickupAddress.trim() : '';
    const drop = typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
    if (!name || !pick || !drop) {
      return res.status(400).json({
        error: 'Customer name, pickup address (collect from customer), and return-to address (hub/warehouse) are required',
      });
    }

    const noteParts = [];
    if (typeof originalTrackingNumber === 'string' && originalTrackingNumber.trim()) {
      noteParts.push(`Original shipment: ${originalTrackingNumber.trim()}`);
    }
    if (typeof notes === 'string' && notes.trim()) noteParts.push(notes.trim());
    const combinedNotes = noteParts.length ? noteParts.join(' | ') : null;

    const trackingNumber = generateTrackingNumber();
    const fee = parseFloat(deliveryFee) || 1500;
    const commission = fee * 0.15;
    const payout = fee - commission;

    let delivery = await prisma.delivery.create({
      data: {
        tenantId: null,
        trackingNumber,
        companyId,
        customerName: name,
        customerPhone: typeof customerPhone === 'string' ? customerPhone.trim() || null : null,
        customerEmail: typeof customerEmail === 'string' ? customerEmail.trim() || null : null,
        pickupAddress: pick,
        deliveryAddress: drop,
        city: typeof city === 'string' ? city.trim() || null : null,
        state: typeof state === 'string' ? state.trim() || null : null,
        packageDescription: typeof packageDescription === 'string' ? packageDescription.trim() || null : null,
        packageWeight: packageWeight != null && packageWeight !== '' ? parseFloat(packageWeight) : null,
        packageSize: typeof packageSize === 'string' ? packageSize.trim() || null : null,
        deliveryFee: fee,
        platformCommission: commission,
        agentPayout: payout,
        priority: priority || 'STANDARD',
        notes: combinedNotes,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        deliveryKind: 'RETURN',
      },
    });

    if (!delivery.agentId) {
      const updated = await autoAssignAgentToDelivery(companyId, delivery.id);
      if (updated) delivery = updated;
    }

    res.status(201).json({ data: delivery });
  } catch (err) {
    logger.error('createCompanyReturn', err);
    return res.status(500).json({ error: err.message || 'Failed to create return pickup' });
  }
};

exports.getCompanyBilling = async (req, res) => {
  try {
    const companyId = req.companyId;
    const scope = companyDeliveryScope(companyId);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const skip = (Math.max(1, page) - 1) * limit;
    const { from, to } = req.query;

    const and = [{ ...scope }, { status: 'DELIVERED' }];
    if (from) and.push({ deliveredAt: { gte: new Date(from) } });
    if (to) and.push({ deliveredAt: { lte: new Date(to) } });
    const where = { AND: and };

    const [rows, total, agg] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { deliveredAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          deliveredAt: true,
          deliveryFee: true,
          agentPayout: true,
          platformCommission: true,
          deliveryKind: true,
          agent: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.delivery.count({ where }),
      prisma.delivery.aggregate({
        where,
        _sum: { deliveryFee: true, agentPayout: true, platformCommission: true },
      }),
    ]);

    res.json({
      data: rows,
      total,
      page,
      limit,
      summary: {
        deliveryFees: agg._sum.deliveryFee || 0,
        agentPayouts: agg._sum.agentPayout || 0,
        platformCommission: agg._sum.platformCommission || 0,
      },
    });
  } catch (err) {
    logger.error('getCompanyBilling', err);
    res.status(500).json({ error: err.message || 'Failed to load billing' });
  }
};

exports.listCompanySupportTickets = async (req, res) => {
  try {
    const tickets = await prisma.logisticsSupportTicket.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: tickets });
  } catch (err) {
    logger.error('listCompanySupportTickets', err);
    res.status(500).json({ error: err.message || 'Failed to list tickets' });
  }
};

exports.createCompanySupportTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || subject.trim().length < 3) {
      return res.status(400).json({ error: 'Subject is required (at least 3 characters)' });
    }
    if (!message?.trim() || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message is required (at least 10 characters)' });
    }
    const ticket = await prisma.logisticsSupportTicket.create({
      data: {
        companyId: req.companyId,
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 10000),
      },
    });
    res.status(201).json({ data: ticket });
  } catch (err) {
    logger.error('createCompanySupportTicket', err);
    res.status(500).json({ error: err.message || 'Failed to create ticket' });
  }
};

exports.listAgentSupportTickets = async (req, res) => {
  try {
    const tickets = await prisma.logisticsSupportTicket.findMany({
      where: { agentId: req.agentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: tickets });
  } catch (err) {
    logger.error('listAgentSupportTickets', err);
    res.status(500).json({ error: err.message || 'Failed to list tickets' });
  }
};

exports.createAgentSupportTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim() || subject.trim().length < 3) {
      return res.status(400).json({ error: 'Subject is required (at least 3 characters)' });
    }
    if (!message?.trim() || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message is required (at least 10 characters)' });
    }
    const ticket = await prisma.logisticsSupportTicket.create({
      data: {
        agentId: req.agentId,
        subject: subject.trim().slice(0, 200),
        message: message.trim().slice(0, 10000),
      },
    });
    res.status(201).json({ data: ticket });
  } catch (err) {
    logger.error('createAgentSupportTicket', err);
    res.status(500).json({ error: err.message || 'Failed to create ticket' });
  }
};

exports.getAgentDashboard = async (req, res) => {
  try {
    const agentId = req.agentId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayDeliveries, todayCompleted,
      monthDeliveries, monthCompleted,
      totalEarnings, activeDeliveries,
      recentDeliveries,
    ] = await Promise.all([
      prisma.delivery.count({ where: { agentId, createdAt: { gte: startOfDay } } }),
      prisma.delivery.count({ where: { agentId, status: 'DELIVERED', deliveredAt: { gte: startOfDay } } }),
      prisma.delivery.count({ where: { agentId, createdAt: { gte: startOfMonth } } }),
      prisma.delivery.count({ where: { agentId, status: 'DELIVERED', deliveredAt: { gte: startOfMonth } } }),
      prisma.delivery.aggregate({ where: { agentId, status: 'DELIVERED' }, _sum: { agentPayout: true } }),
      prisma.delivery.findMany({
        where: { agentId, status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.delivery.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      data: {
        today: { total: todayDeliveries, completed: todayCompleted },
        month: { total: monthDeliveries, completed: monthCompleted },
        totalEarnings: totalEarnings._sum.agentPayout || 0,
        activeDeliveries,
        recentDeliveries,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAgentDeliveries = async (req, res) => {
  try {
    const agentId = req.agentId;
    const { page = 1, limit = 20, status, search } = req.query;
    const where = { agentId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { orderRef: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const agentId = req.agentId;
    const { id } = req.params;
    const { status, notes, failureReason, proofOfDelivery } = req.body;

    const delivery = await prisma.delivery.findFirst({ where: { id, agentId } });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (proofOfDelivery) updateData.proofOfDelivery = proofOfDelivery;

    if (status === 'IN_TRANSIT') updateData.inTransitAt = new Date();
    if (status === 'OUT_FOR_DELIVERY') updateData.outForDeliveryAt = new Date();
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      await prisma.logisticsAgent.update({
        where: { id: agentId },
        data: { totalDeliveries: { increment: 1 } },
      });
    }
    if (status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.failureReason = failureReason || 'Delivery failed';
    }

    const updated = await prisma.delivery.update({ where: { id }, data: updateData });

    if (delivery.status !== status) {
      emailService.sendDeliveryStatusUpdateEmail(updated).catch((err) => {
        logger.warn('Delivery customer notification email failed:', err.message);
      });
      const smsLabels = {
        IN_TRANSIT: 'is on the way',
        OUT_FOR_DELIVERY: 'is out for delivery',
        DELIVERED: 'has been delivered',
        FAILED: 'could not be completed — support may contact you',
      };
      const smsBit = smsLabels[status];
      if (smsBit && updated.customerPhone) {
        smsService
          .sendSms(
            updated.customerPhone,
            `Mixtio Logistics: ${updated.trackingNumber} ${smsBit}.`,
          )
          .catch((err) => logger.warn('Delivery SMS failed:', err.message));
      }
    }

    // Update marketplace order status if linked
    if (delivery.orderId) {
      const orderStatus = status === 'DELIVERED' ? 'DELIVERED' : status === 'IN_TRANSIT' ? 'SHIPPED' : undefined;
      if (orderStatus) {
        await prisma.marketplaceOrder.update({
          where: { id: delivery.orderId },
          data: {
            status: orderStatus,
            ...(status === 'IN_TRANSIT' && { shippedAt: new Date() }),
            ...(status === 'DELIVERED' && { deliveredAt: new Date() }),
          },
        }).catch(() => {});
      }
    }

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════
// SELLER / TENANT ENDPOINTS
// ══════════════════════════════════════════════

exports.listAvailableProviders = async (req, res) => {
  try {
    const { city, state } = req.query;
    const where = { status: 'APPROVED', isActive: true };
    const companies = await prisma.logisticsCompany.findMany({
      where,
      select: {
        id: true, name: true, phone: true, city: true, state: true,
        coverageAreas: true, rating: true, totalDeliveries: true, logoUrl: true,
        _count: { select: { agents: true } },
      },
      orderBy: { rating: 'desc' },
    });
    res.json({ data: companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestDelivery = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || null;
    const {
      orderId, orderRef, invoiceRef, companyId,
      customerName, customerPhone, customerEmail,
      pickupAddress, deliveryAddress, city, state,
      packageDescription, packageWeight, packageSize,
      deliveryFee, priority, notes, expectedDeliveryDate,
    } = req.body;

    let resolvedOrderId = orderId || null;
    let resolvedOrderRef = orderRef?.trim() || null;
    let resolvedCustomerName = typeof customerName === 'string' ? customerName.trim() : '';
    let resolvedCustomerPhone = typeof customerPhone === 'string' ? customerPhone.trim() : '';
    let resolvedCustomerEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
    let resolvedDeliveryAddress = typeof deliveryAddress === 'string' ? deliveryAddress.trim() : '';
    let resolvedCity = typeof city === 'string' ? city.trim() : '';
    let resolvedState = typeof state === 'string' ? state.trim() : '';
    let resolvedPackageDesc = typeof packageDescription === 'string' ? packageDescription.trim() : '';

    if (resolvedOrderId) {
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required when linking a marketplace order' });
      }
      const mktOrder = await prisma.marketplaceOrder.findFirst({
        where: {
          id: resolvedOrderId,
          lines: { some: { tenantId } },
        },
        select: {
          id: true,
          orderNumber: true,
          buyerName: true,
          buyerPhone: true,
          buyerEmail: true,
          deliveryAddress: true,
          lines: {
            where: { tenantId },
            select: { productName: true, quantity: true },
          },
        },
      });
      if (!mktOrder) {
        return res.status(404).json({ error: 'Marketplace order not found or not linked to your tenant' });
      }
      const addrObj = mktOrder.deliveryAddress;
      if (!resolvedCustomerName) resolvedCustomerName = (mktOrder.buyerName || '').trim();
      if (!resolvedCustomerPhone) resolvedCustomerPhone = (mktOrder.buyerPhone || '').trim();
      if (!resolvedCustomerEmail) resolvedCustomerEmail = (mktOrder.buyerEmail || '').trim();
      if (!resolvedDeliveryAddress) resolvedDeliveryAddress = stringifyMarketplaceDeliveryAddress(addrObj);
      if (!resolvedCity && addrObj && typeof addrObj === 'object' && addrObj.city) {
        resolvedCity = String(addrObj.city).trim();
      }
      if (!resolvedState && addrObj && typeof addrObj === 'object' && addrObj.state) {
        resolvedState = String(addrObj.state).trim();
      }
      if (!resolvedOrderRef) resolvedOrderRef = mktOrder.orderNumber;
      if (!resolvedPackageDesc && mktOrder.lines?.length) {
        resolvedPackageDesc = mktOrder.lines
          .map((l) => `${l.productName} ×${l.quantity}`)
          .join(', ');
      }
    }

    if (!resolvedCustomerName || !resolvedDeliveryAddress) {
      return res.status(400).json({ error: 'Customer name and delivery address are required' });
    }

    const trackingNumber = generateTrackingNumber();
    const fee = parseFloat(deliveryFee) || 1500;
    const commission = fee * 0.15;
    const payout = fee - commission;

    let delivery = await prisma.delivery.create({
      data: {
        tenantId,
        orderId: resolvedOrderId,
        orderRef: resolvedOrderRef,
        invoiceRef: invoiceRef || null,
        trackingNumber,
        companyId: companyId || null,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone || null,
        customerEmail: resolvedCustomerEmail || null,
        pickupAddress,
        deliveryAddress: resolvedDeliveryAddress,
        city: resolvedCity || null,
        state: resolvedState || null,
        packageDescription: resolvedPackageDesc || null,
        packageWeight: packageWeight || null,
        packageSize: packageSize || null,
        deliveryFee: fee,
        platformCommission: commission,
        agentPayout: payout,
        priority: priority || 'STANDARD',
        notes,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      },
    });

    if (companyId && !delivery.agentId) {
      const agents = await prisma.logisticsAgent.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: {
          id: true,
          _count: {
            select: {
              deliveries: {
                where: {
                  status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
                },
              },
            },
          },
        },
      });
      if (agents.length) {
        agents.sort((a, b) => a._count.deliveries - b._count.deliveries);
        delivery = await prisma.delivery.update({
          where: { id: delivery.id },
          data: { agentId: agents[0].id },
        });
      }
    }

    // Update marketplace order if linked
    if (resolvedOrderId) {
      await prisma.marketplaceOrder.update({
        where: { id: resolvedOrderId },
        data: {
          trackingNumber,
          logisticsProvider: companyId ? (await prisma.logisticsCompany.findUnique({ where: { id: companyId }, select: { name: true } }))?.name : 'Mixtio Logistics',
          logisticsRef: delivery.id,
        },
      }).catch(() => {});
    }

    res.status(201).json({ data: delivery });
  } catch (err) {
    console.error('Request delivery error:', err);
    res.status(500).json({ error: err.message || 'Failed to create delivery' });
  }
};

/** ERP: deliveries created by this tenant (marketplace / manual requests). */
exports.listTenantDeliveries = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const { status } = req.query;
    const where = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          agent: { select: { firstName: true, lastName: true, phone: true } },
          company: { select: { name: true } },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({ data, page, limit, total, totalPages });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to list deliveries' });
  }
};

exports.verifyAgentOwnsDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, agentId: req.agentId },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadProofOfDelivery = async (req, res) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, agentId: req.agentId },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    if (!req.file) return res.status(400).json({ error: 'File required (field name: file). PDF or image.' });

    const { getPodFileUrl } = require('../middleware/upload.middleware');
    const url = getPodFileUrl(delivery.id, req.file.filename);
    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: { proofOfDelivery: url },
    });
    res.json({ data: { proofOfDelivery: url, delivery: updated } });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
};

exports.trackDelivery = async (req, res) => {
  try {
    const delivery = await prisma.delivery.findFirst({
      where: {
        OR: [
          { id: req.params.trackingOrId },
          { trackingNumber: req.params.trackingOrId },
        ],
      },
      include: {
        agent: { select: { firstName: true, lastName: true, phone: true, vehicleType: true } },
        company: { select: { name: true, phone: true } },
      },
    });
    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
    res.json({ data: delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ══════════════════════════════════════════════
// ADMIN ENDPOINTS
// ══════════════════════════════════════════════

exports.adminGetStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalAgents, activeAgents, pendingAgents,
      totalDeliveries, pendingPickup, inTransit,
      outForDelivery, delivered, failed, returned,
      deliveredToday, totalCompanies, pendingCompanies,
    ] = await Promise.all([
      prisma.logisticsAgent.count(),
      prisma.logisticsAgent.count({ where: { status: 'ACTIVE' } }),
      prisma.logisticsAgent.count({ where: { status: 'PENDING' } }),
      prisma.delivery.count(),
      prisma.delivery.count({ where: { status: 'PENDING_PICKUP' } }),
      prisma.delivery.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.delivery.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      prisma.delivery.count({ where: { status: 'DELIVERED' } }),
      prisma.delivery.count({ where: { status: 'FAILED' } }),
      prisma.delivery.count({ where: { status: 'RETURNED' } }),
      prisma.delivery.count({ where: { status: 'DELIVERED', deliveredAt: { gte: startOfDay } } }),
      prisma.logisticsCompany.count(),
      prisma.logisticsCompany.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      data: {
        totalAgents, activeAgents, pendingAgents,
        totalDeliveries, pendingPickup, inTransit,
        outForDelivery, delivered, failed, returned,
        deliveredToday, totalCompanies, pendingCompanies,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminListAgents = async (req, res) => {
  try {
    const { page = 1, limit = 12, search, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { coverageZone: { contains: search, mode: 'insensitive' } },
        { agentCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.logisticsAgent.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          tenant: { select: { id: true, tradingName: true, businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.logisticsAgent.count({ where }),
    ]);

    const safeData = data.map(({ password, ...rest }) => rest);
    const totalPages = Math.ceil(total / parseInt(limit));
    res.json({
      data: safeData,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages, hasMore: parseInt(page) < totalPages },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminUpdateAgentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const agent = await prisma.logisticsAgent.update({
      where: { id: req.params.agentId },
      data: { status },
    });
    const { password: _, ...safe } = agent;
    res.json({ data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminListDeliveries = async (req, res) => {
  try {
    const { page = 1, limit = 25, search, status } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { orderRef: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          agent: { select: { id: true, firstName: true, lastName: true, vehicleType: true, phone: true } },
          company: { select: { id: true, name: true } },
          tenant: { select: { id: true, tradingName: true, businessName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.delivery.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));
    res.json({
      data,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages, hasMore: parseInt(page) < totalPages },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminGetMapData = async (req, res) => {
  try {
    const [agents, deliveries] = await Promise.all([
      prisma.logisticsAgent.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          agentCode: true,
          vehicleType: true,
          coverageZone: true,
          city: true,
          state: true,
          isOnline: true,
          lastSeenAt: true,
        },
      }),
      prisma.delivery.findMany({
        where: { status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
        select: {
          id: true,
          trackingNumber: true,
          status: true,
          city: true,
          state: true,
          pickupAddress: true,
          deliveryAddress: true,
          createdAt: true,
          expectedDeliveryDate: true,
          tenant: { select: { id: true, tradingName: true, businessName: true } },
          agent: { select: { id: true, firstName: true, lastName: true, agentCode: true, city: true, state: true } },
          company: { select: { id: true, name: true } },
        },
      }),
    ]);

    const drivers = agents.map((agent) => ({
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`.trim(),
      agentCode: agent.agentCode,
      vehicleType: agent.vehicleType,
      coverageZone: agent.coverageZone,
      city: agent.city,
      state: agent.state,
      isOnline: agent.isOnline,
      lastSeenAt: agent.lastSeenAt,
    }));

    const goodsInTransit = deliveries
      .filter((d) => d.status === 'IN_TRANSIT' || d.status === 'OUT_FOR_DELIVERY')
      .map((d) => ({
        id: d.id,
        trackingNumber: d.trackingNumber,
        status: d.status,
        city: d.city || d.agent?.city || null,
        state: d.state || d.agent?.state || null,
        deliveryAddress: d.deliveryAddress,
        expectedDeliveryDate: d.expectedDeliveryDate,
        vendorName: d.tenant?.tradingName || d.tenant?.businessName || null,
        driverName: d.agent ? `${d.agent.firstName} ${d.agent.lastName}`.trim() : null,
        companyName: d.company?.name || null,
      }));

    const vendorsWaitingPickup = deliveries
      .filter((d) => d.status === 'PENDING_PICKUP')
      .map((d) => ({
        id: d.id,
        trackingNumber: d.trackingNumber,
        status: d.status,
        city: d.city,
        state: d.state,
        pickupAddress: d.pickupAddress,
        createdAt: d.createdAt,
        vendorName: d.tenant?.tradingName || d.tenant?.businessName || 'Unknown Vendor',
        companyName: d.company?.name || null,
      }));

    res.json({
      data: {
        drivers,
        goodsInTransit,
        vendorsWaitingPickup,
        totals: {
          drivers: drivers.length,
          inTransit: goodsInTransit.length,
          waitingPickup: vendorsWaitingPickup.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch logistics map data' });
  }
};

exports.adminAssignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    const delivery = await prisma.delivery.update({
      where: { id: req.params.deliveryId },
      data: { agentId, status: 'PENDING_PICKUP' },
      include: { agent: { select: { firstName: true, lastName: true } } },
    });
    res.json({ data: delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminListCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      prisma.logisticsCompany.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, contactPerson: true,
          address: true, city: true, state: true, coverageAreas: true, cacNumber: true,
          status: true, rating: true, totalDeliveries: true, isActive: true,
          createdAt: true, approvedAt: true, updatedAt: true,
          _count: { select: { agents: true, deliveries: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip,
      }),
      prisma.logisticsCompany.count({ where }),
    ]);
    res.json({ data, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminUpdateCompanyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const company = await prisma.logisticsCompany.update({
      where: { id: req.params.companyId },
      data: {
        status,
        ...(status === 'APPROVED' && { approvedAt: new Date() }),
      },
    });
    const { password: _, ...safe } = company;
    res.json({ data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
