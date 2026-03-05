const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate);

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
      prisma.journalEntry.findMany({ where, take, skip, orderBy: { date: 'desc' }, include: { lines: { include: { account: { select: { code: true, name: true } } } } } }),
      prisma.journalEntry.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch journal entries' }); }
});

router.post('/journal-entries', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { reference, description, date, currency, lines } = req.body;
    if (!lines?.length) return res.status(400).json({ error: 'Journal lines are required' });
    const totalDebits = lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
    const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res.status(400).json({ error: 'Journal entry must balance: debits must equal credits' });
    }
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: req.tenantId,
        reference: reference || `JNL-${Date.now()}`,
        description,
        date: date ? new Date(date) : new Date(),
        currency: currency || 'NGN',
        createdById: req.user.id,
        lines: { create: lines.map((l) => ({ accountId: l.accountId, description: l.description, debit: parseFloat(l.debit || 0), credit: parseFloat(l.credit || 0) })) },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
    res.status(201).json({ data: entry });
  } catch (e) { res.status(500).json({ error: 'Failed to create journal entry' }); }
});

module.exports = router;
