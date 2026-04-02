const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse, roundDecimal } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

function monthBounds(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

const BUDGET_LINE_CATEGORIES = ['OPEX', 'CAPEX', 'HEADCOUNT', 'SALARY', 'PROJECT'];

function normalizeCategory(raw) {
  const c = String(raw || 'OPEX').toUpperCase();
  return BUDGET_LINE_CATEGORIES.includes(c) ? c : 'OPEX';
}

function normalizeText(raw) {
  return raw ? String(raw).trim() : '';
}

exports.listBudgets = async (req, res) => {
  try {
    const { page = 1, limit = 20, fiscalYear, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear, 10);
    if (status) where.status = String(status).toUpperCase();

    const [data, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        take,
        skip,
        orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
        include: { _count: { select: { lines: true } } },
      }),
      prisma.budget.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    logger.error('listBudgets', err);
    res.status(500).json({ error: err.message || 'Failed to list budgets' });
  }
};

exports.getBudget = async (req, res) => {
  try {
    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
          orderBy: [{ account: { code: 'asc' } }, { month: 'asc' }],
        },
      },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json({ data: budget });
  } catch (err) {
    logger.error('getBudget', err);
    res.status(500).json({ error: err.message || 'Failed to fetch budget' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { name, fiscalYear, startDate, endDate, notes } = req.body;
    if (!name || !fiscalYear || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, fiscalYear, startDate, endDate are required' });
    }

    const fy = parseInt(fiscalYear, 10);
    if (Number.isNaN(fy) || fy < 2000 || fy > 3000) return res.status(422).json({ error: 'Invalid fiscalYear' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(422).json({ error: 'Invalid startDate/endDate range' });
    }

    const created = await prisma.budget.create({
      data: {
        tenantId: req.tenantId,
        name: String(name).trim(),
        fiscalYear: fy,
        startDate: start,
        endDate: end,
        notes: notes ? String(notes).trim() : null,
        createdById: req.user?.id,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE',
      resource: 'Budget',
      resourceId: created.id,
      newValues: { name: created.name, fiscalYear: created.fiscalYear },
      req,
    });

    res.status(201).json({ data: created });
  } catch (err) {
    logger.error('createBudget', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Budget name already exists for this fiscal year' });
    res.status(500).json({ error: err.message || 'Failed to create budget' });
  }
};

exports.updateBudgetStatus = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const status = String(req.body?.status || '').toUpperCase();
    if (!['DRAFT', 'APPROVED', 'LOCKED'].includes(status)) {
      return res.status(400).json({ error: 'status must be DRAFT, APPROVED or LOCKED' });
    }

    const existing = await prisma.budget.findFirst({ where: { id: budgetId, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    const updated = await prisma.budget.update({
      where: { id: budgetId },
      data: { status },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'STATUS_CHANGE',
      resource: 'Budget',
      resourceId: budgetId,
      newValues: { from: existing.status, to: status },
      req,
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('updateBudgetStatus', err);
    res.status(500).json({ error: err.message || 'Failed to update budget status' });
  }
};

exports.upsertBudgetLines = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    if (!lines.length) return res.status(400).json({ error: 'lines array is required' });

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId: req.tenantId } });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    if (budget.status === 'LOCKED') return res.status(409).json({ error: 'Locked budget cannot be edited' });

    const accountIds = [...new Set(lines.map((l) => l.accountId).filter(Boolean))];
    const validAccounts = await prisma.account.findMany({
      where: { tenantId: req.tenantId, id: { in: accountIds }, isActive: true, type: { in: ['REVENUE', 'EXPENSE'] } },
      select: { id: true },
    });
    if (validAccounts.length !== accountIds.length) {
      return res.status(422).json({ error: 'All lines must reference active REVENUE/EXPENSE accounts' });
    }

    const upserts = [];
    for (const line of lines) {
      const month = parseInt(line.month, 10);
      const amount = roundDecimal(parseFloat(line.amount || 0));
      const category = normalizeCategory(line.category);
      const costCenter = normalizeText(line.costCenter);
      const projectCode = normalizeText(line.projectCode);
      const allocationMode = normalizeText(line.allocationMode) || null;
      const headcount = line.headcount === undefined || line.headcount === null || line.headcount === ''
        ? null
        : Math.max(0, parseInt(line.headcount, 10) || 0);
      if (Number.isNaN(month) || month < 1 || month > 12) {
        return res.status(422).json({ error: 'month must be between 1 and 12' });
      }
      if (amount < 0) return res.status(422).json({ error: 'amount cannot be negative' });

      upserts.push(
        prisma.budgetLine.upsert({
          where: {
            budgetId_accountId_month_category_costCenter_projectCode: {
              budgetId,
              accountId: line.accountId,
              month,
              category,
              costCenter,
              projectCode,
            },
          },
          create: {
            tenantId: req.tenantId,
            budgetId,
            accountId: line.accountId,
            month,
            amount,
            category,
            costCenter,
            projectCode,
            headcount,
            allocationMode,
            notes: line.notes ? String(line.notes).trim() : null,
          },
          update: {
            amount,
            category,
            costCenter,
            projectCode,
            headcount,
            allocationMode,
            notes: line.notes ? String(line.notes).trim() : null,
          },
        }),
      );
    }

    const saved = await prisma.$transaction(upserts);

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'UPSERT_LINES',
      resource: 'Budget',
      resourceId: budgetId,
      newValues: { count: saved.length },
      req,
    });

    res.json({ data: saved, message: 'Budget lines saved' });
  } catch (err) {
    logger.error('upsertBudgetLines', err);
    res.status(500).json({ error: err.message || 'Failed to save budget lines' });
  }
};

exports.allocateBudget = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const {
      accountId,
      totalAmount,
      mode = 'EVEN',
      startMonth = 1,
      endMonth = 12,
      seasonalWeights = [],
      category,
      costCenter,
      projectCode,
      headcount,
      notes,
    } = req.body || {};

    if (!accountId) return res.status(400).json({ error: 'accountId is required' });
    const total = roundDecimal(parseFloat(totalAmount || 0));
    if (total <= 0) return res.status(422).json({ error: 'totalAmount must be greater than 0' });

    const start = Math.max(1, parseInt(startMonth, 10) || 1);
    const end = Math.min(12, parseInt(endMonth, 10) || 12);
    if (start > end) return res.status(422).json({ error: 'startMonth must be <= endMonth' });

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId: req.tenantId } });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    if (budget.status === 'LOCKED') return res.status(409).json({ error: 'Locked budget cannot be edited' });

    const account = await prisma.account.findFirst({
      where: { id: accountId, tenantId: req.tenantId, isActive: true, type: { in: ['REVENUE', 'EXPENSE'] } },
      select: { id: true },
    });
    if (!account) return res.status(422).json({ error: 'Invalid accountId for budget allocation' });

    const months = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const normalizedMode = String(mode || 'EVEN').toUpperCase() === 'SEASONAL' ? 'SEASONAL' : 'EVEN';

    let amountsByMonth = [];
    if (normalizedMode === 'SEASONAL') {
      const weights = Array.isArray(seasonalWeights) ? seasonalWeights : [];
      const scopedWeights = months.map((m, idx) => {
        const w = parseFloat(weights[idx] ?? 1);
        return Number.isFinite(w) && w > 0 ? w : 1;
      });
      const sumWeights = scopedWeights.reduce((s, w) => s + w, 0) || 1;
      amountsByMonth = months.map((m, idx) => ({ month: m, amount: roundDecimal((total * scopedWeights[idx]) / sumWeights) }));
    } else {
      const perMonth = roundDecimal(total / months.length);
      amountsByMonth = months.map((m) => ({ month: m, amount: perMonth }));
    }

    const adj = roundDecimal(total - amountsByMonth.reduce((s, x) => s + x.amount, 0));
    if (amountsByMonth.length) {
      amountsByMonth[amountsByMonth.length - 1].amount = roundDecimal(amountsByMonth[amountsByMonth.length - 1].amount + adj);
    }

    const normalizedCategory = normalizeCategory(category);
    const normalizedCostCenter = normalizeText(costCenter);
    const normalizedProjectCode = normalizeText(projectCode);
    const normalizedHeadcount = headcount === undefined || headcount === null || headcount === ''
      ? null
      : Math.max(0, parseInt(headcount, 10) || 0);

    const upserts = amountsByMonth.map((row) => prisma.budgetLine.upsert({
      where: {
        budgetId_accountId_month_category_costCenter_projectCode: {
          budgetId,
          accountId,
          month: row.month,
          category: normalizedCategory,
          costCenter: normalizedCostCenter,
          projectCode: normalizedProjectCode,
        },
      },
      create: {
        tenantId: req.tenantId,
        budgetId,
        accountId,
        month: row.month,
        amount: row.amount,
        category: normalizedCategory,
        costCenter: normalizedCostCenter,
        projectCode: normalizedProjectCode,
        headcount: normalizedHeadcount,
        allocationMode: normalizedMode,
        notes: notes ? String(notes).trim() : null,
      },
      update: {
        amount: row.amount,
        category: normalizedCategory,
        costCenter: normalizedCostCenter,
        projectCode: normalizedProjectCode,
        headcount: normalizedHeadcount,
        allocationMode: normalizedMode,
        notes: notes ? String(notes).trim() : null,
      },
    }));

    const saved = await prisma.$transaction(upserts);
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'ALLOCATE_LINES',
      resource: 'Budget',
      resourceId: budgetId,
      newValues: { accountId, mode: normalizedMode, startMonth: start, endMonth: end, total },
      req,
    });

    res.json({ data: saved, message: 'Budget allocation saved' });
  } catch (err) {
    logger.error('allocateBudget', err);
    res.status(500).json({ error: err.message || 'Failed to allocate budget' });
  }
};

exports.reallocateBudget = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const { sourceLineId, targetLineId, amount } = req.body || {};
    const moveAmount = roundDecimal(parseFloat(amount || 0));
    if (!sourceLineId || !targetLineId) return res.status(400).json({ error: 'sourceLineId and targetLineId are required' });
    if (sourceLineId === targetLineId) return res.status(422).json({ error: 'source and target lines must differ' });
    if (moveAmount <= 0) return res.status(422).json({ error: 'amount must be greater than 0' });

    const budget = await prisma.budget.findFirst({ where: { id: budgetId, tenantId: req.tenantId } });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    if (budget.status === 'LOCKED') return res.status(409).json({ error: 'Locked budget cannot be edited' });

    const [source, target] = await Promise.all([
      prisma.budgetLine.findFirst({ where: { id: sourceLineId, budgetId, tenantId: req.tenantId } }),
      prisma.budgetLine.findFirst({ where: { id: targetLineId, budgetId, tenantId: req.tenantId } }),
    ]);
    if (!source || !target) return res.status(404).json({ error: 'Source/target line not found in this budget' });
    const sourceAmount = roundDecimal(parseFloat(source.amount || 0));
    if (sourceAmount < moveAmount) return res.status(422).json({ error: 'Reallocation amount exceeds source budget line' });

    const [updatedSource, updatedTarget] = await prisma.$transaction([
      prisma.budgetLine.update({ where: { id: source.id }, data: { amount: roundDecimal(sourceAmount - moveAmount) } }),
      prisma.budgetLine.update({ where: { id: target.id }, data: { amount: roundDecimal(parseFloat(target.amount || 0) + moveAmount) } }),
    ]);

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'REALLOCATE_LINES',
      resource: 'Budget',
      resourceId: budgetId,
      newValues: { sourceLineId, targetLineId, amount: moveAmount },
      req,
    });

    res.json({ data: { source: updatedSource, target: updatedTarget }, message: 'Budget re-allocation completed' });
  } catch (err) {
    logger.error('reallocateBudget', err);
    res.status(500).json({ error: err.message || 'Failed to re-allocate budget' });
  }
};

exports.getBudgetVariance = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, tenantId: req.tenantId },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const lines = budget.lines || [];
    if (!lines.length) {
      return res.json({ data: { budget, rows: [], totals: { budgeted: 0, actual: 0, variance: 0 } } });
    }

    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'POSTED',
        date: { gte: budget.startDate, lte: budget.endDate },
      },
      include: { lines: true },
    });

    const actualByAccountMonth = {};
    for (const je of journalEntries) {
      const month = new Date(je.date).getMonth() + 1;
      for (const jl of je.lines) {
        const key = `${jl.accountId}-${month}`;
        if (!actualByAccountMonth[key]) actualByAccountMonth[key] = { debit: 0, credit: 0 };
        actualByAccountMonth[key].debit += parseFloat(jl.debit || 0);
        actualByAccountMonth[key].credit += parseFloat(jl.credit || 0);
      }
    }

    const rows = lines.map((l) => {
      const key = `${l.accountId}-${l.month}`;
      const actualRaw = actualByAccountMonth[key] || { debit: 0, credit: 0 };
      const actual = l.account.type === 'EXPENSE'
        ? roundDecimal(actualRaw.debit - actualRaw.credit)
        : roundDecimal(actualRaw.credit - actualRaw.debit);
      const budgeted = roundDecimal(parseFloat(l.amount || 0));
      const variance = roundDecimal(actual - budgeted);
      const variancePct = budgeted === 0 ? 0 : roundDecimal((variance / budgeted) * 100);
      const utilizationPct = budgeted <= 0 ? 0 : roundDecimal((actual / budgeted) * 100);
      const alertLevel = utilizationPct >= 100 ? 'EXCEEDED' : utilizationPct >= 90 ? 'NEAR_LIMIT' : 'OK';
      return {
        id: l.id,
        month: l.month,
        account: l.account,
        category: l.category,
        costCenter: l.costCenter,
        projectCode: l.projectCode,
        headcount: l.headcount,
        allocationMode: l.allocationMode,
        budgeted,
        actual,
        variance,
        variancePct,
        utilizationPct,
        alertLevel,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.budgeted += r.budgeted;
        acc.actual += r.actual;
        acc.variance += r.variance;
        return acc;
      },
      { budgeted: 0, actual: 0, variance: 0 },
    );

    const alertSummary = rows.reduce((acc, r) => {
      if (r.alertLevel === 'EXCEEDED') acc.exceeded += 1;
      if (r.alertLevel === 'NEAR_LIMIT') acc.nearLimit += 1;
      return acc;
    }, { exceeded: 0, nearLimit: 0 });

    res.json({ data: { budget, rows, totals, alertSummary } });
  } catch (err) {
    logger.error('getBudgetVariance', err);
    res.status(500).json({ error: err.message || 'Failed to calculate budget variance' });
  }
};

exports.getBudgetControlSummary = async (req, res) => {
  try {
    const budgetId = req.params.id;
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, tenantId: req.tenantId },
      include: {
        lines: {
          include: { account: { select: { id: true, code: true, name: true, type: true } } },
        },
      },
    });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });

    const lines = budget.lines || [];

    const [journalEntries, openPOs] = await Promise.all([
      prisma.journalEntry.findMany({
        where: {
          tenantId: req.tenantId,
          status: 'POSTED',
          date: { gte: budget.startDate, lte: budget.endDate },
        },
        include: { lines: true },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          tenantId: req.tenantId,
          status: { in: ['SENT', 'PARTIAL'] },
        },
        include: { lines: true },
      }),
    ]);

    const actualByAccountMonth = {};
    for (const je of journalEntries) {
      const month = new Date(je.date).getMonth() + 1;
      for (const jl of je.lines) {
        const key = `${jl.accountId}-${month}`;
        if (!actualByAccountMonth[key]) actualByAccountMonth[key] = { debit: 0, credit: 0 };
        actualByAccountMonth[key].debit += parseFloat(jl.debit || 0);
        actualByAccountMonth[key].credit += parseFloat(jl.credit || 0);
      }
    }

    const rows = lines.map((l) => {
      const key = `${l.accountId}-${l.month}`;
      const actualRaw = actualByAccountMonth[key] || { debit: 0, credit: 0 };
      const actual = l.account.type === 'EXPENSE'
        ? roundDecimal(actualRaw.debit - actualRaw.credit)
        : roundDecimal(actualRaw.credit - actualRaw.debit);
      const budgeted = roundDecimal(parseFloat(l.amount || 0));
      const utilizationPct = budgeted <= 0 ? 0 : roundDecimal((actual / budgeted) * 100);
      const variance = roundDecimal(actual - budgeted);
      const alertLevel = utilizationPct >= 100 ? 'EXCEEDED' : utilizationPct >= 90 ? 'NEAR_LIMIT' : 'OK';
      return {
        id: l.id,
        account: l.account,
        month: l.month,
        category: l.category,
        costCenter: l.costCenter,
        projectCode: l.projectCode,
        budgeted,
        actual,
        variance,
        utilizationPct,
        alertLevel,
      };
    });

    const categoryTotals = rows.reduce((acc, r) => {
      const key = r.category || 'OPEX';
      if (!acc[key]) acc[key] = { budgeted: 0, actual: 0, variance: 0, utilizationPct: 0 };
      acc[key].budgeted += r.budgeted;
      acc[key].actual += r.actual;
      acc[key].variance += r.variance;
      return acc;
    }, {});

    Object.keys(categoryTotals).forEach((key) => {
      const row = categoryTotals[key];
      row.budgeted = roundDecimal(row.budgeted);
      row.actual = roundDecimal(row.actual);
      row.variance = roundDecimal(row.variance);
      row.utilizationPct = row.budgeted <= 0 ? 0 : roundDecimal((row.actual / row.budgeted) * 100);
    });

    const committedCosts = openPOs.reduce((sum, po) => {
      const lineCommitted = (po.lines || []).reduce((lineSum, line) => {
        const qty = parseFloat(line.quantity || 0);
        const received = parseFloat(line.receivedQty || 0);
        const unit = parseFloat(line.unitPrice || 0);
        const outstandingQty = Math.max(0, qty - received);
        return lineSum + (outstandingQty * unit);
      }, 0);
      return sum + lineCommitted;
    }, 0);

    const totals = rows.reduce((acc, r) => {
      acc.budgeted += r.budgeted;
      acc.actual += r.actual;
      acc.variance += r.variance;
      return acc;
    }, { budgeted: 0, actual: 0, variance: 0 });

    totals.budgeted = roundDecimal(totals.budgeted);
    totals.actual = roundDecimal(totals.actual);
    totals.variance = roundDecimal(totals.variance);
    const utilizationPct = totals.budgeted <= 0 ? 0 : roundDecimal((totals.actual / totals.budgeted) * 100);

    const alerts = rows.reduce((acc, r) => {
      if (r.alertLevel === 'EXCEEDED') acc.exceeded += 1;
      if (r.alertLevel === 'NEAR_LIMIT') acc.nearLimit += 1;
      return acc;
    }, { exceeded: 0, nearLimit: 0 });

    res.json({
      data: {
        budget: {
          id: budget.id,
          name: budget.name,
          fiscalYear: budget.fiscalYear,
          status: budget.status,
          isFrozen: budget.status === 'LOCKED',
          startDate: budget.startDate,
          endDate: budget.endDate,
        },
        totals: {
          ...totals,
          utilizationPct,
          committedCosts: roundDecimal(committedCosts),
          committedVsBudgetPct: totals.budgeted <= 0 ? 0 : roundDecimal((committedCosts / totals.budgeted) * 100),
        },
        alerts,
        categoryTotals,
      },
    });
  } catch (err) {
    logger.error('getBudgetControlSummary', err);
    res.status(500).json({ error: err.message || 'Failed to compute budget control summary' });
  }
};

module.exports = {
  listBudgets: exports.listBudgets,
  getBudget: exports.getBudget,
  createBudget: exports.createBudget,
  updateBudgetStatus: exports.updateBudgetStatus,
  upsertBudgetLines: exports.upsertBudgetLines,
  allocateBudget: exports.allocateBudget,
  reallocateBudget: exports.reallocateBudget,
  getBudgetVariance: exports.getBudgetVariance,
  getBudgetControlSummary: exports.getBudgetControlSummary,
};
