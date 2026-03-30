const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// Logistics KPI Analytics: On-time %, cost/km, agent utilization, success rate
async function getKpiSummary(req, res) {
  try {
    // All deliveries (no date filtering for KPI snapshot)
    const deliveries = await prisma.delivery.findMany({
      where: { tenantId: req.tenantId, status: { in: ['DELIVERED', 'FAILED', 'RETURNED'] } },
      include: { agent: { select: { id: true, firstName: true, lastName: true, totalDeliveries: true } } },
    });

    if (deliveries.length === 0) {
      return res.json({
        data: {
          metrics: [
            { label: 'Total Deliveries', value: 0, format: 'number' },
            { label: 'On-Time Delivery %', value: 0, format: 'percentage' },
            { label: 'Success Rate', value: 0, format: 'percentage' },
          ],
          kpis: {},
          agents: [],
        },
      });
    }

    // On-time delivery
    const onTimeCount = deliveries.filter((d) => {
      if (!d.expectedDeliveryDate || !d.deliveredAt) return false;
      return new Date(d.deliveredAt) <= new Date(d.expectedDeliveryDate);
    }).length;
    const onTimeRate = parseFloat(((onTimeCount / deliveries.length) * 100).toFixed(1));

    // Success rate
    const successCount = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const successRate = parseFloat(((successCount / deliveries.length) * 100).toFixed(1));

    // Cost per km (average delivery fee per km)
    // Simplified: assume avg delivery is ~5km if no distance data available
    const avgDeliveryFee = deliveries.reduce((s, d) => s + parseFloat(d.deliveryFee || 0), 0) / deliveries.length;
    const costPerKm = avgDeliveryFee / 5; // ~ estimate

    // Agent performance
    const agentMetrics = {};
    deliveries.forEach((d) => {
      if (!d.agent) return;
      const agentKey = d.agent.id;
      if (!agentMetrics[agentKey]) {
        agentMetrics[agentKey] = {
          id: d.agent.id,
          name: `${d.agent.firstName} ${d.agent.lastName}`,
          totalDeliveries: 0,
          delivered: 0,
          failed: 0,
          onTime: 0,
        };
      }
      agentMetrics[agentKey].totalDeliveries += 1;
      if (d.status === 'DELIVERED') agentMetrics[agentKey].delivered += 1;
      else if (d.status === 'FAILED') agentMetrics[agentKey].failed += 1;

      if (d.status === 'DELIVERED' && d.expectedDeliveryDate && d.deliveredAt) {
        if (new Date(d.deliveredAt) <= new Date(d.expectedDeliveryDate)) {
          agentMetrics[agentKey].onTime += 1;
        }
      }
    });

    const agentPerformance = Object.values(agentMetrics)
      .map((a) => ({
        ...a,
        successRate: a.totalDeliveries > 0 ? parseFloat(((a.delivered / a.totalDeliveries) * 100).toFixed(1)) : 0,
        onTimeRate: a.delivered > 0 ? parseFloat(((a.onTime / a.delivered) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Average delivery time (pickupAt to deliveredAt)
    const deliveriesWithTime = deliveries
      .filter((d) => d.pickedUpAt && d.deliveredAt)
      .map((d) => {
        const hours = (new Date(d.deliveredAt) - new Date(d.pickedUpAt)) / (1000 * 60 * 60);
        return hours;
      });
    const avgDeliveryTime = deliveriesWithTime.length > 0 ? Math.round(deliveriesWithTime.reduce((s, h) => s + h, 0) / deliveriesWithTime.length) : 0;

    // Capacity utilization (active deliveries count snapshot)
    const activeDeliveries = await prisma.delivery.count({
      where: { tenantId: req.tenantId, status: { in: ['PENDING_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
    });
    const totalAgents = await prisma.logisticsAgent.count({
      where: { status: 'ACTIVE' },
    });
    const capacityUtilization = totalAgents > 0 ? parseFloat(((activeDeliveries / totalAgents) * 100).toFixed(1)) : 0;

    res.json({
      data: {
        metrics: [
          { label: 'Total Deliveries', value: deliveries.length, format: 'number' },
          { label: 'On-Time Delivery %', value: onTimeRate, format: 'percentage' },
          { label: 'Success Rate', value: successRate, format: 'percentage' },
          { label: 'Cost per KM', value: parseFloat(costPerKm.toFixed(2)), format: 'currency' },
          { label: 'Avg Delivery Time', value: avgDeliveryTime, unit: 'hrs', format: 'number' },
          { label: 'Capacity Utilization %', value: capacityUtilization, format: 'percentage' },
        ],
        kpis: {
          totalDeliveries: deliveries.length,
          delivered: successCount,
          failed: deliveries.filter((d) => d.status === 'FAILED').length,
          returned: deliveries.filter((d) => d.status === 'RETURNED').length,
          onTime: onTimeCount,
          onTimeRate,
          successRate,
          avgDeliveryFee: Math.round(avgDeliveryFee),
          costPerKm: parseFloat(costPerKm.toFixed(2)),
          avgDeliveryTime,
          capacityUtilization,
        },
        agents: agentPerformance.slice(0, 20),
      },
    });
  } catch (err) {
    logger.error('Logistics KPI analytics error:', err);
    res.status(500).json({ error: 'Failed to generate logistics analytics' });
  }
}

module.exports = {
  getKpiSummary,
};
