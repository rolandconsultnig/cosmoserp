const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, take, skip, orderBy: { name: 'asc' }, include: { _count: { select: { invoices: true } } } }),
      prisma.customer.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch customers' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { invoices: { orderBy: { createdAt: 'desc' }, take: 10 }, quotes: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ data: customer });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch customer' }); }
});

router.post('/', requireRole('OWNER','ADMIN','SALES','ACCOUNTANT'), async (req, res) => {
  try {
    const { name, email, phone, whatsapp, address, city, state, country, tin, rcNumber, creditLimit, currency } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const customer = await prisma.customer.create({
      data: { tenantId: req.tenantId, name, email, phone, whatsapp, address, city, state, country: country || 'Nigeria', tin, rcNumber, creditLimit: creditLimit ? parseFloat(creditLimit) : 0, currency: currency || 'NGN' },
    });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', resource: 'Customer', resourceId: customer.id, req });
    res.status(201).json({ data: customer });
  } catch (e) { res.status(500).json({ error: 'Failed to create customer' }); }
});

router.put('/:id', requireRole('OWNER','ADMIN','SALES','ACCOUNTANT'), async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const { name, email, phone, whatsapp, address, city, state, country, tin, rcNumber, creditLimit, currency, isActive, notes } = req.body;
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { name, email, phone, whatsapp, address, city, state, country, tin, rcNumber, creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined, currency, isActive, notes },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update customer' }); }
});

module.exports = router;
