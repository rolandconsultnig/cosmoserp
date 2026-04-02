const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireKYC, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');
const nrsService = require('../services/nrs.service');

router.use(authenticate, requireTenantUser, requireEnabledModule('finance'));

router.get('/logs', async (req, res) => {
  try {
    const { page, limit, status, invoiceId } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (invoiceId) where.invoiceId = invoiceId;
    const [data, total] = await Promise.all([
      prisma.nRSLog.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: { invoice: { select: { invoiceNumber: true } } } }),
      prisma.nRSLog.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch NRS logs' }); }
});

router.post('/submit/:invoiceId', requireRole('OWNER','ADMIN','ACCOUNTANT'), requireKYC, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.invoiceId, tenantId: req.tenantId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const result = await nrsService.submitInvoice(invoice.id, req.tenantId);
    res.json({ data: result });
  } catch (e) { res.status(500).json({ error: e.message || 'NRS submission failed' }); }
});

router.post('/b2c-report', requireRole('OWNER','ADMIN','ACCOUNTANT'), requireKYC, async (req, res) => {
  try {
    const { date } = req.body;
    await nrsService.scheduleB2CReport(req.tenantId, date ? new Date(date) : new Date(Date.now() - 86400000));
    res.json({ message: 'B2C T+1 report submitted' });
  } catch (e) { res.status(500).json({ error: 'Failed to submit B2C report' }); }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.nRSLog.groupBy({
      by: ['status'],
      where: { tenantId: req.tenantId },
      _count: true,
    });
    const pending = await prisma.invoice.count({ where: { tenantId: req.tenantId, nrsStatus: 'PENDING', status: { not: 'DRAFT' } } });
    res.json({ data: { stats, pendingSubmissions: pending } });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch NRS stats' }); }
});

module.exports = router;
