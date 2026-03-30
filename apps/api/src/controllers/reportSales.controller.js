const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// Sales Pipeline Analytics: Lead funnel, conversion rates, LTV, repeat customers
async function getPipelineAnalytics(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'from must be on or before to' });
    }

    // Pipeline stages (leads by status)
    const leads = await prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId: req.tenantId, createdAt: { gte: fromDate, lte: toDate } },
      _count: true,
    });

    const pipeline = {
      NEW: leads.find((l) => l.status === 'NEW')?._count || 0,
      QUALIFIED: leads.find((l) => l.status === 'QUALIFIED')?._count || 0,
      PROPOSED: leads.find((l) => l.status === 'PROPOSED')?._count || 0,
      NEGOTIATING: leads.find((l) => l.status === 'NEGOTIATING')?._count || 0,
      CLOSED_WON: leads.find((l) => l.status === 'CLOSED_WON')?._count || 0,
      CLOSED_LOST: leads.find((l) => l.status === 'CLOSED_LOST')?._count || 0,
    };

    const totalLeads = Object.values(pipeline).reduce((s, c) => s + c, 0);

    // Conversion rate: invoices created from leads in period
    const convertedLeads = await prisma.lead.count({
      where: { tenantId: req.tenantId, status: 'CLOSED_WON', createdAt: { gte: fromDate, lte: toDate } },
    });

    const conversionRate = totalLeads > 0 ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    // Customer LTV & repeat rate
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: req.tenantId, status: { in: ['SENT', 'PAID', 'PARTIAL'] }, issueDate: { gte: fromDate, lte: toDate } },
      select: { customerId: true, totalAmount: true },
    });

    const customerSpending = invoices.reduce((acc, inv) => {
      if (!acc[inv.customerId]) acc[inv.customerId] = 0;
      acc[inv.customerId] += parseFloat(inv.totalAmount || 0);
      return acc;
    }, {});

    const customerIds = Object.keys(customerSpending);
    const uniqueCustomers = customerIds.length;
    const totalRevenue = Object.values(customerSpending).reduce((s, v) => s + v, 0);
    const ltv = uniqueCustomers > 0 ? Math.round(totalRevenue / uniqueCustomers) : 0;

    // Repeat customers (those with 2+ invoices in period)
    const allInvoicesByCustomer = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: { tenantId: req.tenantId, status: { in: ['SENT', 'PAID', 'PARTIAL'] }, issueDate: { gte: fromDate, lte: toDate } },
      _count: true,
    });

    const repeatCount = allInvoicesByCustomer.filter((c) => c._count >= 2).length;
    const repeatRate = uniqueCustomers > 0 ? parseFloat(((repeatCount / uniqueCustomers) * 100).toFixed(1)) : 0;

    // Top customers by revenue
    const topCustomers = await prisma.invoice.findMany({
      where: { tenantId: req.tenantId, status: { in: ['SENT', 'PAID', 'PARTIAL'] }, issueDate: { gte: fromDate, lte: toDate } },
      include: { customer: { select: { name: true } } },
      orderBy: { totalAmount: 'desc' },
      take: 10,
    });

    const topCustomersGrouped = topCustomers.reduce((acc, inv) => {
      const name = inv.customer?.name || 'Unknown';
      if (!acc[name]) acc[name] = { total: 0, invoiceCount: 0 };
      acc[name].total += parseFloat(inv.totalAmount || 0);
      acc[name].invoiceCount += 1;
      return acc;
    }, {});

    const topCustomersList = Object.entries(topCustomersGrouped)
      .map(([name, data]) => ({ customer: name, total: data.total, count: data.invoiceCount }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      data: {
        period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
        metrics: [
          { label: 'Total Leads', value: totalLeads, format: 'number' },
          { label: 'Closed Won', value: pipeline.CLOSED_WON, format: 'number' },
          { label: 'Conversion Rate', value: conversionRate, format: 'percentage' },
          { label: 'Unique Customers', value: uniqueCustomers, format: 'number' },
          { label: 'Customer LTV', value: ltv, format: 'currency' },
          { label: 'Repeat Rate', value: repeatRate, format: 'percentage' },
        ],
        pipeline: {
          NEW: pipeline.NEW,
          QUALIFIED: pipeline.QUALIFIED,
          PROPOSED: pipeline.PROPOSED,
          NEGOTIATING: pipeline.NEGOTIATING,
          CLOSED_WON: pipeline.CLOSED_WON,
          CLOSED_LOST: pipeline.CLOSED_LOST,
        },
        conversionStats: {
          totalLeads,
          converted: convertedLeads,
          conversionRate,
        },
        customerMetrics: {
          uniqueCustomers,
          repeatCount,
          repeatRate,
          avgLtv: ltv,
          totalRevenue,
        },
        topCustomers: topCustomersList,
      },
    });
  } catch (err) {
    logger.error('Sales pipeline analytics error:', err);
    res.status(500).json({ error: 'Failed to generate sales analytics' });
  }
}

module.exports = {
  getPipelineAnalytics,
};
