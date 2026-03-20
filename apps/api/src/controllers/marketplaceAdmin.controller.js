const prisma = require('../config/prisma');
const paystackTransfer = require('../services/paystackTransfer.service');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');

async function listEscrowOrders(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (Math.max(1, page) - 1) * limit;

    const where = {
      paymentStatus: 'SUCCESS',
      escrowStatus: 'HELD',
      status: 'DELIVERED',
    };

    const [orders, total] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where,
        include: {
          lines: { select: { tenantId: true, sellerNet: true, productName: true } },
          sellerPayouts: true,
        },
        orderBy: { deliveredAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.marketplaceOrder.count({ where }),
    ]);

    const data = orders.map((o) => {
      const tenantIds = [...new Set(o.lines.map((l) => l.tenantId))];
      const sellerTotals = {};
      for (const l of o.lines) {
        sellerTotals[l.tenantId] = (sellerTotals[l.tenantId] || 0) + parseFloat(l.sellerNet || 0);
      }
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        buyerEmail: o.buyerEmail,
        totalAmount: o.totalAmount,
        deliveredAt: o.deliveredAt,
        lines: o.lines,
        sellerPayouts: o.sellerPayouts,
        sellerTenantCount: tenantIds.length,
        sellerTotals,
        isMultiSeller: tenantIds.length > 1,
      };
    });

    res.json({ data, page, limit, total });
  } catch (e) {
    logger.error('listEscrowOrders', e);
    res.status(500).json({ error: 'Failed to list orders' });
  }
}

async function releaseEscrowAdmin(req, res) {
  try {
    const { id } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    const order = await prisma.marketplaceOrder.findUnique({
      where: { id },
      include: { lines: { select: { tenantId: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus !== 'SUCCESS') return res.status(400).json({ error: 'Order not paid' });
    if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'Order must be DELIVERED' });
    if (order.escrowStatus !== 'HELD') {
      return res.status(400).json({ error: `Escrow is already ${order.escrowStatus}` });
    }

    const stamp = new Date().toISOString();
    const auditLine = note
      ? `\n[ADMIN_ESCROW_RELEASE ${stamp}] ${note}`
      : `\n[ADMIN_ESCROW_RELEASE ${stamp}]`;

    const updated = await prisma.marketplaceOrder.update({
      where: { id },
      data: {
        escrowStatus: 'RELEASED',
        notes: order.notes ? `${order.notes}${auditLine}` : auditLine.trim(),
      },
    });

    await createAuditLog({
      adminUserId: req.admin.id,
      action: 'MARKETPLACE_ADMIN_RELEASE_ESCROW',
      resource: 'MarketplaceOrder',
      resourceId: id,
      newValues: { note: note || undefined },
      req,
    });

    res.json({ data: updated, message: 'Escrow released' });
  } catch (e) {
    logger.error('releaseEscrowAdmin', e);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
}

async function executePaystackPayouts(req, res) {
  try {
    const { id } = req.params;
    if (!paystackTransfer.isConfigured()) {
      return res.status(503).json({ error: 'Paystack transfers not configured (PAYSTACK_SECRET_KEY)' });
    }

    const order = await prisma.marketplaceOrder.findUnique({
      where: { id },
      include: { lines: true, sellerPayouts: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const perTenant = {};
    for (const l of order.lines) {
      perTenant[l.tenantId] = (perTenant[l.tenantId] || 0) + parseFloat(l.sellerNet || 0);
    }

    const results = [];

    for (const [tenantId, amount] of Object.entries(perTenant)) {
      if (amount < 0.01) continue;

      const terminalPayout = order.sellerPayouts?.find(
        (p) => p.tenantId === tenantId && ['SUCCESS', 'SUBMITTED', 'REVERSED'].includes(p.status),
      );
      if (terminalPayout) {
        results.push({ tenantId, amount, skipped: true, reason: `payout_${terminalPayout.status.toLowerCase()}` });
        continue;
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) {
        results.push({ tenantId, amount, error: 'tenant_not_found' });
        continue;
      }

      let payoutRow = await prisma.marketplaceSellerPayout.findFirst({
        where: { orderId: order.id, tenantId },
        orderBy: { createdAt: 'desc' },
      });
      if (!payoutRow) {
        payoutRow = await prisma.marketplaceSellerPayout.create({
          data: { orderId: order.id, tenantId, amount, status: 'PENDING' },
        });
      }

      try {
        const tx = await paystackTransfer.transferToTenant(tenant, amount, {
          orderId: order.id,
          orderNumber: order.orderNumber,
          tenantId,
        });
        const ok = ['success', 'pending', 'otp'].includes(String(tx.status || '').toLowerCase());
        await prisma.marketplaceSellerPayout.update({
          where: { id: payoutRow.id },
          data: {
            status: ok ? 'SUBMITTED' : 'FAILED',
            paystackReference: tx.reference || null,
            paystackTransferCode: tx.transfer_code || null,
            errorMessage: ok ? null : JSON.stringify(tx.raw || {}).slice(0, 500),
          },
        });
        results.push({ tenantId, amount, paystack: tx });
      } catch (e) {
        logger.error('Paystack payout', e);
        await prisma.marketplaceSellerPayout.update({
          where: { id: payoutRow.id },
          data: { status: 'FAILED', errorMessage: (e.message || 'error').slice(0, 500) },
        });
        results.push({ tenantId, amount, error: e.message });
      }
    }

    await createAuditLog({
      adminUserId: req.admin.id,
      action: 'MARKETPLACE_ADMIN_PAYOUT_PAYSTACK',
      resource: 'MarketplaceOrder',
      resourceId: id,
      newValues: { payoutAttemptCount: results.length },
      req,
    });

    res.json({ data: { orderId: order.id, results } });
  } catch (e) {
    logger.error('executePaystackPayouts', e);
    res.status(500).json({ error: 'Payout run failed' });
  }
}

module.exports = {
  listEscrowOrders,
  releaseEscrowAdmin,
  executePaystackPayouts,
};
