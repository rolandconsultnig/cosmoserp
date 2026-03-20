const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');

router.use(authenticate, requireTenantUser);

router.get('/', async (req, res) => {
  try {
    const currencies = await prisma.tenantCurrency.findMany({ where: { tenantId: req.tenantId }, orderBy: { isBase: 'desc' } });
    res.json({ data: currencies });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch currencies' }); }
});

router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { code, name, symbol, exchangeRate } = req.body;
    if (!code || !name || !symbol || !exchangeRate) return res.status(400).json({ error: 'All fields required' });
    const currency = await prisma.tenantCurrency.upsert({
      where: { tenantId_code: { tenantId: req.tenantId, code: code.toUpperCase() } },
      update: { name, symbol, exchangeRate: parseFloat(exchangeRate) },
      create: { tenantId: req.tenantId, code: code.toUpperCase(), name, symbol, exchangeRate: parseFloat(exchangeRate), isBase: false },
    });
    res.status(201).json({ data: currency });
  } catch (e) { res.status(500).json({ error: 'Failed to save currency' }); }
});

router.put('/:code/rate', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { exchangeRate } = req.body;
    const updated = await prisma.tenantCurrency.update({
      where: { tenantId_code: { tenantId: req.tenantId, code: req.params.code.toUpperCase() } },
      data: { exchangeRate: parseFloat(exchangeRate) },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update exchange rate' }); }
});

module.exports = router;
