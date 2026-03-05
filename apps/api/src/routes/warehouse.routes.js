const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { tenantId: req.tenantId },
      include: { _count: { select: { stockLevels: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: warehouses });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch warehouses' }); }
});

router.post('/', requireRole('OWNER','ADMIN','WAREHOUSE'), async (req, res) => {
  try {
    const { name, code, address, city, state, isDefault } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required' });
    if (isDefault) {
      await prisma.warehouse.updateMany({ where: { tenantId: req.tenantId }, data: { isDefault: false } });
    }
    const warehouse = await prisma.warehouse.create({
      data: { tenantId: req.tenantId, name, code: code.toUpperCase(), address, city, state, isDefault: isDefault || false },
    });
    res.status(201).json({ data: warehouse });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Warehouse code already exists' });
    res.status(500).json({ error: 'Failed to create warehouse' });
  }
});

router.put('/:id', requireRole('OWNER','ADMIN','WAREHOUSE'), async (req, res) => {
  try {
    const wh = await prisma.warehouse.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    const { name, address, city, state, isDefault, isActive } = req.body;
    if (isDefault) {
      await prisma.warehouse.updateMany({ where: { tenantId: req.tenantId }, data: { isDefault: false } });
    }
    const updated = await prisma.warehouse.update({ where: { id: wh.id }, data: { name, address, city, state, isDefault, isActive } });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update warehouse' }); }
});

router.get('/:id/stock', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { take, skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      prisma.stockLevel.findMany({
        where: { warehouseId: req.params.id, tenantId: req.tenantId },
        take, skip,
        include: { product: { select: { id: true, sku: true, name: true, reorderPoint: true, unit: true } } },
      }),
      prisma.stockLevel.count({ where: { warehouseId: req.params.id, tenantId: req.tenantId } }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch stock' }); }
});

module.exports = router;
