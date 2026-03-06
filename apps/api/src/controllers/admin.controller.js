const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

async function getNRSLogs(req, res) {
  try {
    const { page, limit, tenantId, status, search, from, to } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { irn: { contains: search, mode: 'insensitive' } },
        { invoiceRef: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        { tenant: { businessName: { contains: search, mode: 'insensitive' } } },
        { tenant: { tradingName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      prisma.nRSLog.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { id: true, businessName: true } }, invoice: { select: { id: true, invoiceNumber: true } } },
      }),
      prisma.nRSLog.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch NRS logs' });
  }
}

async function getNRSStats(req, res) {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [nrsByStatus, total, taxByStatus] = await Promise.all([
      prisma.nRSLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from } },
        _count: true,
      }),
      prisma.nRSLog.count({ where: { createdAt: { gte: from } } }),
      prisma.taxFiling.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from } },
        _count: true,
      }),
    ]);

    const nrsCount = (status) => nrsByStatus.find((r) => r.status === status)?._count || 0;
    const taxCount = (status) => taxByStatus.find((r) => r.status === status)?._count || 0;
    const approved = nrsCount('SUCCESS') + nrsCount('APPROVED');
    const failed = nrsCount('FAILED') + nrsCount('REJECTED');
    const pending = nrsCount('PENDING');
    const filedTaxReturns = taxCount('FILED') + taxCount('APPROVED') + taxCount('PAID');
    const pendingTaxFilings = taxCount('PENDING') + taxCount('DRAFT');
    const overdueTaxFilings = taxCount('OVERDUE') + taxCount('LATE');

    res.json({
      data: {
        period,
        total,
        approved,
        failed,
        pending,
        successRate: total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0,
        taxByStatus,
        filedTaxReturns,
        pendingTaxFilings,
        overdueTaxFilings,
      },
    });
  } catch (error) {
    logger.error('NRS stats error:', error);
    res.status(500).json({ error: 'Failed to fetch NRS stats' });
  }
}

async function retryNRSSubmission(req, res) {
  try {
    const log = await prisma.nRSLog.findUnique({ where: { id: req.params.id } });
    if (!log || !log.invoiceId) return res.status(404).json({ error: 'Log not found or no invoice attached' });
    const nrsService = require('../services/nrs.service');
    const result = await nrsService.submitInvoice(log.invoiceId, log.tenantId);
    await createAuditLog({ adminUserId: req.admin.id, action: 'RETRY_NRS', resource: 'NRSLog', resourceId: log.id, req });
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'NRS retry failed' });
  }
}

async function getPlatformAnalytics(req, res) {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      tenantStats, marketplaceStats, nrsStats,
      revenueByDay, topSellers, subscriptionBreakdown,
    ] = await Promise.all([
      prisma.tenant.groupBy({ by: ['kycStatus', 'subscriptionStatus'], _count: true }),
      prisma.marketplaceOrder.aggregate({ where: { createdAt: { gte: from }, paymentStatus: 'SUCCESS' }, _sum: { totalAmount: true, platformFee: true }, _count: true }),
      prisma.nRSLog.groupBy({ by: ['status'], where: { createdAt: { gte: from } }, _count: true }),
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, SUM("totalAmount")::float as revenue, COUNT(*) as orders
        FROM "MarketplaceOrder"
        WHERE "createdAt" >= ${from} AND "paymentStatus" = 'SUCCESS'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.marketplaceOrderLine.groupBy({
        by: ['tenantId'],
        where: { order: { createdAt: { gte: from }, paymentStatus: 'SUCCESS' } },
        _sum: { lineTotal: true },
        _count: true,
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 10,
      }),
      prisma.tenant.groupBy({ by: ['subscriptionPlan'], _count: true }),
    ]);

    res.json({
      data: {
        tenants: tenantStats,
        marketplace: {
          gmv: parseFloat(marketplaceStats._sum.totalAmount || 0),
          platformRevenue: parseFloat(marketplaceStats._sum.platformFee || 0),
          orderCount: marketplaceStats._count,
        },
        nrs: nrsStats,
        revenueByDay,
        topSellers,
        subscriptionBreakdown,
      },
    });
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

async function getAuditLogs(req, res) {
  try {
    const { page, limit, tenantId, action, resource, from, to } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = resource;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { businessName: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
          adminUser: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

async function moderateListing(req, res) {
  try {
    const { action, reason } = req.body;
    const listing = await prisma.marketplaceListing.findUnique({ where: { id: req.params.id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isActive = action === 'approve';
    const updated = await prisma.marketplaceListing.update({ where: { id: listing.id }, data: { isActive } });
    await createAuditLog({ adminUserId: req.admin.id, action: `LISTING_${action.toUpperCase()}`, resource: 'MarketplaceListing', resourceId: listing.id, newValues: { reason }, req });
    res.json({ message: `Listing ${action}d`, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to moderate listing' });
  }
}

async function createAdminUser(req, res) {
  try {
    const bcrypt = require('bcryptjs');
    const { email, password, firstName, lastName, role } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'All fields required' });
    const existing = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Admin user already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.adminUser.create({ data: { email: email.toLowerCase(), passwordHash, firstName, lastName, role: role || 'SUPPORT' } });
    res.status(201).json({ data: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin user' });
  }
}

// ══════════════════════════════════════════════
// SUBSCRIPTIONS & BILLING
// ══════════════════════════════════════════════

async function getSubscriptionStats(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      planBreakdown, statusBreakdown, totalRevenue,
      monthlyRevenue, recentPayments, expiringTrials,
    ] = await Promise.all([
      prisma.tenant.groupBy({ by: ['subscriptionPlan'], _count: true }),
      prisma.tenant.groupBy({ by: ['subscriptionStatus'], _count: true }),
      prisma.subscriptionPayment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true }, _count: true }),
      prisma.subscriptionPayment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
      prisma.subscriptionPayment.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { subscription: { include: { tenant: { select: { id: true, businessName: true, tradingName: true } } } } },
      }),
      prisma.tenant.findMany({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, businessName: true, tradingName: true, trialEndsAt: true, subscriptionPlan: true },
        orderBy: { trialEndsAt: 'asc' },
        take: 20,
      }),
    ]);

    res.json({
      data: {
        planBreakdown, statusBreakdown,
        totalRevenue: parseFloat(totalRevenue._sum.amount || 0),
        totalPayments: totalRevenue._count,
        monthlyRevenue: parseFloat(monthlyRevenue._sum.amount || 0),
        monthlyPayments: monthlyRevenue._count,
        recentPayments, expiringTrials,
      },
    });
  } catch (error) {
    logger.error('Subscription stats error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription stats' });
  }
}

async function listSubscriptions(req, res) {
  try {
    const { page, limit, plan, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (plan) where.plan = plan;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, businessName: true, tradingName: true, email: true } },
          _count: { select: { payments: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
}

async function updateTenantSubscription(req, res) {
  try {
    const { plan, status, endDate } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.tenantId },
      data: {
        ...(plan && { subscriptionPlan: plan }),
        ...(status && { subscriptionStatus: status }),
        ...(endDate && { subscriptionEndsAt: new Date(endDate) }),
      },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'UPDATE_SUBSCRIPTION', resource: 'Tenant', resourceId: tenant.id, newValues: { plan, status }, req });
    res.json({ data: tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
}

// ══════════════════════════════════════════════
// FINANCE OVERVIEW
// ══════════════════════════════════════════════

async function getFinanceOverview(req, res) {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      invoiceStats, paymentStats, taxFilingStats,
      invoicesByStatus, topTenantsByRevenue,
      overdueInvoices, recentPayments,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: { createdAt: { gte: from } }, _sum: { totalAmount: true, amountPaid: true, amountDue: true, vatAmount: true, whtAmount: true }, _count: true }),
      prisma.payment.aggregate({ where: { createdAt: { gte: from }, status: 'SUCCESS' }, _sum: { amount: true }, _count: true }),
      prisma.taxFiling.groupBy({ by: ['status'], where: { createdAt: { gte: from } }, _count: true }),
      prisma.invoice.groupBy({ by: ['status'], where: { createdAt: { gte: from } }, _count: true, _sum: { totalAmount: true } }),
      prisma.invoice.groupBy({
        by: ['tenantId'],
        where: { createdAt: { gte: from }, status: { in: ['PAID', 'PARTIAL'] } },
        _sum: { amountPaid: true },
        _count: true,
        orderBy: { _sum: { amountPaid: 'desc' } },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: { status: 'OVERDUE' },
        take: 20,
        orderBy: { dueDate: 'asc' },
        include: { tenant: { select: { id: true, businessName: true } }, customer: { select: { name: true } } },
      }),
      prisma.payment.findMany({
        where: { status: 'SUCCESS' },
        take: 15,
        orderBy: { paidAt: 'desc' },
        include: { invoice: { include: { tenant: { select: { businessName: true } }, customer: { select: { name: true } } } } },
      }),
    ]);

    // Resolve tenant names for top tenants
    const tenantIds = topTenantsByRevenue.map(t => t.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, businessName: true, tradingName: true },
    });
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

    res.json({
      data: {
        totalInvoiced: parseFloat(invoiceStats._sum.totalAmount || 0),
        totalPaid: parseFloat(invoiceStats._sum.amountPaid || 0),
        totalDue: parseFloat(invoiceStats._sum.amountDue || 0),
        totalVAT: parseFloat(invoiceStats._sum.vatAmount || 0),
        totalWHT: parseFloat(invoiceStats._sum.whtAmount || 0),
        invoiceCount: invoiceStats._count,
        paymentTotal: parseFloat(paymentStats._sum.amount || 0),
        paymentCount: paymentStats._count,
        taxFilingStats,
        invoicesByStatus,
        topTenantsByRevenue: topTenantsByRevenue.map(t => ({
          ...t,
          tenant: tenantMap[t.tenantId],
          total: parseFloat(t._sum.amountPaid || 0),
        })),
        overdueInvoices,
        recentPayments,
      },
    });
  } catch (error) {
    logger.error('Finance overview error:', error);
    res.status(500).json({ error: 'Failed to fetch finance overview' });
  }
}

async function listAllInvoices(req, res) {
  try {
    const { page, limit, tenantId, status, from, to } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to); }

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, businessName: true } },
          customer: { select: { name: true, email: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

// ══════════════════════════════════════════════
// HR & PAYROLL
// ══════════════════════════════════════════════

async function getHROverview(req, res) {
  try {
    const [
      totalEmployees, employeesByType, activePayrolls,
      totalPayrollValue, payrollByMonth, topEmployers,
      complianceStats,
    ] = await Promise.all([
      prisma.employee.count({ where: { isActive: true } }),
      prisma.employee.groupBy({ by: ['employmentType'], where: { isActive: true }, _count: true }),
      prisma.payrollRun.count({ where: { status: { in: ['DRAFT', 'PROCESSING', 'APPROVED'] } } }),
      prisma.payrollRun.aggregate({ where: { status: 'PAID' }, _sum: { totalNet: true, totalPaye: true, totalPension: true, totalNhf: true } }),
      prisma.payrollRun.findMany({
        where: { status: 'PAID' },
        select: { month: true, year: true, totalGross: true, totalNet: true, totalPaye: true, totalPension: true, tenantId: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 12,
      }),
      prisma.employee.groupBy({
        by: ['tenantId'],
        where: { isActive: true },
        _count: true,
        orderBy: { _count: { tenantId: 'desc' } },
        take: 10,
      }),
      prisma.taxFiling.groupBy({ by: ['type', 'status'], _count: true }),
    ]);

    const tenantIds = topEmployers.map(t => t.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, businessName: true, tradingName: true },
    });
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

    res.json({
      data: {
        totalEmployees,
        employeesByType,
        activePayrolls,
        totalNetPaid: parseFloat(totalPayrollValue._sum.totalNet || 0),
        totalPAYE: parseFloat(totalPayrollValue._sum.totalPaye || 0),
        totalPension: parseFloat(totalPayrollValue._sum.totalPension || 0),
        totalNHF: parseFloat(totalPayrollValue._sum.totalNhf || 0),
        payrollByMonth,
        topEmployers: topEmployers.map(t => ({ ...t, tenant: tenantMap[t.tenantId] })),
        complianceStats,
      },
    });
  } catch (error) {
    logger.error('HR overview error:', error);
    res.status(500).json({ error: 'Failed to fetch HR overview' });
  }
}

async function listAllPayrollRuns(req, res) {
  try {
    const { page, limit, tenantId, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, businessName: true } },
          _count: { select: { payslips: true } },
        },
      }),
      prisma.payrollRun.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll runs' });
  }
}

// ══════════════════════════════════════════════
// POS OVERVIEW
// ══════════════════════════════════════════════

async function getPOSOverview(req, res) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSales, todaySales, monthlySales,
      salesByPayment, salesByStatus,
      topTenantsByPOS, recentSales,
    ] = await Promise.all([
      prisma.pOSSale.aggregate({ _sum: { totalAmount: true, vatAmount: true }, _count: true }),
      prisma.pOSSale.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { totalAmount: true }, _count: true }),
      prisma.pOSSale.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
      prisma.pOSSale.groupBy({ by: ['paymentMethod'], where: { status: 'COMPLETED' }, _sum: { totalAmount: true }, _count: true }),
      prisma.pOSSale.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
      prisma.pOSSale.groupBy({
        by: ['tenantId'],
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
        _count: true,
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),
      prisma.pOSSale.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { businessName: true, tradingName: true } },
          cashier: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const tenantIds = topTenantsByPOS.map(t => t.tenantId);
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, businessName: true, tradingName: true },
    });
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

    res.json({
      data: {
        totalRevenue: parseFloat(totalSales._sum.totalAmount || 0),
        totalVAT: parseFloat(totalSales._sum.vatAmount || 0),
        totalSaleCount: totalSales._count,
        todayRevenue: parseFloat(todaySales._sum.totalAmount || 0),
        todayCount: todaySales._count,
        monthRevenue: parseFloat(monthlySales._sum.totalAmount || 0),
        monthCount: monthlySales._count,
        salesByPayment,
        salesByStatus,
        topTenantsByPOS: topTenantsByPOS.map(t => ({ ...t, tenant: tenantMap[t.tenantId], total: parseFloat(t._sum.totalAmount || 0) })),
        recentSales,
      },
    });
  } catch (error) {
    logger.error('POS overview error:', error);
    res.status(500).json({ error: 'Failed to fetch POS overview' });
  }
}

// ══════════════════════════════════════════════
// SUPPORT TICKETS
// ══════════════════════════════════════════════

async function getSupportStats(req, res) {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalTickets, openTickets, inProgressTickets,
      resolvedToday, byPriority, byCategory,
      byChannel, avgResponseTime, escalatedTickets,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { resolvedAt: { gte: startOfDay } } }),
      prisma.supportTicket.groupBy({ by: ['priority'], _count: true }),
      prisma.supportTicket.groupBy({ by: ['category'], _count: true }),
      prisma.supportTicket.groupBy({ by: ['channel'], _count: true }),
      prisma.supportTicket.aggregate({
        where: { firstResponseAt: { not: null } },
        _count: true,
      }),
      prisma.supportTicket.findMany({
        where: { priority: { in: ['HIGH', 'URGENT'] }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        take: 20,
        orderBy: { createdAt: 'asc' },
        include: {
          tenant: { select: { businessName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    res.json({
      data: {
        totalTickets, openTickets, inProgressTickets,
        resolvedToday, byPriority, byCategory, byChannel,
        escalatedTickets,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support stats' });
  }
}

async function listAllTickets(req, res) {
  try {
    const { page, limit, tenantId, status, priority, category } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, businessName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
          customer: { select: { name: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

async function updateTicketStatus(req, res) {
  try {
    const { status, assignedToId } = req.body;
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED') updateData.resolvedAt = new Date();
      if (status === 'CLOSED') updateData.closedAt = new Date();
    }
    if (assignedToId) updateData.assignedToId = assignedToId;

    const ticket = await prisma.supportTicket.update({ where: { id: req.params.ticketId }, data: updateData });
    await createAuditLog({ adminUserId: req.admin.id, action: 'UPDATE_TICKET', resource: 'SupportTicket', resourceId: ticket.id, newValues: { status }, req });
    res.json({ data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}

// ══════════════════════════════════════════════
// USERS MANAGEMENT
// ══════════════════════════════════════════════

async function listAdminUsers(req, res) {
  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json({ data: admins });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
}

async function updateAdminUser(req, res) {
  try {
    const { role, isActive } = req.body;
    const admin = await prisma.adminUser.update({
      where: { id: req.params.adminId },
      data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
    res.json({ data: admin });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update admin user' });
  }
}

async function getTenantUsers(req, res) {
  try {
    const { page, limit, tenantId, role } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (role) where.role = role;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isActive: true, lastLoginAt: true, createdAt: true, phone: true,
          tenant: { select: { id: true, businessName: true, tradingName: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant users' });
  }
}

async function toggleUserStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: user.isActive ? 'DEACTIVATE_USER' : 'ACTIVATE_USER', resource: 'User', resourceId: user.id, req });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
}

// ══════════════════════════════════════════════
// TENANT MANAGEMENT (LIST / DETAIL / KYC)
// ══════════════════════════════════════════════

async function listTenants(req, res) {
  try {
    const { page, limit, search, kycStatus, plan, subscriptionStatus, sort } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (kycStatus) where.kycStatus = kycStatus;
    if (plan) where.subscriptionPlan = plan;
    if (subscriptionStatus) where.subscriptionStatus = subscriptionStatus;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { tradingName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { tin: { contains: search, mode: 'insensitive' } },
        { rcNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy = sort === 'name' ? { businessName: 'asc' } : sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };
    const [data, total] = await Promise.all([
      prisma.tenant.findMany({
        where, take, skip, orderBy,
        include: {
          _count: { select: { users: true, invoices: true, products: true, employees: true, nrsLogs: true, supportTickets: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('Admin list tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
}

async function getTenantDetail(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.tenantId },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 10 },
        currencies: true,
        _count: { select: { invoices: true, products: true, customers: true, employees: true, nrsLogs: true, users: true, supportTickets: true, posSales: true, payrollRuns: true } },
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ data: tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant detail' });
  }
}

async function adminUpdateKYC(req, res) {
  try {
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ error: 'KYC status is required' });
    const data = {
      kycStatus: status,
      ...(status === 'APPROVED' && { kycVerifiedAt: new Date(), kycVerifiedBy: req.admin.id }),
      ...(status === 'REJECTED' && { kycRejectionReason: reason, kycVerifiedAt: null, kycVerifiedBy: null }),
      ...(status === 'UNDER_REVIEW' && { kycVerifiedAt: null }),
    };
    const tenant = await prisma.tenant.update({ where: { id: req.params.tenantId }, data });
    await createAuditLog({ adminUserId: req.admin.id, action: `KYC_${status}`, resource: 'Tenant', resourceId: tenant.id, newValues: { status, reason }, req });
    res.json({ data: tenant, message: `KYC status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
}

async function adminAddTenantNote(req, res) {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note content is required' });
    await createAuditLog({ adminUserId: req.admin.id, action: 'ADD_NOTE', resource: 'Tenant', resourceId: req.params.tenantId, newValues: { note }, req });
    res.json({ message: 'Note added successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
}

async function adminToggleTenantActive(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const updated = await prisma.tenant.update({ where: { id: req.params.tenantId }, data: { isActive: !tenant.isActive } });
    await createAuditLog({ adminUserId: req.admin.id, action: updated.isActive ? 'ACTIVATE_TENANT' : 'DEACTIVATE_TENANT', resource: 'Tenant', resourceId: tenant.id, req });
    res.json({ data: updated, message: `Tenant ${updated.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle tenant status' });
  }
}

async function adminGetTenantAuditLogs(req, res) {
  try {
    const { page, limit } = req.query;
    const { take, skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { resourceId: req.params.tenantId, resource: 'Tenant' },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.auditLog.count({ where: { resourceId: req.params.tenantId, resource: 'Tenant' } }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant audit logs' });
  }
}

async function adminToggleTenantUserStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updated = await prisma.user.update({ where: { id: req.params.userId }, data: { isActive: !user.isActive } });
    await createAuditLog({ adminUserId: req.admin.id, action: updated.isActive ? 'ENABLE_USER' : 'DISABLE_USER', resource: 'User', resourceId: user.id, req });
    res.json({ data: updated, message: `User ${updated.isActive ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
}

// TENANT MANAGEMENT ACTIONS
// ══════════════════════════════════════════════

async function suspendTenant(req, res) {
  try {
    const { reason } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.params.tenantId },
      data: { subscriptionStatus: 'SUSPENDED' },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'SUSPEND_TENANT', resource: 'Tenant', resourceId: tenant.id, newValues: { reason }, req });
    res.json({ data: tenant, message: 'Tenant suspended' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to suspend tenant' });
  }
}

async function activateTenant(req, res) {
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.tenantId },
      data: { subscriptionStatus: 'ACTIVE' },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'ACTIVATE_TENANT', resource: 'Tenant', resourceId: tenant.id, req });
    res.json({ data: tenant, message: 'Tenant activated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate tenant' });
  }
}

async function extendTrial(req, res) {
  try {
    const { days } = req.body;
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const baseDate = tenant.trialEndsAt && tenant.trialEndsAt > new Date() ? tenant.trialEndsAt : new Date();
    const newEnd = new Date(baseDate.getTime() + (days || 14) * 24 * 60 * 60 * 1000);
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEndsAt: newEnd, subscriptionStatus: 'TRIAL' },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'EXTEND_TRIAL', resource: 'Tenant', resourceId: tenant.id, newValues: { days, newEnd }, req });
    res.json({ data: updated, message: `Trial extended by ${days} days` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extend trial' });
  }
}

// ══════════════════════════════════════════════
// FINANCE ACTIONS
// ══════════════════════════════════════════════

async function flagInvoice(req, res) {
  try {
    const { flag, notes } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.invoiceId },
      data: { adminNotes: notes, adminFlagged: flag !== false },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: flag !== false ? 'FLAG_INVOICE' : 'UNFLAG_INVOICE', resource: 'Invoice', resourceId: invoice.id, newValues: { notes }, req });
    res.json({ data: invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to flag invoice' });
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    const { status } = req.body;
    const invoice = await prisma.invoice.update({
      where: { id: req.params.invoiceId },
      data: { status },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'ADMIN_UPDATE_INVOICE', resource: 'Invoice', resourceId: invoice.id, newValues: { status }, req });
    res.json({ data: invoice });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
}

// ══════════════════════════════════════════════
// HR PAYROLL ACTIONS
// ══════════════════════════════════════════════

async function updatePayrollStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ['APPROVED', 'PAID', 'CANCELLED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    const payroll = await prisma.payrollRun.update({
      where: { id: req.params.payrollId },
      data: { status, ...(status === 'PAID' && { paidAt: new Date() }) },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: `PAYROLL_${status}`, resource: 'PayrollRun', resourceId: payroll.id, req });
    res.json({ data: payroll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payroll status' });
  }
}

// ══════════════════════════════════════════════
// POS ACTIONS
// ══════════════════════════════════════════════

async function adminVoidSale(req, res) {
  try {
    const { reason } = req.body;
    const sale = await prisma.pOSSale.findUnique({ where: { id: req.params.saleId } });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'VOIDED') return res.status(400).json({ error: 'Sale already voided' });
    const voided = await prisma.pOSSale.update({
      where: { id: sale.id },
      data: { status: 'VOIDED', voidedAt: new Date(), voidReason: reason || 'Admin voided' },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'VOID_POS_SALE', resource: 'POSSale', resourceId: sale.id, newValues: { reason }, req });
    res.json({ data: voided, message: 'Sale voided' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to void sale' });
  }
}

async function listPOSSales(req, res) {
  try {
    const { page, limit, tenantId, status, from, to } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to); }
    const [data, total] = await Promise.all([
      prisma.pOSSale.findMany({
        where, take, skip, orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, businessName: true } },
          cashier: { select: { firstName: true, lastName: true } },
          lines: { select: { productName: true, quantity: true, lineTotal: true } },
        },
      }),
      prisma.pOSSale.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch POS sales' });
  }
}

// ══════════════════════════════════════════════
// SUPPORT TICKET ACTIONS
// ══════════════════════════════════════════════

async function addTicketComment(req, res) {
  try {
    const { body, isInternal } = req.body;
    if (!body) return res.status(400).json({ error: 'Comment body required' });
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: req.params.ticketId,
        authorName: `${req.admin.firstName} ${req.admin.lastName} (Admin)`,
        body,
        isInternal: isInternal !== false,
      },
    });
    // Update ticket to IN_PROGRESS if it was OPEN
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.ticketId } });
    if (ticket && ticket.status === 'OPEN') {
      await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'IN_PROGRESS', firstResponseAt: ticket.firstResponseAt || new Date() } });
    }
    await createAuditLog({ adminUserId: req.admin.id, action: 'TICKET_COMMENT', resource: 'SupportTicket', resourceId: req.params.ticketId, req });
    res.json({ data: comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

async function getTicketDetail(req, res) {
  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: req.params.ticketId },
      include: {
        tenant: { select: { id: true, businessName: true, tradingName: true, email: true } },
        customer: { select: { name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ data: ticket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket detail' });
  }
}

async function escalateTicket(req, res) {
  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.ticketId },
      data: { priority: 'URGENT', status: 'IN_PROGRESS' },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'ESCALATE_TICKET', resource: 'SupportTicket', resourceId: ticket.id, req });
    res.json({ data: ticket, message: 'Ticket escalated to URGENT' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to escalate ticket' });
  }
}

// ══════════════════════════════════════════════
// SYSTEM SETTINGS
// ══════════════════════════════════════════════

async function getPlatformSettings(req, res) {
  try {
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({ data: { name: 'Cosmos ERP' } });
    }
    const [tenantCount, userCount, productCount] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.product.count(),
    ]);
    res.json({ data: { ...platform, stats: { tenantCount, userCount, productCount } } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platform settings' });
  }
}

async function updatePlatformSettings(req, res) {
  try {
    const { name, commissionRate, vatRate, currency } = req.body;
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({ data: { name: name || 'Cosmos ERP' } });
    }
    const updated = await prisma.platform.update({
      where: { id: platform.id },
      data: {
        ...(name && { name }),
        ...(commissionRate !== undefined && { commissionRate }),
        ...(vatRate !== undefined && { vatRate }),
        ...(currency && { currency }),
      },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'UPDATE_PLATFORM_SETTINGS', resource: 'Platform', resourceId: updated.id, newValues: req.body, req });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
}

async function updateFeatureFlags(req, res) {
  try {
    const { featureFlags } = req.body;
    if (!featureFlags || typeof featureFlags !== 'object') {
      return res.status(400).json({ error: 'featureFlags object is required' });
    }
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({ data: { name: 'Cosmos ERP' } });
    }
    const updated = await prisma.platform.update({
      where: { id: platform.id },
      data: { featureFlags },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: 'UPDATE_FEATURE_FLAGS', resource: 'Platform', resourceId: updated.id, newValues: { featureFlags }, req });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update feature flags' });
  }
}

async function updateMaintenanceMode(req, res) {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    let platform = await prisma.platform.findFirst();
    if (!platform) {
      platform = await prisma.platform.create({ data: { name: 'Cosmos ERP' } });
    }
    const updated = await prisma.platform.update({
      where: { id: platform.id },
      data: {
        ...(maintenanceMode !== undefined && { maintenanceMode: !!maintenanceMode }),
        ...(maintenanceMessage !== undefined && { maintenanceMessage }),
      },
    });
    await createAuditLog({ adminUserId: req.admin.id, action: maintenanceMode ? 'ENABLE_MAINTENANCE_MODE' : 'DISABLE_MAINTENANCE_MODE', resource: 'Platform', resourceId: updated.id, newValues: req.body, req });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
}

module.exports = {
  getNRSLogs, getNRSStats, retryNRSSubmission, getPlatformAnalytics, getAuditLogs, moderateListing, createAdminUser,
  getSubscriptionStats, listSubscriptions, updateTenantSubscription,
  listTenants, getTenantDetail, adminUpdateKYC, adminAddTenantNote, adminToggleTenantActive, adminGetTenantAuditLogs, adminToggleTenantUserStatus,
  suspendTenant, activateTenant, extendTrial,
  getFinanceOverview, listAllInvoices, flagInvoice, updateInvoiceStatus,
  getHROverview, listAllPayrollRuns, updatePayrollStatus,
  getPOSOverview, listPOSSales, adminVoidSale,
  getSupportStats, listAllTickets, updateTicketStatus, addTicketComment, getTicketDetail, escalateTicket,
  listAdminUsers, updateAdminUser, getTenantUsers, toggleUserStatus,
  getPlatformSettings, updatePlatformSettings, updateFeatureFlags, updateMaintenanceMode,
};
