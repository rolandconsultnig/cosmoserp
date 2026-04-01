const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const ap = require('../controllers/ap.controller');
const budgets = require('../controllers/budgets.controller');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function plAmountForType(accountType, debit, credit) {
  const dr = parseFloat(debit || 0);
  const cr = parseFloat(credit || 0);
  if (accountType === 'REVENUE') return cr - dr;
  if (accountType === 'EXPENSE') return dr - cr;
  return 0;
}

function bsSignedBalance(accountType, debit, credit) {
  const dr = parseFloat(debit || 0);
  const cr = parseFloat(credit || 0);
  if (accountType === 'ASSET' || accountType === 'EXPENSE') return dr - cr;
  return cr - dr;
}

function isCogsExpense(account) {
  if (account.type !== 'EXPENSE') return false;
  const st = (account.subType || '').toUpperCase();
  if (['COGS', 'COS', 'COST_OF_SALES', 'COST_OF_GOODS'].includes(st)) return true;
  if (st.includes('COGS') || st.includes('COST_OF')) return true;
  const n = (account.name || '').toLowerCase();
  return n.includes('cost of goods') || n.includes('cost of sales');
}

function isCashLikeAccount(account) {
  if (account.type !== 'ASSET') return false;
  const st = (account.subType || '').toUpperCase();
  if (['CASH', 'BANK', 'PETTY_CASH', 'BANK_ACCOUNT'].includes(st)) return true;
  const n = `${account.name || ''} ${account.code || ''}`.toLowerCase();
  return n.includes('cash') || n.includes('bank') || n.includes('petty');
}

async function aggregatePostedJournalLines(tenantId, fromDate, toDate) {
  const entries = await prisma.journalEntry.findMany({
    where: {
      tenantId,
      status: 'POSTED',
      date: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
    },
    include: { lines: { include: { account: true } } },
  });
  const byAccount = {};
  for (const e of entries) {
    for (const l of e.lines) {
      const id = l.accountId;
      if (!byAccount[id]) {
        byAccount[id] = { account: l.account, debit: 0, credit: 0 };
      }
      byAccount[id].debit += parseFloat(l.debit || 0);
      byAccount[id].credit += parseFloat(l.credit || 0);
    }
  }
  return byAccount;
}

async function cumulativePostedJournalTotals(tenantId, asOfDate) {
  const entries = await prisma.journalEntry.findMany({
    where: {
      tenantId,
      status: 'POSTED',
      date: { lte: endOfDay(asOfDate) },
    },
    include: { lines: { include: { account: true } } },
  });
  const byAccount = {};
  for (const e of entries) {
    for (const l of e.lines) {
      const id = l.accountId;
      if (!byAccount[id]) {
        byAccount[id] = { account: l.account, debit: 0, credit: 0 };
      }
      byAccount[id].debit += parseFloat(l.debit || 0);
      byAccount[id].credit += parseFloat(l.credit || 0);
    }
  }
  return byAccount;
}

router.get('/profit-loss', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { from, to, basis } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'from must be on or before to' });
    }

    const useOperational = basis === 'operational';

    if (useOperational) {
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
      return res.json({
        data: {
          basis: 'operational',
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
    }

    const byAccount = await aggregatePostedJournalLines(req.tenantId, fromDate, toDate);
    const revenueBreakdown = [];
    const cogsBreakdown = [];
    const opexBreakdown = [];
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOpex = 0;

    for (const { account, debit, credit } of Object.values(byAccount)) {
      if (!account || !account.isActive) continue;
      const amt = plAmountForType(account.type, debit, credit);
      if (Math.abs(amt) < 0.0005) continue;
      const line = { name: `${account.code} — ${account.name}`, amount: amt, accountId: account.id };
      if (account.type === 'REVENUE') {
        revenueBreakdown.push(line);
        totalRevenue += amt;
      } else if (account.type === 'EXPENSE') {
        if (isCogsExpense(account)) {
          cogsBreakdown.push(line);
          totalCOGS += amt;
        } else {
          opexBreakdown.push(line);
          totalOpex += amt;
        }
      }
    }

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalOpex;
    revenueBreakdown.sort((a, b) => a.name.localeCompare(b.name));
    cogsBreakdown.sort((a, b) => a.name.localeCompare(b.name));
    opexBreakdown.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      data: {
        basis: 'gl',
        period: { from: fromDate, to: toDate },
        revenue: {
          total: totalRevenue,
          breakdown: revenueBreakdown.length ? revenueBreakdown : [{ name: 'No posted revenue in period', amount: 0 }],
        },
        costOfSales: {
          total: totalCOGS,
          breakdown: cogsBreakdown.length ? cogsBreakdown : [{ name: 'No COGS-tagged expense accounts (subType/name) or no activity', amount: 0 }],
        },
        expenses: {
          total: totalOpex,
          breakdown: opexBreakdown.length ? opexBreakdown : [{ name: 'No operating expense activity in period', amount: 0 }],
        },
        grossProfit,
        netProfit,
        grossMargin: totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate P&L report' });
  }
});

router.get('/balance-sheet', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { asOf, basis } = req.query;
    const useStored = basis === 'stored';

    if (useStored) {
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
      return res.json({
        data: {
          basis: 'stored',
          asOf: new Date(),
          assets: { total: totalAssets, breakdown: toBreakdown(assetsList) },
          liabilities: { total: totalLiabilities, breakdown: toBreakdown(liabilitiesList) },
          equity: { total: totalEquity, breakdown: toBreakdown(equityList) },
          totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity },
        },
      });
    }

    const asOfDate = asOf ? new Date(asOf) : new Date();
    if (Number.isNaN(asOfDate.getTime())) {
      return res.status(400).json({ error: 'Invalid asOf date' });
    }

    const byAccount = await cumulativePostedJournalTotals(req.tenantId, asOfDate);
    const assets = [];
    const liabilities = [];
    const equity = [];
    for (const { account, debit, credit } of Object.values(byAccount)) {
      if (!account || !account.isActive) continue;
      const t = account.type;
      if (t !== 'ASSET' && t !== 'LIABILITY' && t !== 'EQUITY') continue;
      const bal = bsSignedBalance(t, debit, credit);
      if (Math.abs(bal) < 0.0005) continue;
      const row = { name: `${account.code} — ${account.name}`, amount: bal, balance: bal, accountId: account.id };
      if (t === 'ASSET') assets.push(row);
      else if (t === 'LIABILITY') liabilities.push(row);
      else equity.push(row);
    }
    assets.sort((a, b) => a.name.localeCompare(b.name));
    liabilities.sort((a, b) => a.name.localeCompare(b.name));
    equity.sort((a, b) => a.name.localeCompare(b.name));
    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equity.reduce((s, r) => s + r.amount, 0);
    const le = totalLiabilities + totalEquity;
    res.json({
      data: {
        basis: 'gl',
        asOf: asOfDate,
        assets: { total: totalAssets, breakdown: assets.length ? assets : [{ name: 'No posted GL balance sheet accounts', amount: 0, balance: 0 }] },
        liabilities: { total: totalLiabilities, breakdown: liabilities.length ? liabilities : [{ name: '—', amount: 0, balance: 0 }] },
        equity: { total: totalEquity, breakdown: equity.length ? equity : [{ name: '—', amount: 0, balance: 0 }] },
        totals: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity },
        check: Math.abs(totalAssets - le) < 0.02 ? 'balanced' : 'unbalanced',
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

router.get('/cash-flow', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
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

    const dayBeforeFrom = new Date(fromDate);
    dayBeforeFrom.setDate(dayBeforeFrom.getDate() - 1);
    const beforeFrom = await cumulativePostedJournalTotals(req.tenantId, dayBeforeFrom);
    const inPeriod = await aggregatePostedJournalLines(req.tenantId, fromDate, toDate);

    const allAccounts = await prisma.account.findMany({
      where: { tenantId: req.tenantId, isActive: true, type: 'ASSET' },
      orderBy: [{ code: 'asc' }],
    });
    const cashAccounts = allAccounts.filter(isCashLikeAccount);

    const cashAccountsOut = [];
    let totalNet = 0;
    for (const account of cashAccounts) {
      const before = beforeFrom[account.id];
      const period = inPeriod[account.id];
      const dr0 = before ? before.debit : 0;
      const cr0 = before ? before.credit : 0;
      const dr1 = period ? period.debit : 0;
      const cr1 = period ? period.credit : 0;
      const opening = bsSignedBalance('ASSET', dr0, cr0);
      const periodChange = bsSignedBalance('ASSET', dr1, cr1);
      const closing = opening + periodChange;
      if (Math.abs(opening) < 0.0005 && Math.abs(periodChange) < 0.0005) continue;
      cashAccountsOut.push({
        code: account.code,
        name: account.name,
        openingBalance: opening,
        periodNetChange: periodChange,
        closingBalance: closing,
      });
      totalNet += periodChange;
    }

    res.json({
      data: {
        period: { from: fromDate, to: toDate },
        method: 'direct',
        note: 'Net change on cash/bank accounts (subType CASH/BANK or name/code hints). Tag accounts for clearer classification.',
        cashAccounts: cashAccountsOut,
        totalNetCashChange: totalNet,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate cash flow report' });
  }
});

/** VAT summary for a period: sales output vs purchase input (vendor bills + received PO reference). */
router.get('/vat-schedule', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }
    if (fromDate > toDate) return res.status(400).json({ error: 'from must be on or before to' });

    const invWhere = {
      tenantId: req.tenantId,
      status: { not: 'CANCELLED' },
      issueDate: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
    };
    const billWhere = {
      tenantId: req.tenantId,
      status: { in: ['POSTED', 'PARTIAL', 'PAID'] },
      billDate: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
    };
    const poWhere = {
      tenantId: req.tenantId,
      status: 'RECEIVED',
      issueDate: { gte: startOfDay(fromDate), lte: endOfDay(toDate) },
    };

    const [
      invAgg,
      invCount,
      invSample,
      billAgg,
      billCount,
      billSample,
      poAgg,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: invWhere, _sum: { vatAmount: true, subtotal: true } }),
      prisma.invoice.count({ where: invWhere }),
      prisma.invoice.findMany({
        where: invWhere,
        take: 150,
        orderBy: { issueDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          status: true,
          vatAmount: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.vendorBill.aggregate({ where: billWhere, _sum: { vatAmount: true } }),
      prisma.vendorBill.count({ where: billWhere }),
      prisma.vendorBill.findMany({
        where: billWhere,
        take: 150,
        orderBy: { billDate: 'desc' },
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          status: true,
          vatAmount: true,
          supplier: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.aggregate({ where: poWhere, _sum: { vatAmount: true } }),
    ]);

    const outputVAT = parseFloat(invAgg._sum.vatAmount || 0);
    const inputFromVendorBills = parseFloat(billAgg._sum.vatAmount || 0);
    const inputFromReceivedPOs = parseFloat(poAgg._sum.vatAmount || 0);
    const netPayablePrimary = outputVAT - inputFromVendorBills;

    res.json({
      data: {
        period: { from: fromDate, to: toDate },
        output: {
          vat: outputVAT,
          taxableBase: parseFloat(invAgg._sum.subtotal || 0),
          documentCount: invCount,
          documents: invSample,
        },
        input: {
          fromVendorBills: inputFromVendorBills,
          fromReceivedPurchaseOrders: inputFromReceivedPOs,
          billCount,
          vendorBills: billSample,
          note: 'Prefer vendor bills for input VAT when bills are posted. Received PO VAT is shown for reference and may overlap billed lines.',
        },
        netVatPayable: Math.max(0, netPayablePrimary),
        netVatBeforeCaps: netPayablePrimary,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate VAT schedule' });
  }
});

/** Same payload as GET /budgets/:id/variance; budgetId is required. */
router.get('/budget-vs-actual', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), (req, res) => {
  const budgetId = req.query.budgetId;
  if (!budgetId) return res.status(400).json({ error: 'budgetId is required' });
  req.params.id = budgetId;
  return budgets.getBudgetVariance(req, res);
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
