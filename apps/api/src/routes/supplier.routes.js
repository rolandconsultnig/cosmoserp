const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate, requireTenantUser);

router.get('/', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    const [data, total] = await Promise.all([
      prisma.supplier.findMany({ where, take, skip, orderBy: { name: 'asc' }, include: { _count: { select: { purchaseOrders: true } } } }),
      prisma.supplier.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch suppliers' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ data: supplier });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch supplier' }); }
});

router.post('/', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const { name, email, phone, address, city, state, country, tin, currency, paymentTerms } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const supplier = await prisma.supplier.create({
      data: { tenantId: req.tenantId, name, email, phone, address, city, state, country: country || 'Nigeria', tin, currency: currency || 'NGN', paymentTerms: paymentTerms || 30 },
    });
    res.status(201).json({ data: supplier });
  } catch (e) { res.status(500).json({ error: 'Failed to create supplier' }); }
});

router.put('/:id', requireRole('OWNER','ADMIN','ACCOUNTANT'), async (req, res) => {
  try {
    const supplier = await prisma.supplier.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    const { name, email, phone, address, city, state, country, tin, currency, paymentTerms, isActive, notes } = req.body;
    const updated = await prisma.supplier.update({ where: { id: supplier.id }, data: { name, email, phone, address, city, state, country, tin, currency, paymentTerms, isActive, notes } });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update supplier' }); }
});

module.exports = router;
