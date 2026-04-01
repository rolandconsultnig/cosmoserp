const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

const STATUS_FLOW = {
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
};

function sellerNetSum(lines) {
  return lines.reduce((s, l) => s + parseFloat(l.sellerNet || 0), 0);
}

/** Distinct seller tenants on the whole order (not filtered to current tenant). */
async function orderSellerMeta(orderId) {
  const rows = await prisma.marketplaceOrderLine.findMany({
    where: { orderId },
    select: { tenantId: true },
  });
  const sellerTenantCount = new Set(rows.map((r) => r.tenantId)).size;
  return { sellerTenantCount, isMultiSeller: sellerTenantCount > 1 };
}

async function sellerMetaForOrderIds(orderIds) {
  if (!orderIds.length) return new Map();
  const lineRows = await prisma.marketplaceOrderLine.findMany({
    where: { orderId: { in: orderIds } },
    select: { orderId: true, tenantId: true },
  });
  const byOrder = new Map();
  for (const row of lineRows) {
    if (!byOrder.has(row.orderId)) byOrder.set(row.orderId, new Set());
    byOrder.get(row.orderId).add(row.tenantId);
  }
  const out = new Map();
  for (const id of orderIds) {
    const set = byOrder.get(id);
    const sellerTenantCount = set ? set.size : 0;
    out.set(id, {
      sellerTenantCount: sellerTenantCount || 0,
      isMultiSeller: sellerTenantCount > 1,
    });
  }
  return out;
}

async function listOrders(req, res) {
  try {
    const { page, limit, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {
      lines: { some: { tenantId: req.tenantId } },
    };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: { where: { tenantId: req.tenantId } },
          deliveries: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.marketplaceOrder.count({ where }),
    ]);

    const metaById = await sellerMetaForOrderIds(orders.map((o) => o.id));
    const data = orders.map((o) => {
      const meta = metaById.get(o.id) || { sellerTenantCount: 0, isMultiSeller: false };
      return {
        ...o,
        sellerLines: o.lines,
        sellerNetTotal: sellerNetSum(o.lines),
        sellerTenantCount: meta.sellerTenantCount,
        isMultiSeller: meta.isMultiSeller,
      };
    });

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('Seller list marketplace orders:', error);
    res.status(500).json({ error: 'Failed to list marketplace orders' });
  }
}

async function getOrder(req, res) {
  try {
    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: req.params.id,
        lines: { some: { tenantId: req.tenantId } },
      },
      include: {
        lines: { where: { tenantId: req.tenantId } },
        deliveries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const meta = await orderSellerMeta(order.id);
    res.json({
      data: {
        ...order,
        sellerLines: order.lines,
        sellerNetTotal: sellerNetSum(order.lines),
        sellerTenantCount: meta.sellerTenantCount,
        isMultiSeller: meta.isMultiSeller,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status: nextStatus, trackingNumber } = req.body;
    if (!nextStatus) return res.status(400).json({ error: 'status is required' });

    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: req.params.id,
        lines: { some: { tenantId: req.tenantId } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus !== 'SUCCESS') {
      return res.status(400).json({ error: 'Order is not paid; fulfillment actions are not available' });
    }
    if (['CANCELLED', 'REFUNDED', 'DISPUTED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot change status for this order' });
    }

    const allowed = STATUS_FLOW[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        error: `Invalid transition: ${order.status} → ${nextStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
      });
    }

    const data = { status: nextStatus };
    if (nextStatus === 'SHIPPED') {
      data.shippedAt = new Date();
      if (trackingNumber && String(trackingNumber).trim()) {
        data.trackingNumber = String(trackingNumber).trim();
      }
    }

    const updated = await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data,
      include: {
        lines: { where: { tenantId: req.tenantId } },
        deliveries: true,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'MARKETPLACE_ORDER_STATUS',
      resource: 'MarketplaceOrder',
      resourceId: order.id,
      newValues: { status: nextStatus, trackingNumber: data.trackingNumber },
      req,
    });

    res.json({
      data: {
        ...updated,
        sellerLines: updated.lines,
        sellerNetTotal: sellerNetSum(updated.lines),
      },
    });
  } catch (error) {
    logger.error('Seller update marketplace order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
}

async function releaseEscrow(req, res) {
  try {
    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: req.params.id,
        lines: { some: { tenantId: req.tenantId } },
      },
      include: { lines: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const tenantIds = [...new Set(order.lines.map((l) => l.tenantId))];
    if (tenantIds.length !== 1) {
      return res.status(400).json({
        error: 'This order includes multiple sellers. Release escrow from the platform admin console.',
      });
    }
    if (tenantIds[0] !== req.tenantId) {
      return res.status(403).json({ error: 'Not your order' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Order must be DELIVERED before releasing escrow' });
    }
    if (order.paymentStatus !== 'SUCCESS') {
      return res.status(400).json({ error: 'Order was not paid' });
    }
    if (order.escrowStatus !== 'HELD') {
      return res.status(400).json({ error: `Escrow is already ${order.escrowStatus}` });
    }

    const updated = await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: { escrowStatus: 'RELEASED' },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'MARKETPLACE_RELEASE_ESCROW',
      resource: 'MarketplaceOrder',
      resourceId: order.id,
      req,
    });

    res.json({ data: updated, message: 'Escrow marked as released (record only — settle payouts per your finance process).' });
  } catch (error) {
    logger.error('Release escrow:', error);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
}

async function openDispute(req, res) {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'Dispute reason is required' });
    }

    const order = await prisma.marketplaceOrder.findFirst({
      where: {
        id: req.params.id,
        lines: { some: { tenantId: req.tenantId } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (['DELIVERED', 'CANCELLED', 'REFUNDED', 'DISPUTED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot open dispute for this order state' });
    }

    const stamp = new Date().toISOString();
    const line = `[DISPUTE ${stamp}] ${String(reason).trim()}`;
    const prev = order.notes ? `${order.notes}\n${line}` : line;

    const updated = await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        status: 'DISPUTED',
        escrowStatus: 'DISPUTED',
        notes: prev,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'MARKETPLACE_DISPUTE',
      resource: 'MarketplaceOrder',
      resourceId: order.id,
      newValues: { reason: String(reason).trim() },
      req,
    });

    res.json({ data: updated, message: 'Order marked as disputed. Platform support may follow up.' });
  } catch (error) {
    logger.error('Marketplace dispute:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
}

module.exports = {
  listOrders,
  getOrder,
  updateOrderStatus,
  releaseEscrow,
  openDispute,
};
