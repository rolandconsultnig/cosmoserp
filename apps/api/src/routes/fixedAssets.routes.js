const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfMonth(d) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function monthsBetweenInclusive(start, end) {
  const s = new Date(start.getFullYear(), start.getMonth(), 1);
  const e = new Date(end.getFullYear(), end.getMonth(), 1);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
}

function round2(n) {
  return Math.round((parseFloat(n || 0) + Number.EPSILON) * 100) / 100;
}

router.get('/', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const assets = await prisma.fixedAsset.findMany({
      where: { tenantId: req.tenantId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        assetAccount: { select: { id: true, code: true, name: true } },
        depreciationExpenseAccount: { select: { id: true, code: true, name: true } },
        accumulatedDepreciationAccount: { select: { id: true, code: true, name: true } },
        depreciations: { orderBy: { periodStart: 'asc' } },
      },
      take: 200,
    });
    res.json({ data: assets });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch fixed assets' });
  }
});

router.post('/', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const {
      assetCode,
      name,
      description,
      assetAccountId,
      depreciationExpenseAccountId,
      accumulatedDepreciationAccountId,
      cost,
      salvageValue,
      usefulLifeMonths,
      inServiceDate,
    } = req.body || {};

    if (!assetCode || !name) return res.status(400).json({ error: 'assetCode and name are required' });
    if (!assetAccountId || !depreciationExpenseAccountId || !accumulatedDepreciationAccountId) {
      return res.status(400).json({ error: 'assetAccountId, depreciationExpenseAccountId, accumulatedDepreciationAccountId are required' });
    }
    const c = parseFloat(cost);
    const s = salvageValue == null ? 0 : parseFloat(salvageValue);
    const life = parseInt(usefulLifeMonths, 10);
    const svc = inServiceDate ? new Date(inServiceDate) : null;
    if (!Number.isFinite(c) || c <= 0) return res.status(400).json({ error: 'cost must be > 0' });
    if (!Number.isFinite(s) || s < 0) return res.status(400).json({ error: 'salvageValue must be >= 0' });
    if (!Number.isFinite(life) || life <= 0) return res.status(400).json({ error: 'usefulLifeMonths must be > 0' });
    if (!svc || Number.isNaN(svc.getTime())) return res.status(400).json({ error: 'inServiceDate is required and must be valid' });
    if (s > c) return res.status(400).json({ error: 'salvageValue cannot exceed cost' });

    const accounts = await prisma.account.findMany({
      where: { tenantId: req.tenantId, isActive: true, id: { in: [assetAccountId, depreciationExpenseAccountId, accumulatedDepreciationAccountId] } },
      select: { id: true, type: true },
    });
    if (accounts.length !== 3) return res.status(400).json({ error: 'One or more accounts are invalid for this tenant' });

    const asset = await prisma.fixedAsset.create({
      data: {
        tenantId: req.tenantId,
        assetCode: String(assetCode).trim(),
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        assetAccountId,
        depreciationExpenseAccountId,
        accumulatedDepreciationAccountId,
        cost: round2(c),
        salvageValue: round2(s),
        usefulLifeMonths: life,
        inServiceDate: svc,
        createdById: req.user?.id || null,
      },
    });
    res.status(201).json({ data: asset });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Asset code already exists' });
    res.status(500).json({ error: 'Failed to create fixed asset' });
  }
});

router.post('/run-depreciation', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { asOf } = req.body || {};
    const asOfDate = asOf ? new Date(asOf) : new Date();
    if (Number.isNaN(asOfDate.getTime())) return res.status(400).json({ error: 'Invalid asOf' });

    const periodStart = startOfMonth(asOfDate);
    const periodEnd = endOfMonth(asOfDate);

    const activeAssets = await prisma.fixedAsset.findMany({
      where: { tenantId: req.tenantId, status: 'ACTIVE', inServiceDate: { lte: periodEnd } },
      include: {
        depreciationExpenseAccount: { select: { id: true } },
        accumulatedDepreciationAccount: { select: { id: true } },
      },
      take: 500,
    });

    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const a of activeAssets) {
        const already = await tx.fixedAssetDepreciation.findFirst({
          where: { tenantId: req.tenantId, fixedAssetId: a.id, periodStart },
          select: { id: true },
        });
        if (already) {
          results.push({ fixedAssetId: a.id, status: 'skipped', reason: 'already_posted_for_period' });
          continue;
        }

        // Straight-line: (cost - salvage) / usefulLifeMonths; stop after life months inclusive.
        const depreciableBase = round2(parseFloat(a.cost) - parseFloat(a.salvageValue || 0));
        if (depreciableBase <= 0) {
          results.push({ fixedAssetId: a.id, status: 'skipped', reason: 'no_depreciable_base' });
          continue;
        }

        const firstMonth = startOfMonth(a.inServiceDate);
        const monthsUsed = monthsBetweenInclusive(firstMonth, periodStart);
        if (monthsUsed > a.usefulLifeMonths) {
          results.push({ fixedAssetId: a.id, status: 'skipped', reason: 'fully_depreciated' });
          continue;
        }

        const monthly = round2(depreciableBase / a.usefulLifeMonths);
        if (monthly <= 0) {
          results.push({ fixedAssetId: a.id, status: 'skipped', reason: 'monthly_amount_zero' });
          continue;
        }

        const ref = `DEP-${a.assetCode}-${periodStart.toISOString().slice(0, 7)}`.slice(0, 120);
        const desc = `Depreciation: ${a.name} (${a.assetCode})`;

        const je = await tx.journalEntry.create({
          data: {
            tenantId: req.tenantId,
            reference: ref,
            description: desc,
            date: periodEnd,
            currency: 'NGN',
            status: 'POSTED',
            postedAt: new Date(),
            createdById: req.user?.id || null,
            sourceType: 'FIXED_ASSET_DEPRECIATION',
            sourceId: a.id,
            lines: {
              create: [
                { accountId: a.depreciationExpenseAccountId, description: 'Depreciation expense', debit: monthly, credit: 0 },
                { accountId: a.accumulatedDepreciationAccountId, description: 'Accumulated depreciation', debit: 0, credit: monthly },
              ],
            },
          },
        });

        // Update account balances (mirrors posting logic in account.routes.js).
        const expAcc = await tx.account.findFirst({ where: { id: a.depreciationExpenseAccountId, tenantId: req.tenantId, isActive: true } });
        const accDepAcc = await tx.account.findFirst({ where: { id: a.accumulatedDepreciationAccountId, tenantId: req.tenantId, isActive: true } });
        if (!expAcc || !accDepAcc) throw new Error('Depreciation accounts not found');

        // Expense (debit normal): +monthly
        await tx.account.updateMany({
          where: { id: expAcc.id, tenantId: req.tenantId },
          data: { balance: { increment: monthly } },
        });
        // Accumulated depreciation is usually a contra-asset (credit normal). In our COA it's an ASSET type but credit-normal is not supported.
        // We treat it as credit-normal by applying negative delta on ASSET, so balances look like contra (negative).
        await tx.account.updateMany({
          where: { id: accDepAcc.id, tenantId: req.tenantId },
          data: { balance: { increment: -monthly } },
        });

        const dep = await tx.fixedAssetDepreciation.create({
          data: {
            tenantId: req.tenantId,
            fixedAssetId: a.id,
            periodStart,
            periodEnd,
            amount: monthly,
            journalEntryId: je.id,
            postedById: req.user?.id || null,
          },
        });

        results.push({ fixedAssetId: a.id, status: 'posted', amount: monthly, depreciationId: dep.id, journalEntryId: je.id });
      }
    });

    res.json({ data: { periodStart, periodEnd, results } });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to run depreciation' });
  }
});

module.exports = router;

