const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

async function getTenantDashboard(req, res) {
  try {
    const tenantId = req.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue, lastMonthRevenue,
      unpaidInvoices, overdueInvoices,
      totalProducts, lowStockCount,
      totalCustomers, totalEmployees,
      recentInvoices, nrsStats,
      pendingPOs,
      marketplaceFulfillmentCount,
      marketplaceDisputedCount,
      activeDeliveriesCount,
      payrollPendingApproval,
      posTxCountThisMonth,
      posSalesMonth,
      openPurchaseOrders,
      openPurchaseOrderValue,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId, status: 'PAID', issueDate: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { tenantId, status: 'PAID', issueDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { tenantId, status: { in: ['SENT', 'PARTIAL'] } }, _sum: { amountDue: true }, _count: true }),
      prisma.invoice.count({ where: { tenantId, status: 'OVERDUE' } }),
      prisma.product.count({ where: { tenantId, isActive: true } }),
      prisma.stockLevel.count({ where: { tenantId: tenantId, quantity: { lte: 0 } } }),
      prisma.customer.count({ where: { tenantId } }),
      prisma.employee.count({ where: { tenantId, isActive: true } }),
      prisma.invoice.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          amountDue: true,
          dueDate: true,
          createdAt: true,
          nrsStatus: true,
          currency: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.nRSLog.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prisma.purchaseOrder.count({ where: { tenantId, status: 'DRAFT' } }),
      prisma.marketplaceOrder.count({
        where: {
          lines: { some: { tenantId } },
          paymentStatus: 'SUCCESS',
          status: { in: ['CONFIRMED', 'PROCESSING'] },
        },
      }),
      prisma.marketplaceOrder.count({
        where: {
          lines: { some: { tenantId } },
          status: 'DISPUTED',
        },
      }),
      prisma.delivery.count({
        where: {
          tenantId,
          status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] },
        },
      }),
      prisma.payrollRun.count({ where: { tenantId, status: 'PROCESSING' } }),
      prisma.pOSSale.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.pOSSale.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.count({
        where: { tenantId, status: { in: ['SENT', 'PARTIAL'] } },
      }),
      prisma.purchaseOrder.aggregate({
        where: { tenantId, status: { in: ['SENT', 'PARTIAL'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    const thisMonthRevenue = parseFloat(totalRevenue._sum.totalAmount || 0);
    const prevMonthRevenue = parseFloat(lastMonthRevenue._sum.totalAmount || 0);
    const revenueGrowth = prevMonthRevenue > 0 ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

    const nrsStatusMap = {};
    nrsStats.forEach((s) => { nrsStatusMap[s.status] = s._count; });

    res.json({
      data: {
        revenue: {
          thisMonth: thisMonthRevenue,
          lastMonth: prevMonthRevenue,
          growth: parseFloat(revenueGrowth.toFixed(1)),
        },
        receivables: {
          amount: parseFloat(unpaidInvoices._sum.amountDue || 0),
          count: unpaidInvoices._count,
          overdueCount: overdueInvoices,
        },
        inventory: { totalProducts, lowStockCount },
        customers: totalCustomers,
        employees: totalEmployees,
        pendingPOs,
        nrs: {
          approved: nrsStatusMap['SUCCESS'] || 0,
          failed: nrsStatusMap['FAILED'] || 0,
          pending: nrsStatusMap['PENDING'] || 0,
        },
        recentInvoices,
        marketplace: {
          fulfillmentQueue: marketplaceFulfillmentCount,
          disputed: marketplaceDisputedCount,
        },
        logistics: {
          activeDeliveries: activeDeliveriesCount,
        },
        payroll: {
          pendingApproval: payrollPendingApproval,
        },
        pos: {
          salesThisMonth: parseFloat(posSalesMonth._sum.totalAmount || 0),
          transactionsThisMonth: posTxCountThisMonth,
        },
        procurement: {
          openPOCount: openPurchaseOrders,
          openPOValue: parseFloat(openPurchaseOrderValue._sum.totalAmount || 0),
        },
      },
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTenants, activeTenants, kycPending, trialTenants,
      totalMarketplaceOrders, monthlyGMV,
      totalNRSLogs, failedNRSLogs,
      recentTenants, recentOrders,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true, subscriptionStatus: 'ACTIVE' } }),
      prisma.tenant.count({ where: { kycStatus: 'UNDER_REVIEW' } }),
      prisma.tenant.count({ where: { subscriptionStatus: 'TRIAL' } }),
      prisma.marketplaceOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.marketplaceOrder.aggregate({ where: { paymentStatus: 'SUCCESS', createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true } }),
      prisma.nRSLog.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.nRSLog.count({ where: { status: 'FAILED', createdAt: { gte: startOfMonth } } }),
      prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, businessName: true, email: true, kycStatus: true, subscriptionPlan: true, createdAt: true } }),
      prisma.marketplaceOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, orderNumber: true, buyerName: true, totalAmount: true, status: true, createdAt: true } }),
    ]);

    res.json({
      data: {
        tenants: { total: totalTenants, active: activeTenants, kycPending, trial: trialTenants },
        marketplace: { monthlyOrders: totalMarketplaceOrders, monthlyGMV: parseFloat(monthlyGMV._sum.totalAmount || 0) },
        nrs: { totalLogs: totalNRSLogs, failedLogs: failedNRSLogs, failureRate: totalNRSLogs > 0 ? parseFloat(((failedNRSLogs / totalNRSLogs) * 100).toFixed(1)) : 0 },
        recentTenants,
        recentOrders,
      },
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load admin dashboard' });
  }
}

module.exports = { getTenantDashboard, getAdminDashboard };
