const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// Inventory Movement Analytics: Stock trends, ABC analysis, dead stock, turnover
async function getMovementAnalytics(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();
    const deadStockDaysThreshold = 90;
    const deadStockDate = new Date(toDate.getTime() - deadStockDaysThreshold * 24 * 60 * 60 * 1000);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'from must be on or before to' });
    }

    // All products with current stock
    const products = await prisma.product.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      include: { stockLevels: true },
    });

    // Movement counts by product
    const movements = await prisma.stockMovement.findMany({
      where: { tenantId: req.tenantId, createdAt: { gte: fromDate, lte: toDate } },
      select: { productId: true, createdAt: true, quantity: true },
    });

    const movementByProduct = movements.reduce((acc, m) => {
      if (!acc[m.productId]) acc[m.productId] = { count: 0, qty: 0 };
      acc[m.productId].count += 1;
      acc[m.productId].qty += m.quantity || 0;
      return acc;
    }, {});

    // Stockturn ratio & ABC analysis
    const productMetrics = products.map((p) => {
      const totalQty = p.stockLevels.reduce((s, sl) => s + sl.quantity, 0);
      const movement = movementByProduct[p.id] || { count: 0, qty: 0 };
      const costValue = parseFloat(p.costPrice || 0) * totalQty;
      const stockturn = costValue > 0 ? (Math.abs(movement.qty) / totalQty).toFixed(2) : 0;
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        totalQty,
        movementCount: movement.count,
        costValue,
        stockturn,
        costPrice: parseFloat(p.costPrice || 0),
      };
    });

    // ABC Analysis (Pareto) - sort by value
    const sorted = [...productMetrics].sort((a, b) => b.costValue - a.costValue);
    const totalValue = sorted.reduce((s, p) => s + p.costValue, 0);
    let cumulative = 0;
    const abcAnalysis = sorted.map((p) => {
      cumulative += p.costValue;
      const pct = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;
      let category;
      if (pct <= 80) category = 'A'; // 80% of value
      else if (pct <= 95) category = 'B'; // 15% of value
      else category = 'C'; // 5% of value
      return { ...p, abcCategory: category, cumulativePct: Math.round(pct) };
    });

    // Slow movers (low movement, high stock) and fast movers (high movement)
    const slowMovers = sorted
      .filter((p) => p.totalQty > 10 && p.movementCount < 3)
      .slice(0, 10)
      .map((p) => ({ ...p, issue: 'Low movement, high stock' }));

    const fastMovers = sorted
      .filter((p) => p.movementCount > 10)
      .sort((a, b) => b.movementCount - a.movementCount)
      .slice(0, 10)
      .map((p) => ({ ...p, issue: 'High movement' }));

    // Dead stock (no movement in 90+ days)
    const lastMovements = await prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId: req.tenantId, createdAt: { lte: toDate } },
      _max: { createdAt: true },
    });

    const lastMovementByProduct = Object.fromEntries(lastMovements.map((m) => [m.productId, m._max.createdAt]));
    const deadStock = products
      .filter((p) => {
        const lastMove = lastMovementByProduct[p.id];
        return !lastMove || lastMove < deadStockDate;
      })
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        totalQty: p.stockLevels.reduce((s, sl) => s + sl.quantity, 0),
        costPrice: parseFloat(p.costPrice || 0),
        lastMovement: lastMovementByProduct[p.id] || null,
      }));

    // Monthly movement trend
    const monthlyMovements = movements.reduce((acc, m) => {
      const key = m.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    }, {});

    const trend = Object.entries(monthlyMovements)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, movementCount: count }));

    res.json({
      data: {
        period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
        metrics: [
          { label: 'Total Products', value: products.length, format: 'number' },
          { label: 'Total Stock Value', value: Math.round(totalValue), format: 'currency' },
          { label: 'Slow Movers', value: slowMovers.length, format: 'number' },
          { label: 'Fast Movers', value: fastMovers.length, format: 'number' },
          { label: 'Dead Stock (90d+)', value: deadStock.length, format: 'number' },
        ],
        abc: {
          analysis: abcAnalysis.slice(0, 20), // Top 20
          totalValue,
        },
        slowMovers: slowMovers.slice(0, 10),
        fastMovers: fastMovers.slice(0, 10),
        deadStock: deadStock.slice(0, 10),
        trend,
      },
    });
  } catch (err) {
    logger.error('Inventory movement analytics error:', err);
    res.status(500).json({ error: 'Failed to generate inventory analytics' });
  }
}

module.exports = {
  getMovementAnalytics,
};
