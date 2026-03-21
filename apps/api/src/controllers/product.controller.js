const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { slugify, paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const whatsappService = require('../services/whatsapp.service');

async function list(req, res) {
  try {
    const { page, limit, search, categoryId, isMarketplace, lowStock } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId, isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (isMarketplace !== undefined) where.isMarketplace = isMarketplace === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where, take, skip,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          stockLevels: { include: { warehouse: { select: { id: true, name: true } } } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const normalized = data.map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images : [],
      stockLevels: Array.isArray(p.stockLevels) ? p.stockLevels : [],
    }));

    // Filter low stock products
    let filteredData = normalized;
    if (lowStock === 'true') {
      filteredData = normalized.filter((p) => {
        const totalStock = p.stockLevels.reduce((sum, sl) => sum + (sl.quantity || 0), 0);
        return totalStock <= (p.reorderPoint ?? 0);
      });
    }

    res.json(paginatedResponse(filteredData, total, page, limit));
  } catch (error) {
    logger.error('List products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

async function getOne(req, res) {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        category: true,
        stockLevels: { include: { warehouse: true } },
        stockMoves: { orderBy: { createdAt: 'desc' }, take: 20 },
        landedCosts: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

async function create(req, res) {
  try {
    const body = req.body || {};
    const {
      sku, name, description, categoryId, unit, costPrice, sellingPrice, currency, vatRate, whtRate,
      reorderPoint, reorderQty, barcode, weight, dimensions, hscode, initialStock: rawInitial,
      warehouseId: rawWarehouseId,
    } = body;

    const skuTrim = sku != null ? String(sku).trim() : '';
    const nameTrim = name != null ? String(name).trim() : '';
    if (!skuTrim || !nameTrim) {
      return res.status(400).json({ error: 'SKU and product name are required' });
    }

    const cp = parseFloat(costPrice);
    const sp = parseFloat(sellingPrice);
    if (!Number.isFinite(cp) || cp < 0 || !Number.isFinite(sp) || sp < 0) {
      return res.status(400).json({ error: 'Enter valid cost price and selling price (numbers ≥ 0)' });
    }

    const initialStock = Math.max(0, parseInt(rawInitial, 10) || 0);
    const warehouseId = rawWarehouseId && String(rawWarehouseId).trim() ? String(rawWarehouseId).trim() : null;

    if (initialStock > 0 && !warehouseId) {
      return res.status(400).json({ error: 'Select a warehouse when adding initial stock, or set initial stock to 0' });
    }

    if (warehouseId) {
      const wh = await prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId: req.tenantId },
        select: { id: true },
      });
      if (!wh) return res.status(400).json({ error: 'Warehouse not found for your business' });
    }

    const existing = await prisma.product.findUnique({
      where: { tenantId_sku: { tenantId: req.tenantId, sku: skuTrim } },
    });
    if (existing) return res.status(409).json({ error: `Product with SKU "${skuTrim}" already exists` });

    const vatParsed = vatRate !== undefined && vatRate !== '' ? parseFloat(vatRate) : NaN;
    const whtParsed = whtRate !== undefined && whtRate !== '' ? parseFloat(whtRate) : NaN;
    const vat = Number.isFinite(vatParsed) ? vatParsed : 0.075;
    const wht = Number.isFinite(whtParsed) ? whtParsed : 0;

    let dims = undefined;
    if (dimensions != null && dimensions !== '' && typeof dimensions === 'object' && !Array.isArray(dimensions)) {
      dims = dimensions;
    }

    let weightVal = undefined;
    if (weight !== undefined && weight !== null && weight !== '') {
      const wn = parseFloat(weight);
      if (Number.isFinite(wn)) weightVal = wn;
    }

    const images = Array.isArray(body.images) ? body.images.filter((x) => typeof x === 'string') : [];

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          tenantId: req.tenantId,
          sku: skuTrim,
          name: nameTrim,
          description: description != null && String(description).trim() ? String(description).trim() : null,
          categoryId: categoryId && String(categoryId).trim() ? String(categoryId).trim() : null,
          unit: unit ? String(unit) : 'piece',
          costPrice: cp,
          sellingPrice: sp,
          currency: currency ? String(currency) : 'NGN',
          vatRate: vat,
          whtRate: wht,
          reorderPoint: reorderPoint != null ? Math.max(0, parseInt(reorderPoint, 10) || 10) : 10,
          reorderQty: reorderQty != null ? Math.max(0, parseInt(reorderQty, 10) || 50) : 50,
          barcode: barcode != null && String(barcode).trim() ? String(barcode).trim() : null,
          weight: weightVal,
          dimensions: dims,
          hscode: hscode != null && String(hscode).trim() ? String(hscode).trim() : null,
          images,
        },
        include: { stockLevels: true },
      });

      if (initialStock > 0 && warehouseId) {
        await tx.stockLevel.create({
          data: { tenantId: req.tenantId, productId: p.id, warehouseId, quantity: initialStock },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: req.tenantId,
            productId: p.id,
            warehouseId,
            type: 'OPENING_STOCK',
            quantity: initialStock,
            reference: 'OPENING',
            createdById: req.user?.id || null,
          },
        });
      }
      return p;
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'CREATE',
      resource: 'Product',
      resourceId: product.id,
      newValues: { sku: skuTrim, name: nameTrim },
      req,
    });
    res.status(201).json({ data: product });
  } catch (error) {
    logger.error('Create product error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A product with this SKU or barcode already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid category or related record' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
}

async function update(req, res) {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const { sku, name, description, categoryId, unit, costPrice, sellingPrice, vatRate, whtRate, reorderPoint, reorderQty, barcode, weight, dimensions, hscode, isActive } = req.body;
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, name, description, categoryId, unit, costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined, sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : undefined, vatRate: vatRate !== undefined ? parseFloat(vatRate) : undefined, whtRate: whtRate !== undefined ? parseFloat(whtRate) : undefined, reorderPoint, reorderQty, barcode, weight, dimensions, hscode, isActive },
      include: { stockLevels: { include: { warehouse: true } } },
    });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
}

async function adjustStock(req, res) {
  try {
    const { warehouseId, quantity, type, notes } = req.body;
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const adjustQty = parseInt(quantity);
    if (isNaN(adjustQty)) return res.status(400).json({ error: 'Invalid quantity' });

    const stockLevel = await prisma.stockLevel.findUnique({ where: { productId_warehouseId: { productId: product.id, warehouseId } } });
    const currentQty = stockLevel?.quantity || 0;
    const newQty = type === 'ADJUSTMENT' ? adjustQty : currentQty + adjustQty;
    if (newQty < 0) return res.status(400).json({ error: 'Stock cannot go below zero' });

    await prisma.$transaction(async (tx) => {
      await tx.stockLevel.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId } },
        update: { quantity: newQty },
        create: { tenantId: req.tenantId, productId: product.id, warehouseId, quantity: newQty },
      });
      await tx.stockMovement.create({
        data: { tenantId: req.tenantId, productId: product.id, warehouseId, type: type || 'ADJUSTMENT', quantity: adjustQty, notes, createdById: req.user.id },
      });
    });

    // Low stock check
    if (newQty <= product.reorderPoint) {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
      const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });

      // Auto-create draft PO
      const supplier = await prisma.supplier.findFirst({ where: { tenantId: req.tenantId } });
      if (supplier) {
        const count = await prisma.purchaseOrder.count({ where: { tenantId: req.tenantId } });
        const { generatePONumber } = require('../utils/helpers');
        const poNumber = generatePONumber('PO', count + 1);
        await prisma.purchaseOrder.create({
          data: {
            tenantId: req.tenantId,
            supplierId: supplier.id,
            poNumber,
            status: 'DRAFT',
            isAutoGenerated: true,
            subtotal: parseFloat(product.costPrice) * product.reorderQty,
            vatAmount: parseFloat(product.costPrice) * product.reorderQty * 0.075,
            whtAmount: 0,
            totalAmount: parseFloat(product.costPrice) * product.reorderQty * 1.075,
            notes: `Auto-generated: Low stock alert for ${product.name}`,
            lines: {
              create: [{
                productId: product.id,
                description: product.name,
                quantity: product.reorderQty,
                unitPrice: parseFloat(product.costPrice),
                vatRate: 0.075,
                vatAmount: parseFloat(product.costPrice) * product.reorderQty * 0.075,
                lineTotal: parseFloat(product.costPrice) * product.reorderQty * 1.075,
              }],
            },
          },
        });
      }

      if (tenant?.phone && warehouse) {
        whatsappService.sendLowStockAlert(product, warehouse, newQty, tenant.phone).catch((e) => logger.debug('WA alert:', e.message));
      }
    }

    res.json({ message: 'Stock adjusted', newQuantity: newQty });
  } catch (error) {
    logger.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
}

async function toggleMarketplace(req, res) {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { isMarketplace, marketplaceDesc } = req.body;
    const totalStock = await prisma.stockLevel.aggregate({ where: { productId: product.id }, _sum: { quantity: true } });
    const stock = totalStock._sum.quantity || 0;

    if (isMarketplace && stock <= 0) {
      return res.status(400).json({ error: 'Cannot publish product with zero stock' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: { isMarketplace, marketplaceDesc },
      });

      if (isMarketplace) {
        const slug = `${slugify(product.name)}-${product.id.slice(0, 8)}`;
        await tx.marketplaceListing.upsert({
          where: { slug },
          update: { title: product.name, description: marketplaceDesc || product.description, price: product.sellingPrice, stock, isActive: true, updatedAt: new Date() },
          create: {
            tenantId: req.tenantId,
            productId: product.id,
            title: product.name,
            description: marketplaceDesc || product.description || product.name,
            price: product.sellingPrice,
            currency: product.currency,
            stock,
            images: product.images || [],
            slug,
            isActive: true,
            publishedAt: new Date(),
          },
        });
      } else {
        await tx.marketplaceListing.updateMany({ where: { productId: product.id }, data: { isActive: false } });
      }
      return p;
    });

    res.json({ data: updated, message: isMarketplace ? 'Product published to Cosmos Market' : 'Product removed from Cosmos Market' });
  } catch (error) {
    logger.error('Toggle marketplace error:', error);
    res.status(500).json({ error: 'Failed to toggle marketplace status' });
  }
}

async function addLandedCost(req, res) {
  try {
    const { description, amount, currency, costType, date, poId } = req.body;
    const product = await prisma.product.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const landedCost = await prisma.landedCost.create({
      data: { tenantId: req.tenantId, productId: product.id, poId, description, amount: parseFloat(amount), currency: currency || 'NGN', costType: costType || 'SHIPPING', date: new Date(date) },
    });

    // Recalculate total landed cost
    const allCosts = await prisma.landedCost.aggregate({ where: { productId: product.id }, _sum: { amount: true } });
    const totalLandedCost = allCosts._sum.amount || 0;
    await prisma.product.update({ where: { id: product.id }, data: { landedCost: totalLandedCost } });

    res.status(201).json({ data: landedCost, totalLandedCost });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add landed cost' });
  }
}

module.exports = { list, getOne, create, update, adjustStock, toggleMarketplace, addLandedCost };
