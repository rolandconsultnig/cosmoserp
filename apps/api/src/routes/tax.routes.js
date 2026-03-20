const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate, requireTenantUser);

router.get('/filings', async (req, res) => {
  try {
    const { page, limit, type, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (type) where.type = type;
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.taxFiling.findMany({ where, take, skip, orderBy: { fromDate: 'desc' } }),
      prisma.taxFiling.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch tax filings' }); }
});

router.post('/filings/calculate', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.body;
    if (!type || !fromDate || !toDate) return res.status(400).json({ error: 'type, fromDate, and toDate required' });
    const from = new Date(fromDate);
    const to = new Date(toDate);

    let result = {};
    if (type === 'VAT') {
      const [outputVAT, inputVAT] = await Promise.all([
        prisma.invoice.aggregate({ where: { tenantId: req.tenantId, status: { not: 'CANCELLED' }, issueDate: { gte: from, lte: to } }, _sum: { vatAmount: true } }),
        prisma.purchaseOrder.aggregate({ where: { tenantId: req.tenantId, status: { not: 'CANCELLED' }, issueDate: { gte: from, lte: to } }, _sum: { vatAmount: true } }),
      ]);
      const vatOutput = parseFloat(outputVAT._sum.vatAmount || 0);
      const vatInput = parseFloat(inputVAT._sum.vatAmount || 0);
      result = { vatOutput, vatInput, vatPayable: Math.max(0, vatOutput - vatInput) };
    } else if (type === 'WHT') {
      const wht = await prisma.invoice.aggregate({ where: { tenantId: req.tenantId, status: { not: 'CANCELLED' }, issueDate: { gte: from, lte: to } }, _sum: { whtAmount: true } });
      result = { whtPayable: parseFloat(wht._sum.whtAmount || 0) };
    } else if (type === 'PAYE') {
      const lastPayroll = await prisma.payrollRun.findFirst({ where: { tenantId: req.tenantId, status: { in: ['APPROVED','PAID'] } }, orderBy: { year: 'desc' } });
      result = { payePayable: parseFloat(lastPayroll?.totalPaye || 0) };
    }

    const period = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
    const filing = await prisma.taxFiling.upsert({
      where: { id: `${req.tenantId}-${type}-${period}` },
      update: { ...result, fromDate: from, toDate: to, status: 'DRAFT', updatedAt: new Date() },
      create: { tenantId: req.tenantId, type, period, fromDate: from, toDate: to, status: 'DRAFT', ...result },
    }).catch(() =>
      prisma.taxFiling.create({ data: { tenantId: req.tenantId, type, period, fromDate: from, toDate: to, status: 'DRAFT', ...result } })
    );
    res.json({ data: filing });
  } catch (e) { res.status(500).json({ error: 'Failed to calculate tax' }); }
});

module.exports = router;
