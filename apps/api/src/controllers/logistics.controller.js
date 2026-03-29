const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');

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
    const { phone, vehicleType, vehiclePlate, coverageZone, city, state } = req.body;
    const agent = await prisma.logisticsAgent.update({
      where: { id: req.agentId },
      data: {
        ...(phone && { phone }),
        ...(vehicleType && { vehicleType }),
        ...(vehiclePlate && { vehiclePlate }),
        ...(coverageZone && { coverageZone }),
        ...(city && { city }),
        ...(state && { state }),
      },
    });
    const { password: _, ...safe } = agent;
    res.json({ data: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
            `Cosmos Logistics: ${updated.trackingNumber} ${smsBit}.`,
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
      const MAX_CAPACITY = parseInt(process.env.MAX_AGENT_CAPACITY || '10', 10);
      const activeStatuses = ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
      const agentSelect = {
        id: true,
        phone: true,
        firstName: true,
        isOnline: true,
        _count: { select: { deliveries: { where: { status: { in: activeStatuses } } } } },
      };

      // 3-tier zone fallback: city → state → any active agent in company
      const zonePriority = [
        ...(resolvedCity ? [{ companyId, status: 'ACTIVE', city: { equals: resolvedCity, mode: 'insensitive' } }] : []),
        ...(resolvedState ? [{ companyId, status: 'ACTIVE', state: { equals: resolvedState, mode: 'insensitive' } }] : []),
        { companyId, status: 'ACTIVE' },
      ];

      let selectedAgent = null;
      for (const zoneFilter of zonePriority) {
        const candidates = await prisma.logisticsAgent.findMany({ where: zoneFilter, select: agentSelect });
        const available = candidates
          .filter((a) => a._count.deliveries < MAX_CAPACITY)
          .sort((a, b) => {
            // Online agents first, then fewest active deliveries
            if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
            return a._count.deliveries - b._count.deliveries;
          });
        if (available.length) {
          selectedAgent = available[0];
          break;
        }
      }

      if (selectedAgent) {
        delivery = await prisma.delivery.update({
          where: { id: delivery.id },
          data: { agentId: selectedAgent.id },
        });
        if (selectedAgent.phone) {
          smsService
            .sendSms(
              selectedAgent.phone,
              `CosmosERP: New delivery assigned — ${delivery.trackingNumber}. Customer: ${delivery.customerName}. Drop-off: ${delivery.deliveryAddress}.`,
            )
            .catch((err) => logger.warn('Agent assignment SMS failed:', err.message));
        }
      }
    }

    // Update marketplace order if linked
    if (resolvedOrderId) {
      await prisma.marketplaceOrder.update({
        where: { id: resolvedOrderId },
        data: {
          trackingNumber,
          logisticsProvider: companyId ? (await prisma.logisticsCompany.findUnique({ where: { id: companyId }, select: { name: true } }))?.name : 'Cosmos Logistics',
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

exports.adminAssignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    const delivery = await prisma.delivery.update({
      where: { id: req.params.deliveryId },
      data: { agentId, status: 'PENDING_PICKUP' },
      include: { agent: { select: { firstName: true, lastName: true, phone: true } } },
    });
    if (delivery.agent?.phone) {
      smsService
        .sendSms(
          delivery.agent.phone,
          `CosmosERP: New delivery assigned — ${delivery.trackingNumber}. Customer: ${delivery.customerName}. Drop-off: ${delivery.deliveryAddress}.`,
        )
        .catch((err) => logger.warn('Agent assignment SMS failed:', err.message));
    }
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
          city: true, state: true, coverageAreas: true, cacNumber: true,
          status: true, rating: true, totalDeliveries: true, isActive: true,
          createdAt: true, _count: { select: { agents: true, deliveries: true } },
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
