const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

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
        _count: { select: { agents: { where: { status: 'ACTIVE' } } } },
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

    if (!customerName || !deliveryAddress) {
      return res.status(400).json({ error: 'Customer name and delivery address are required' });
    }

    const trackingNumber = generateTrackingNumber();
    const fee = parseFloat(deliveryFee) || 1500;
    const commission = fee * 0.15;
    const payout = fee - commission;

    const delivery = await prisma.delivery.create({
      data: {
        tenantId,
        orderId: orderId || null,
        orderRef: orderRef || null,
        invoiceRef: invoiceRef || null,
        trackingNumber,
        companyId: companyId || null,
        customerName,
        customerPhone,
        customerEmail,
        pickupAddress,
        deliveryAddress,
        city,
        state,
        packageDescription,
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

    // Update marketplace order if linked
    if (orderId) {
      await prisma.marketplaceOrder.update({
        where: { id: orderId },
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
