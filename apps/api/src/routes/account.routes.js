const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse, roundDecimal } = require('../utils/helpers');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = { tenantId: req.tenantId, isActive: true };
    if (type) where.type = type;
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { code: { contains: search } }];
    const accounts = await prisma.account.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      include: { children: { where: { isActive: true }, orderBy: { code: 'asc' } } },
    });
    res.json({ data: accounts });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch accounts' }); }
});

router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { code, name, type, subType, description, currency, parentId } = req.body;
    if (!code || !name || !type) return res.status(400).json({ error: 'Code, name, and type are required' });

    if (parentId) {
      const parent = await prisma.account.findFirst({ where: { id: parentId, tenantId: req.tenantId, isActive: true }, select: { id: true } });
      if (!parent) return res.status(404).json({ error: 'Parent account not found' });
    }

    const account = await prisma.account.create({
      data: { tenantId: req.tenantId, code, name, type, subType, description, currency: currency || 'NGN', parentId },
    });
    res.status(201).json({ data: account });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Account code already exists' });
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.get('/journal-entries', async (req, res) => {
  try {
    const { page, limit, from, to, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        take,
        skip,
        orderBy: { date: 'desc' },
        include: {
          lines: { include: { account: { select: { code: true, name: true } } } },
          reversedBy: { select: { id: true, reference: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch journal entries' }); }
});

router.post('/journal-entries', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { reference, description, date, currency, lines } = req.body;
    if (!lines?.length) return res.status(400).json({ error: 'Journal lines are required' });

    const entryDate = date ? new Date(date) : new Date();
    if (Number.isNaN(entryDate.getTime())) return res.status(400).json({ error: 'Invalid journal date' });

    const closedPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        tenantId: req.tenantId,
        isClosed: true,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
      select: { id: true, name: true },
    });
    if (closedPeriod) {
      return res.status(409).json({ error: `Accounting period is closed: ${closedPeriod.name}` });
    }

    const normalizedLines = lines
      .map((l) => ({
        accountId: l.accountId,
        description: l.description,
        debit: parseFloat(l.debit || 0),
        credit: parseFloat(l.credit || 0),
      }))
      .filter((l) => l.accountId);

    if (normalizedLines.length === 0) return res.status(400).json({ error: 'No valid journal lines' });
    for (const l of normalizedLines) {
      if (Number.isNaN(l.debit) || Number.isNaN(l.credit)) return res.status(400).json({ error: 'Invalid debit/credit value' });
      if (l.debit < 0 || l.credit < 0) return res.status(400).json({ error: 'Debit/credit cannot be negative' });
      if (l.debit > 0 && l.credit > 0) return res.status(400).json({ error: 'A line cannot have both debit and credit' });
    }

    const accountIds = [...new Set(normalizedLines.map((l) => l.accountId))];
    const existingAccounts = await prisma.account.findMany({
      where: { tenantId: req.tenantId, id: { in: accountIds }, isActive: true },
      select: { id: true },
    });
    if (existingAccounts.length !== accountIds.length) {
      return res.status(400).json({ error: 'One or more accounts are invalid for this tenant' });
    }

    const totalDebits = normalizedLines.reduce((s, l) => s + l.debit, 0);
    const totalCredits = normalizedLines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res.status(400).json({ error: 'Journal entry must balance: debits must equal credits' });
    }
    if (Math.abs(totalDebits) < 0.01 && Math.abs(totalCredits) < 0.01) {
      return res.status(400).json({ error: 'Journal entry totals cannot be zero' });
    }

    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: req.tenantId,
        reference: reference || `JNL-${Date.now()}`,
        description,
        date: entryDate,
        currency: currency || 'NGN',
        createdById: req.user.id,
        lines: { create: normalizedLines.map((l) => ({ accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit })) },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
    res.status(201).json({ data: entry });
  } catch (e) { res.status(500).json({ error: 'Failed to create journal entry' }); }
});

/** Delete a draft journal only (cannot delete posted entries; respects closed periods). */
router.delete('/journal-entries/:id', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    if (entry.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft journal entries can be deleted' });
    }

    const closedPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        tenantId: req.tenantId,
        isClosed: true,
        startDate: { lte: entry.date },
        endDate: { gte: entry.date },
      },
      select: { id: true, name: true },
    });
    if (closedPeriod) {
      return res.status(409).json({ error: `Accounting period is closed: ${closedPeriod.name}` });
    }

    await prisma.journalEntry.delete({ where: { id: entry.id } });
    res.json({ message: 'Journal entry deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

/** Post a reversing journal (mirrors debits/credits) for a posted entry. */
router.post('/journal-entries/:id/reverse', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId, status: 'POSTED' },
      include: { lines: true },
    });
    if (!entry) return res.status(404).json({ error: 'Posted journal entry not found' });
    if (entry.reversesEntryId) {
      return res.status(400).json({ error: 'Cannot reverse a reversal entry' });
    }
    const already = await prisma.journalEntry.findFirst({ where: { reversesEntryId: entry.id } });
    if (already) return res.status(400).json({ error: 'This entry was already reversed' });

    const entryDate = new Date();
    const closedPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        tenantId: req.tenantId,
        isClosed: true,
        startDate: { lte: entryDate },
        endDate: { gte: entryDate },
      },
      select: { id: true, name: true },
    });
    if (closedPeriod) {
      return res.status(409).json({ error: `Accounting period is closed: ${closedPeriod.name}` });
    }

    const ref = `REV-${entry.reference}`.slice(0, 120);
    const desc = `Reversal of ${entry.reference}`;

    const mirrorLines = entry.lines.map((l) => ({
      accountId: l.accountId,
      description: l.description ? `Rev: ${l.description}` : 'Reversal',
      debit: parseFloat(l.credit || 0),
      credit: parseFloat(l.debit || 0),
    }));

    const lineTotals = mirrorLines.reduce((acc, l) => {
      acc[l.accountId] = acc[l.accountId] || { debit: 0, credit: 0 };
      acc[l.accountId].debit += l.debit;
      acc[l.accountId].credit += l.credit;
      return acc;
    }, {});

    const newEntry = await prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          tenantId: req.tenantId,
          reference: ref,
          description: desc,
          date: entryDate,
          currency: entry.currency || 'NGN',
          status: 'POSTED',
          postedAt: new Date(),
          createdById: req.user.id,
          reversesEntryId: entry.id,
          sourceType: 'REVERSAL',
          sourceId: entry.id,
          lines: {
            create: mirrorLines.map((l) => ({
              accountId: l.accountId,
              description: l.description,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
      });

      for (const [accountId, t] of Object.entries(lineTotals)) {
        const account = await tx.account.findFirst({
          where: { id: accountId, tenantId: req.tenantId, isActive: true },
        });
        if (!account) throw new Error('Account not found');
        const debit = t.debit || 0;
        const credit = t.credit || 0;
        const net = debit - credit;
        const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
        const signedDelta = isDebitNormal ? net : -net;
        await tx.account.updateMany({
          where: { id: account.id, tenantId: req.tenantId },
          data: { balance: { increment: signedDelta } },
        });
      }

      return created;
    });

    const full = await prisma.journalEntry.findFirst({
      where: { id: newEntry.id, tenantId: req.tenantId },
      include: { lines: { include: { account: { select: { code: true, name: true, type: true } } } } },
    });
    res.status(201).json({ data: full });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to reverse journal entry' });
  }
});

router.post('/journal-entries/:id/post', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { lines: true },
    });

    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    if (entry.status !== 'DRAFT') return res.status(400).json({ error: 'Only draft journal entries can be posted' });

    const closedPeriod = await prisma.accountingPeriod.findFirst({
      where: {
        tenantId: req.tenantId,
        isClosed: true,
        startDate: { lte: entry.date },
        endDate: { gte: entry.date },
      },
      select: { id: true, name: true },
    });
    if (closedPeriod) {
      return res.status(409).json({ error: `Accounting period is closed: ${closedPeriod.name}` });
    }

    const totalDebits = entry.lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
    const totalCredits = entry.lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res.status(400).json({ error: 'Journal entry must balance: debits must equal credits' });
    }
    if (Math.abs(totalDebits) < 0.01 && Math.abs(totalCredits) < 0.01) {
      return res.status(400).json({ error: 'Journal entry totals cannot be zero' });
    }
    for (const l of entry.lines) {
      const debit = parseFloat(l.debit || 0);
      const credit = parseFloat(l.credit || 0);
      if (debit < 0 || credit < 0) return res.status(400).json({ error: 'Debit/credit cannot be negative' });
      if (debit > 0 && credit > 0) return res.status(400).json({ error: 'A line cannot have both debit and credit' });
    }

    const lineTotals = entry.lines.reduce((acc, l) => {
      acc[l.accountId] = acc[l.accountId] || { debit: 0, credit: 0 };
      acc[l.accountId].debit += parseFloat(l.debit || 0);
      acc[l.accountId].credit += parseFloat(l.credit || 0);
      return acc;
    }, {});

    await prisma.$transaction(async (tx) => {
      const updatedEntry = await tx.journalEntry.updateMany({
        where: { id: entry.id, tenantId: req.tenantId, status: 'DRAFT' },
        data: { status: 'POSTED', postedAt: new Date() },
      });
      if (updatedEntry.count !== 1) throw new Error('Journal entry post conflict');

      for (const [accountId, t] of Object.entries(lineTotals)) {
        const account = await tx.account.findFirst({ where: { id: accountId, tenantId: req.tenantId, isActive: true } });
        if (!account) throw new Error('Account not found');

        const debit = t.debit || 0;
        const credit = t.credit || 0;
        const net = debit - credit;

        const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
        const signedDelta = isDebitNormal ? net : -net;

        const updatedAccount = await tx.account.updateMany({
          where: { id: account.id, tenantId: req.tenantId },
          data: { balance: { increment: signedDelta } },
        });
        if (updatedAccount.count !== 1) throw new Error('Account update failed');
      }
    });

    const updated = await prisma.journalEntry.findFirst({
      where: { id: entry.id, tenantId: req.tenantId },
      include: { lines: { include: { account: { select: { code: true, name: true, type: true } } } } },
    });
    res.json({ data: updated });
  } catch (e) {
    if (String(e.message || '').includes('post conflict')) {
      return res.status(409).json({ error: 'Journal entry post conflict' });
    }
    res.status(500).json({ error: 'Failed to post journal entry' });
  }
});

router.get('/accounting-periods', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const periods = await prisma.accountingPeriod.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { startDate: 'desc' },
    });
    res.json({ data: periods });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch accounting periods' });
  }
});

router.post('/accounting-periods', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid startDate/endDate' });
    if (start > end) return res.status(400).json({ error: 'startDate must be before endDate' });

    const overlap = await prisma.accountingPeriod.findFirst({
      where: {
        tenantId: req.tenantId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true },
    });
    if (overlap) return res.status(409).json({ error: 'Period overlaps an existing accounting period' });

    const period = await prisma.accountingPeriod.create({
      data: { tenantId: req.tenantId, name, startDate: start, endDate: end },
    });
    res.status(201).json({ data: period });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Accounting period already exists' });
    res.status(500).json({ error: 'Failed to create accounting period' });
  }
});

router.post('/accounting-periods/:id/close', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const period = await prisma.accountingPeriod.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!period) return res.status(404).json({ error: 'Accounting period not found' });
    if (period.isClosed) return res.status(400).json({ error: 'Accounting period already closed' });

    const openDrafts = await prisma.journalEntry.count({
      where: { tenantId: req.tenantId, status: 'DRAFT', date: { gte: period.startDate, lte: period.endDate } },
    });
    if (openDrafts > 0) return res.status(409).json({ error: 'Cannot close period: draft journal entries exist in this period' });

    const updated = await prisma.accountingPeriod.updateMany({
      where: { id: period.id, tenantId: req.tenantId, isClosed: false },
      data: { isClosed: true, closedAt: new Date(), closedById: req.user.id },
    });
    if (updated.count !== 1) return res.status(409).json({ error: 'Accounting period close conflict' });

    const closed = await prisma.accountingPeriod.findFirst({ where: { id: period.id, tenantId: req.tenantId } });
    res.json({ data: closed });
  } catch (e) {
    res.status(500).json({ error: 'Failed to close accounting period' });
  }
});

router.get('/trial-balance', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { asOf } = req.query;
    const asOfDate = asOf ? new Date(asOf) : new Date();
    if (Number.isNaN(asOfDate.getTime())) return res.status(400).json({ error: 'Invalid asOf date' });

    const entries = await prisma.journalEntry.findMany({
      where: { tenantId: req.tenantId, status: 'POSTED', date: { lte: asOfDate } },
      select: { lines: { select: { accountId: true, debit: true, credit: true } } },
    });

    const totalsByAccount = {};
    for (const e of entries) {
      for (const l of e.lines) {
        totalsByAccount[l.accountId] = totalsByAccount[l.accountId] || { debit: 0, credit: 0 };
        totalsByAccount[l.accountId].debit += parseFloat(l.debit || 0);
        totalsByAccount[l.accountId].credit += parseFloat(l.credit || 0);
      }
    }

    const accountIds = Object.keys(totalsByAccount);
    const accounts = await prisma.account.findMany({
      where: { tenantId: req.tenantId, id: { in: accountIds } },
      select: { id: true, code: true, name: true, type: true },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });

    const rows = accounts.map((a) => ({
      accountId: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debit: totalsByAccount[a.id]?.debit || 0,
      credit: totalsByAccount[a.id]?.credit || 0,
    }));

    const totals = rows.reduce((acc, r) => {
      acc.debit += r.debit;
      acc.credit += r.credit;
      return acc;
    }, { debit: 0, credit: 0 });

    res.json({ data: { asOf: asOfDate, rows, totals, isBalanced: Math.abs(totals.debit - totals.credit) < 0.01 } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate trial balance' });
  }
});

router.get('/bank-reconciliation/sessions', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const sessions = await prisma.bankReconciliationSession.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        account: { select: { id: true, code: true, name: true } },
        lines: { select: { id: true, status: true } },
      },
      take: 100,
    });
    const data = sessions.map((s) => ({
      ...s,
      matchedCount: (s.lines || []).filter((l) => l.status === 'MATCHED').length,
      totalLines: (s.lines || []).length,
    }));
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch bank reconciliation sessions' });
  }
});

router.post('/bank-reconciliation/sessions', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { accountId, statementDate, openingBalance, closingBalance, notes } = req.body || {};
    if (!accountId || !statementDate) return res.status(400).json({ error: 'accountId and statementDate are required' });

    const account = await prisma.account.findFirst({
      where: { id: accountId, tenantId: req.tenantId, isActive: true, type: 'ASSET' },
      select: { id: true },
    });
    if (!account) return res.status(404).json({ error: 'Bank account not found (must be active ASSET account)' });

    const session = await prisma.bankReconciliationSession.create({
      data: {
        tenantId: req.tenantId,
        accountId,
        statementDate: new Date(statementDate),
        openingBalance: roundDecimal(parseFloat(openingBalance || 0)),
        closingBalance: roundDecimal(parseFloat(closingBalance || 0)),
        notes: notes ? String(notes).trim() : null,
        createdById: req.user?.id || null,
      },
    });
    res.status(201).json({ data: session });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create reconciliation session' });
  }
});

router.get('/bank-reconciliation/sessions/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const session = await prisma.bankReconciliationSession.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        account: { select: { id: true, code: true, name: true } },
        lines: {
          orderBy: { txDate: 'asc' },
          include: { matchedJournal: { select: { id: true, reference: true, date: true, description: true } } },
        },
      },
    });
    if (!session) return res.status(404).json({ error: 'Reconciliation session not found' });

    const matchedJournalIds = (session.lines || []).filter((l) => l.matchedJournalId).map((l) => l.matchedJournalId);
    const candidates = await prisma.journalEntry.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'POSTED',
        lines: { some: { accountId: session.accountId } },
        id: matchedJournalIds.length ? { notIn: matchedJournalIds } : undefined,
      },
      orderBy: { date: 'desc' },
      take: 300,
      include: {
        lines: { where: { accountId: session.accountId }, select: { debit: true, credit: true, accountId: true } },
      },
    });
    const journals = candidates.map((j) => {
      const lineAmount = (j.lines || []).reduce((sum, l) => sum + (parseFloat(l.debit || 0) - parseFloat(l.credit || 0)), 0);
      return { ...j, lineAmount: roundDecimal(lineAmount) };
    });

    res.json({ data: { session, candidateJournals: journals } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reconciliation session details' });
  }
});

router.post('/bank-reconciliation/sessions/:id/import-lines', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { lines } = req.body || {};
    if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ error: 'lines array is required' });
    const session = await prisma.bankReconciliationSession.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!session) return res.status(404).json({ error: 'Reconciliation session not found' });
    if (session.status !== 'OPEN') return res.status(409).json({ error: 'Only OPEN sessions can import lines' });

    const payload = lines.map((l) => {
      const debit = roundDecimal(parseFloat(l.debit || 0));
      const credit = roundDecimal(parseFloat(l.credit || 0));
      const amount = roundDecimal(credit - debit);
      return {
        sessionId: session.id,
        tenantId: req.tenantId,
        txDate: l.txDate ? new Date(l.txDate) : new Date(),
        description: String(l.description || '').trim() || 'Bank statement line',
        reference: l.reference ? String(l.reference).trim() : null,
        debit,
        credit,
        amount,
      };
    });
    await prisma.bankStatementLine.createMany({ data: payload });
    res.status(201).json({ message: 'Statement lines imported', count: payload.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to import statement lines' });
  }
});

router.post('/bank-reconciliation/lines/:lineId/match', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { journalEntryId } = req.body || {};
    if (!journalEntryId) return res.status(400).json({ error: 'journalEntryId is required' });

    const line = await prisma.bankStatementLine.findFirst({
      where: { id: req.params.lineId, tenantId: req.tenantId },
      include: { session: { select: { accountId: true, status: true } } },
    });
    if (!line) return res.status(404).json({ error: 'Statement line not found' });
    if (line.session.status !== 'OPEN') return res.status(409).json({ error: 'Session is not open' });

    const journal = await prisma.journalEntry.findFirst({
      where: {
        id: journalEntryId,
        tenantId: req.tenantId,
        status: 'POSTED',
        lines: { some: { accountId: line.session.accountId } },
      },
      include: { lines: { where: { accountId: line.session.accountId }, select: { debit: true, credit: true } } },
    });
    if (!journal) return res.status(404).json({ error: 'Journal entry not found for selected bank account' });

    const journalAmount = roundDecimal((journal.lines || []).reduce((s, l) => s + (parseFloat(l.debit || 0) - parseFloat(l.credit || 0)), 0));
    const lineAmount = roundDecimal(parseFloat(line.amount || 0));
    if (Math.abs(Math.abs(journalAmount) - Math.abs(lineAmount)) > 0.01) {
      return res.status(422).json({ error: 'Amount mismatch between bank statement line and journal entry', lineAmount, journalAmount });
    }

    const updated = await prisma.bankStatementLine.update({
      where: { id: line.id },
      data: { status: 'MATCHED', matchedJournalId: journal.id, matchedAt: new Date() },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to match statement line' });
  }
});

router.post('/bank-reconciliation/lines/:lineId/unmatch', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const line = await prisma.bankStatementLine.findFirst({
      where: { id: req.params.lineId, tenantId: req.tenantId },
      include: { session: { select: { status: true } } },
    });
    if (!line) return res.status(404).json({ error: 'Statement line not found' });
    if (line.session.status !== 'OPEN') return res.status(409).json({ error: 'Session is not open' });
    const updated = await prisma.bankStatementLine.update({
      where: { id: line.id },
      data: { status: 'UNMATCHED', matchedJournalId: null, matchedAt: null },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to unmatch statement line' });
  }
});

router.post('/bank-reconciliation/sessions/:id/complete', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const session = await prisma.bankReconciliationSession.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { lines: { select: { status: true } } },
    });
    if (!session) return res.status(404).json({ error: 'Reconciliation session not found' });
    if (session.status !== 'OPEN') return res.status(409).json({ error: 'Session already completed' });
    const hasUnmatched = (session.lines || []).some((l) => l.status !== 'MATCHED');
    if (hasUnmatched) return res.status(422).json({ error: 'Cannot complete session with unmatched lines' });

    const updated = await prisma.bankReconciliationSession.update({
      where: { id: session.id },
      data: { status: 'COMPLETED' },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete reconciliation session' });
  }
});

/**
 * Unified transactions hub:
 * merges posted journals, invoices, payments, payroll runs, and purchase orders.
 */
router.get('/transactions-hub', requireRole('OWNER', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { from, to, q, kind, limit } = req.query;
    const take = Math.min(Math.max(parseInt(limit, 10) || 250, 1), 1000);
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const qText = String(q || '').trim().toLowerCase();
    const kindFilter = kind ? String(kind).toUpperCase() : null;

    const inRange = (d) => {
      const date = d ? new Date(d) : null;
      if (!date || Number.isNaN(date.valueOf())) return false;
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    };

    const [journals, invoices, payments, payrollRuns, purchaseOrders] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { tenantId: req.tenantId, status: 'POSTED' },
        orderBy: { date: 'desc' },
        take,
      }),
      prisma.invoice.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, createdAt: true, dueDate: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.payment.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, amount: true, method: true, reference: true, paidAt: true, createdAt: true, invoiceId: true },
        orderBy: { paidAt: 'desc' },
        take,
      }),
      prisma.payrollRun.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, period: true, status: true, totalNet: true, processedAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.purchaseOrder.findMany({
        where: { tenantId: req.tenantId },
        select: { id: true, poNumber: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    let rows = [
      ...journals.map((j) => ({
        id: `journal:${j.id}`,
        kind: 'JOURNAL',
        date: j.date,
        reference: j.reference || j.id,
        status: j.status,
        amount: null,
        currency: j.currency || 'NGN',
        description: j.description || '',
        sourceId: j.id,
      })),
      ...invoices.map((i) => ({
        id: `invoice:${i.id}`,
        kind: 'INVOICE',
        date: i.createdAt,
        reference: i.invoiceNumber || i.id,
        status: i.status,
        amount: parseFloat(i.totalAmount || 0),
        currency: 'NGN',
        description: i.dueDate ? `Due ${new Date(i.dueDate).toISOString().slice(0, 10)}` : '',
        sourceId: i.id,
      })),
      ...payments.map((p) => ({
        id: `payment:${p.id}`,
        kind: 'PAYMENT',
        date: p.paidAt || p.createdAt,
        reference: p.reference || p.id,
        status: p.method || 'PAID',
        amount: parseFloat(p.amount || 0),
        currency: 'NGN',
        description: p.invoiceId ? `Invoice ${p.invoiceId}` : '',
        sourceId: p.id,
      })),
      ...payrollRuns.map((r) => ({
        id: `payroll:${r.id}`,
        kind: 'PAYROLL',
        date: r.processedAt || r.createdAt,
        reference: r.period || r.id,
        status: r.status,
        amount: parseFloat(r.totalNet || 0),
        currency: 'NGN',
        description: 'Payroll run',
        sourceId: r.id,
      })),
      ...purchaseOrders.map((p) => ({
        id: `po:${p.id}`,
        kind: 'PURCHASE_ORDER',
        date: p.createdAt,
        reference: p.poNumber || p.id,
        status: p.status,
        amount: parseFloat(p.totalAmount || 0),
        currency: 'NGN',
        description: 'Purchase order',
        sourceId: p.id,
      })),
    ];

    rows = rows.filter((r) => inRange(r.date));
    if (kindFilter) rows = rows.filter((r) => r.kind === kindFilter);
    if (qText) {
      rows = rows.filter((r) =>
        [r.reference, r.status, r.description, r.kind]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(qText))
      );
    }
    rows.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());

    const totalsByKind = rows.reduce((acc, r) => {
      if (r.amount === null || Number.isNaN(r.amount)) return acc;
      acc[r.kind] = (acc[r.kind] || 0) + r.amount;
      return acc;
    }, {});

    res.json({
      data: {
        rows: rows.slice(0, take),
        totalsByKind,
        totalRows: rows.length,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to build transactions hub' });
  }
});

module.exports = router;
