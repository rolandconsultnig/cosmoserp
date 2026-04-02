const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const ap = require('../controllers/ap.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/profit-loss', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
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
    const [revenue, cogs, expenses] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId: req.tenantId, status: { in: ['PAID','PARTIAL'] }, issueDate: { gte: fromDate, lte: toDate } }, _sum: { subtotal: true, vatAmount: true, totalAmount: true } }),
      prisma.purchaseOrder.aggregate({ where: { tenantId: req.tenantId, status: 'RECEIVED', issueDate: { gte: fromDate, lte: toDate } }, _sum: { subtotal: true } }),
      prisma.payrollRun.aggregate({ where: { tenantId: req.tenantId, status: { in: ['APPROVED','PAID'] }, createdAt: { gte: fromDate, lte: toDate } }, _sum: { totalGross: true } }),
    ]);
    const totalRevenue = parseFloat(revenue._sum.subtotal || 0);
    const totalCOGS = parseFloat(cogs._sum.subtotal || 0);
    const totalPayroll = parseFloat(expenses._sum.totalGross || 0);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalPayroll;
    res.json({
      data: {
        period: { from: fromDate, to: toDate },
        revenue: {
          total: totalRevenue,
          breakdown: [{ name: 'Recognized revenue (paid & partial invoices)', amount: totalRevenue }],
        },
        costOfSales: {
          total: totalCOGS,
          breakdown: [{ name: 'Cost of received purchase orders', amount: totalCOGS }],
        },
        expenses: {
          total: totalPayroll,
          breakdown: [{ name: 'Payroll (approved & paid runs)', amount: totalPayroll }],
        },
        grossProfit,
        netProfit,
        grossMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
      },
    });
  } catch (e) { res.status(500).json({ error: 'Failed to generate P&L report' }); }
});

router.get('/balance-sheet', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({ where: { tenantId: req.tenantId, isActive: true }, orderBy: [{ type: 'asc' }, { code: 'asc' }] });
    const grouped = accounts.reduce((acc, a) => { acc[a.type] = acc[a.type] || []; acc[a.type].push(a); return acc; }, {});
    const toBreakdown = (list) => (list || []).map((a) => {
      const bal = parseFloat(a.balance);
      return { name: `${a.code} — ${a.name}`, amount: bal, balance: bal };
    });
    const assetsList = grouped.ASSET || [];
    const liabilitiesList = grouped.LIABILITY || [];
    const equityList = grouped.EQUITY || [];
    const totalAssets = assetsList.reduce((s, a) => s + parseFloat(a.balance), 0);
    const totalLiabilities = liabilitiesList.reduce((s, a) => s + parseFloat(a.balance), 0);
    const totalEquity = equityList.reduce((s, a) => s + parseFloat(a.balance), 0);
    res.json({
      data: {
        assets: { total: totalAssets, breakdown: toBreakdown(assetsList) },
        liabilities: { total: totalLiabilities, breakdown: toBreakdown(liabilitiesList) },
        equity: { total: totalEquity, breakdown: toBreakdown(equityList) },
        totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity },
      },
    });
  } catch (e) { res.status(500).json({ error: 'Failed to generate balance sheet' }); }
});

router.get('/aged-receivables', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const now = new Date();
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: req.tenantId, status: { in: ['SENT','PARTIAL','OVERDUE'] }, amountDue: { gt: 0 } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };
    for (const inv of invoices) {
      const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / 86400000);
      if (daysOverdue <= 0) buckets.current.push(inv);
      else if (daysOverdue <= 30) buckets.days1_30.push(inv);
      else if (daysOverdue <= 60) buckets.days31_60.push(inv);
      else if (daysOverdue <= 90) buckets.days61_90.push(inv);
      else buckets.over90.push(inv);
    }
    const summary = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, { count: v.length, total: v.reduce((s, i) => s + parseFloat(i.amountDue), 0), invoices: v }]));
    res.json({
      data: {
        current: summary.current.total,
        days1_30: summary.days1_30.total,
        days31_60: summary.days31_60.total,
        days61_90: summary.days61_90.total,
        over90: summary.over90.total,
        invoices,
        buckets: summary,
      },
    });
  } catch (e) { res.status(500).json({ error: 'Failed to generate aged receivables' }); }
});

router.get('/inventory-valuation', requireRole('OWNER','ADMIN','ACCOUNTANT','WAREHOUSE'), async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      include: { stockLevels: { include: { warehouse: { select: { name: true } } } } },
    });
    const report = products.map((p) => {
      const totalQty = p.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
      const reorderPoint = p.reorderPoint ?? 0;
      const lowStock = totalQty <= reorderPoint;
      const outOfStock = totalQty <= 0;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        landedCost: p.landedCost,
        reorderPoint,
        reorderQty: p.reorderQty ?? 50,
        totalQty,
        lowStock,
        outOfStock,
        costValue: parseFloat(p.costPrice) * totalQty,
        landedValue: (parseFloat(p.costPrice) + parseFloat(p.landedCost || 0)) * totalQty,
        sellingValue: parseFloat(p.sellingPrice) * totalQty,
        warehouses: p.stockLevels,
      };
    });
    const totals = { costValue: report.reduce((s, p) => s + p.costValue, 0), sellingValue: report.reduce((s, p) => s + p.sellingValue, 0), landedValue: report.reduce((s, p) => s + p.landedValue, 0) };
    const responseProducts = report.map((p) => ({
      ...p,
      totalQuantity: p.totalQty,
      retailValue: p.sellingValue,
      unit: p.unit || '',
    }));
    res.json({
      data: {
        products: responseProducts,
        totals,
        totalCostValue: totals.costValue,
        totalRetailValue: totals.sellingValue,
      },
    });
  } catch (e) { res.status(500).json({ error: 'Failed to generate inventory valuation' }); }
});

router.get('/aged-payables', requireRole('OWNER','ADMIN','ACCOUNTANT'), ap.getAgedPayables);

module.exports = router;
