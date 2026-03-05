const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');

router.use(authenticate);

router.get('/profit-loss', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
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
    res.json({ data: { period: { from: fromDate, to: toDate }, revenue: totalRevenue, cogs: totalCOGS, grossProfit, payroll: totalPayroll, netProfit, grossMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0 } });
  } catch (e) { res.status(500).json({ error: 'Failed to generate P&L report' }); }
});

router.get('/balance-sheet', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({ where: { tenantId: req.tenantId, isActive: true }, orderBy: [{ type: 'asc' }, { code: 'asc' }] });
    const grouped = accounts.reduce((acc, a) => { acc[a.type] = acc[a.type] || []; acc[a.type].push(a); return acc; }, {});
    const totalAssets = (grouped['ASSET'] || []).reduce((s, a) => s + parseFloat(a.balance), 0);
    const totalLiabilities = (grouped['LIABILITY'] || []).reduce((s, a) => s + parseFloat(a.balance), 0);
    const totalEquity = (grouped['EQUITY'] || []).reduce((s, a) => s + parseFloat(a.balance), 0);
    res.json({ data: { assets: grouped['ASSET'] || [], liabilities: grouped['LIABILITY'] || [], equity: grouped['EQUITY'] || [], totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity } } });
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
    res.json({ data: summary });
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
      return { id: p.id, sku: p.sku, name: p.name, costPrice: p.costPrice, sellingPrice: p.sellingPrice, landedCost: p.landedCost, totalQty, costValue: parseFloat(p.costPrice) * totalQty, landedValue: (parseFloat(p.costPrice) + parseFloat(p.landedCost)) * totalQty, sellingValue: parseFloat(p.sellingPrice) * totalQty, warehouses: p.stockLevels };
    });
    const totals = { costValue: report.reduce((s, p) => s + p.costValue, 0), sellingValue: report.reduce((s, p) => s + p.sellingValue, 0), landedValue: report.reduce((s, p) => s + p.landedValue, 0) };
    res.json({ data: { products: report, totals } });
  } catch (e) { res.status(500).json({ error: 'Failed to generate inventory valuation' }); }
});

module.exports = router;
