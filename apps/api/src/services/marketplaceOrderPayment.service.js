const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

/**
 * Marks a marketplace order paid and decrements stock / bumps soldCount.
 * Idempotent: only the first caller wins (paymentStatus !== SUCCESS → SUCCESS).
 * Safe for concurrent verifyPayment + charge.success webhook.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} orderId
 * @returns {Promise<{ applied: boolean }>}
 */
async function finalizePaidMarketplaceOrderInTx(tx, orderId) {
  const updated = await tx.marketplaceOrder.updateMany({
    where: { id: orderId, paymentStatus: { not: 'SUCCESS' } },
    data: {
      paymentStatus: 'SUCCESS',
      status: 'CONFIRMED',
      escrowStatus: 'HELD',
      paidAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return { applied: false };
  }

  const lines = await tx.marketplaceOrderLine.findMany({ where: { orderId } });
  const sellerGroups = lines.reduce((acc, l) => {
    acc[l.tenantId] = acc[l.tenantId] || [];
    acc[l.tenantId].push(l);
    return acc;
  }, {});

  for (const [, sellerLines] of Object.entries(sellerGroups)) {
    const stockUpdates = sellerLines.map((l) =>
      tx.stockLevel.updateMany({
        where: { product: { marketplaceListings: { some: { id: l.listingId } } } },
        data: { quantity: { decrement: l.quantity } },
      }),
    );
    await Promise.all(stockUpdates);

    const qtyByListing = new Map();
    for (const l of sellerLines) {
      qtyByListing.set(l.listingId, (qtyByListing.get(l.listingId) || 0) + l.quantity);
    }
    for (const [listingId, qty] of qtyByListing) {
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { soldCount: { increment: qty } },
      });
    }
  }

  logger.info(`Marketplace order ${orderId} finalized as paid (stock updated)`);
  return { applied: true };
}

/**
 * @param {string} orderId
 * @returns {Promise<{ applied: boolean }>}
 */
async function finalizePaidMarketplaceOrder(orderId) {
  return prisma.$transaction((tx) => finalizePaidMarketplaceOrderInTx(tx, orderId));
}

module.exports = {
  finalizePaidMarketplaceOrder,
  finalizePaidMarketplaceOrderInTx,
};
