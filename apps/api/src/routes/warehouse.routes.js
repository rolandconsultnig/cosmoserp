const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser, requireEnabledModule } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate, requireTenantUser, requireEnabledModule('inventory'));

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

router.post('/transfers', requireRole('OWNER','ADMIN','WAREHOUSE'), async (req, res) => {
  try {
    const { fromWarehouseId, toWarehouseId, lines, notes } = req.body;
    if (!fromWarehouseId || !toWarehouseId) return res.status(400).json({ error: 'fromWarehouseId and toWarehouseId are required' });
    if (fromWarehouseId === toWarehouseId) return res.status(400).json({ error: 'Source and destination warehouses must be different' });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'Transfer lines are required' });

    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: fromWarehouseId, tenantId: req.tenantId } }),
      prisma.warehouse.findFirst({ where: { id: toWarehouseId, tenantId: req.tenantId } }),
    ]);
    if (!fromWh) return res.status(404).json({ error: 'Source warehouse not found' });
    if (!toWh) return res.status(404).json({ error: 'Destination warehouse not found' });

    const cleaned = lines
      .map((l) => ({ productId: l.productId, quantity: parseInt(l.quantity, 10) }))
      .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
    if (cleaned.length === 0) return res.status(400).json({ error: 'No valid transfer lines' });

    const reference = `TRF-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      for (const l of cleaned) {
        const product = await tx.product.findFirst({ where: { id: l.productId, tenantId: req.tenantId } });
        if (!product) throw new Error('Product not found');

        const fromLevel = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId: l.productId, warehouseId: fromWarehouseId } },
        });
        const available = fromLevel?.quantity || 0;
        if (available < l.quantity) throw new Error('Insufficient stock for transfer');

        await tx.stockLevel.upsert({
          where: { productId_warehouseId: { productId: l.productId, warehouseId: fromWarehouseId } },
          update: { quantity: available - l.quantity },
          create: { tenantId: req.tenantId, productId: l.productId, warehouseId: fromWarehouseId, quantity: 0 },
        });

        const toLevel = await tx.stockLevel.findUnique({
          where: { productId_warehouseId: { productId: l.productId, warehouseId: toWarehouseId } },
        });
        const destQty = toLevel?.quantity || 0;
        await tx.stockLevel.upsert({
          where: { productId_warehouseId: { productId: l.productId, warehouseId: toWarehouseId } },
          update: { quantity: destQty + l.quantity },
          create: { tenantId: req.tenantId, productId: l.productId, warehouseId: toWarehouseId, quantity: l.quantity },
        });

        await tx.stockMovement.createMany({
          data: [
            {
              tenantId: req.tenantId,
              productId: l.productId,
              warehouseId: fromWarehouseId,
              type: 'TRANSFER',
              quantity: -l.quantity,
              reference,
              sourceType: 'WAREHOUSE_TRANSFER',
              notes,
              createdById: req.user.id,
            },
            {
              tenantId: req.tenantId,
              productId: l.productId,
              warehouseId: toWarehouseId,
              type: 'TRANSFER',
              quantity: l.quantity,
              reference,
              sourceType: 'WAREHOUSE_TRANSFER',
              notes,
              createdById: req.user.id,
            },
          ],
        });
      }
    });

    res.status(201).json({ message: 'Transfer completed', reference });
  } catch (e) {
    if (String(e.message || '').includes('Insufficient stock')) return res.status(400).json({ error: e.message });
    if (String(e.message || '').includes('Product not found')) return res.status(404).json({ error: e.message });
    res.status(500).json({ error: 'Failed to transfer stock' });
  }
});

router.get('/stock-movements', async (req, res) => {
  try {
    const { page, limit, productId, warehouseId, type, from, to, reference } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (reference) where.reference = { contains: reference, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

module.exports = router;
