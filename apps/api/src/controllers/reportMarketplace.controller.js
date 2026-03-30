const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// Marketplace Seller Performance: GMV by seller, cancellation/dispute rates
async function getSellerPerformance(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }

    // Orders in period
    const orders = await prisma.marketplaceOrder.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      include: { lines: { select: { tenantId: true, totalAmount: true } } },
    });

    // Group by seller (tenantId)
    const sellerMetrics = {};
    orders.forEach((order) => {
      const sellers = [...new Set(order.lines.map((l) => l.tenantId))];
      sellers.forEach((sellerId) => {
        if (!sellerMetrics[sellerId]) {
          sellerMetrics[sellerId] = {
            sellerId,
            gmv: 0,
            orderCount: 0,
            cancelled: 0,
            disputed: 0,
            delivered: 0,
          };
        }
        const sellerLines = order.lines.filter((l) => l.tenantId === sellerId);
        sellerMetrics[sellerId].gmv += sellerLines.reduce((s, l) => s + parseFloat(l.totalAmount || 0), 0);
        sellerMetrics[sellerId].orderCount += 1;
        if (order.status === 'CANCELLED') sellerMetrics[sellerId].cancelled += 1;
        if (order.status === 'DISPUTED') sellerMetrics[sellerId].disputed += 1;
        if (order.status === 'DELIVERED') sellerMetrics[sellerId].delivered += 1;
      });
    });

    // Calculate rates
    const sellerPerformance = Object.values(sellerMetrics)
      .map((s) => ({
        sellerId: s.sellerId,
        gmv: Math.round(s.gmv),
        orderCount: s.orderCount,
        delivered: s.delivered,
        cancelled: s.cancelled,
        disputed: s.disputed,
        cancellationRate: s.orderCount > 0 ? parseFloat(((s.cancelled / s.orderCount) * 100).toFixed(1)) : 0,
        disputeRate: s.orderCount > 0 ? parseFloat(((s.disputed / s.orderCount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.gmv - a.gmv);

    // Fetch seller tenant names
    const sellerIds = sellerPerformance.map((s) => s.sellerId);
    const sellers = await prisma.tenant.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, tradingName: true, businessName: true },
    });
    const sellerNameMap = Object.fromEntries(sellers.map((s) => [s.id, s.tradingName || s.businessName]));

    const sellerList = sellerPerformance
      .map((s) => ({ ...s, name: sellerNameMap[s.sellerId] || s.sellerId }))
      .slice(0, 20);

    const totalGmv = sellerPerformance.reduce((s, x) => s + x.gmv, 0);

    res.json({
      data: {
        period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
        metrics: [
          { label: 'Total GMV', value: Math.round(totalGmv), format: 'currency' },
          { label: 'Seller Count', value: sellerPerformance.length, format: 'number' },
          { label: 'Total Orders', value: orders.length, format: 'number' },
          { label: 'Avg GMV/Seller', value: Math.round(totalGmv / (sellerPerformance.length || 1)), format: 'currency' },
        ],
        sellers: sellerList,
      },
    });
  } catch (err) {
    logger.error('Marketplace seller performance error:', err);
    res.status(500).json({ error: 'Failed to generate marketplace seller analytics' });
  }
}

// Marketplace Buyer Behavior: Repeat rate, category preferences, AOV
async function getBuyerBehavior(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }

    // Orders by buyer
    const orders = await prisma.marketplaceOrder.findMany({
      where: { createdAt: { gte: fromDate, lte: toDate } },
      select: {
        id: true,
        buyerEmail: true,
        totalAmount: true,
        status: true,
        lines: { select: { productName: true } },
      },
    });

    // Buyer metrics
    const buyerMetrics = {};
    orders.forEach((order) => {
      if (!buyerMetrics[order.buyerEmail]) {
        buyerMetrics[order.buyerEmail] = {
          email: order.buyerEmail,
          orderCount: 0,
          totalSpent: 0,
          categories: {},
        };
      }
      buyerMetrics[order.buyerEmail].orderCount += 1;
      buyerMetrics[order.buyerEmail].totalSpent += parseFloat(order.totalAmount || 0);
      order.lines.forEach((line) => {
        const cat = line.productName.split(' ')[0] || 'Other'; // Rough category from product name
        buyerMetrics[order.buyerEmail].categories[cat] = (buyerMetrics[order.buyerEmail].categories[cat] || 0) + 1;
      });
    });

    // Calculate repeat rate
    const repeatBuyers = Object.values(buyerMetrics).filter((b) => b.orderCount >= 2);
    const uniqueBuyers = Object.values(buyerMetrics).length;
    const repeatRate = uniqueBuyers > 0 ? parseFloat(((repeatBuyers.length / uniqueBuyers) * 100).toFixed(1)) : 0;

    // Category preferences (most popular)
    const allCategories = {};
    Object.values(buyerMetrics).forEach((buyer) => {
      Object.entries(buyer.categories).forEach(([cat, count]) => {
        allCategories[cat] = (allCategories[cat] || 0) + count;
      });
    });
    const topCategories = Object.entries(allCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ category: name, preference: count }));

    // AOV (average order value)
    const totalSpent = Object.values(buyerMetrics).reduce((s, b) => s + b.totalSpent, 0);
    const totalOrders = orders.length;
    const aov = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;

    // Top buyers by spend
    const topBuyers = Object.values(buyerMetrics)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    res.json({
      data: {
        period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
        metrics: [
          { label: 'Unique Buyers', value: uniqueBuyers, format: 'number' },
          { label: 'Repeat Buyer Rate', value: repeatRate, format: 'percentage' },
          { label: 'Total Orders', value: totalOrders, format: 'number' },
          { label: 'Avg Order Value', value: aov, format: 'currency' },
          { label: 'Total Revenue', value: Math.round(totalSpent), format: 'currency' },
        ],
        repeatStats: {
          uniqueBuyers,
          repeatBuyers: repeatBuyers.length,
          repeatRate,
        },
        categoryPreferences: topCategories,
        topBuyers: topBuyers.map((b) => ({
          email: b.email,
          orderCount: b.orderCount,
          totalSpent: Math.round(b.totalSpent),
          avgOrderValue: Math.round(b.totalSpent / b.orderCount),
        })),
      },
    });
  } catch (err) {
    logger.error('Marketplace buyer behavior error:', err);
    res.status(500).json({ error: 'Failed to generate marketplace buyer analytics' });
  }
}

module.exports = {
  getSellerPerformance,
  getBuyerBehavior,
};
