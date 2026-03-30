const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

// Payroll Analytics: Cost trends, headcount, salary distribution, turnover
async function getPayrollAnalytics(req, res) {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const toDate = to ? new Date(to) : new Date();

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from or to date' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ error: 'from must be on or before to' });
    }

    // YTD and period payroll
    const [ytdPayroll, periodPayroll] = await Promise.all([
      prisma.payrollRun.aggregate({
        where: { tenantId: req.tenantId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: new Date(fromDate.getFullYear(), 0, 1) } },
        _sum: { totalGross: true, totalNet: true, totalPaye: true, totalPension: true },
      }),
      prisma.payrollRun.aggregate({
        where: { tenantId: req.tenantId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: fromDate, lte: toDate } },
        _sum: { totalGross: true, totalNet: true, totalPaye: true, totalPension: true },
      }),
    ]);

    // Monthly trend
    const monthlyRuns = await prisma.payrollRun.findMany({
      where: { tenantId: req.tenantId, status: { in: ['APPROVED', 'PAID'] }, createdAt: { gte: fromDate, lte: toDate } },
      select: { month: true, year: true, totalGross: true, totalNet: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    const monthlyTrend = monthlyRuns.map((run) => ({
      month: `${run.month}/${run.year.toString().slice(2)}`,
      date: `${run.year}-${String(run.month).padStart(2, '0')}`,
      totalGross: parseFloat(run.totalGross || 0),
      totalNet: parseFloat(run.totalNet || 0),
    }));

    // Headcount by department
    const activeEmployees = await prisma.employee.findMany({
      where: { tenantId: req.tenantId, isActive: true, employmentDate: { lte: toDate } },
      select: { id: true, department: true, grossSalary: true, terminationDate: true },
    });

    const headcountByDept = activeEmployees.reduce((acc, emp) => {
      const dept = emp.department || 'Unassigned';
      if (!acc[dept]) acc[dept] = { count: 0, totalSalary: 0 };
      acc[dept].count += 1;
      acc[dept].totalSalary += parseFloat(emp.grossSalary || 0);
      return acc;
    }, {});

    const headcountBreakdown = Object.entries(headcountByDept).map(([dept, data]) => ({
      department: dept,
      headcount: data.count,
      totalSalary: data.totalSalary,
      avgSalary: data.count > 0 ? Math.round(data.totalSalary / data.count) : 0,
    }));

    // Salary distribution (all active employees)
    const salaryDistribution = activeEmployees
      .map((e) => ({ salary: parseFloat(e.grossSalary || 0) }))
      .sort((a, b) => a.salary - b.salary);
    const minSalary = salaryDistribution[0]?.salary || 0;
    const maxSalary = salaryDistribution[salaryDistribution.length - 1]?.salary || 0;
    const avgSalary = salaryDistribution.length > 0 ? salaryDistribution.reduce((s, e) => s + e.salary, 0) / salaryDistribution.length : 0;

    // Turnover rate (resignations in period)
    const resignations = await prisma.resignation.count({
      where: {
        tenantId: req.tenantId,
        createdAt: { gte: fromDate, lte: toDate },
      },
    });
    const totalHeadcount = activeEmployees.length + resignations;
    const turnoverRate = totalHeadcount > 0 ? parseFloat(((resignations / totalHeadcount) * 100).toFixed(1)) : 0;

    res.json({
      data: {
        period: { from: fromDate.toISOString().split('T')[0], to: toDate.toISOString().split('T')[0] },
        metrics: [
          { label: 'YTD Payroll Cost', value: parseFloat(ytdPayroll._sum.totalGross || 0), format: 'currency' },
          { label: 'Period Net', value: parseFloat(periodPayroll._sum.totalNet || 0), format: 'currency' },
          { label: 'Period PAYE', value: parseFloat(periodPayroll._sum.totalPaye || 0), format: 'currency' },
          { label: 'Active Headcount', value: activeEmployees.length, format: 'number' },
          { label: 'Avg Salary', value: Math.round(avgSalary), format: 'currency' },
          { label: 'Turnover Rate', value: turnoverRate, format: 'percentage' },
        ],
        monthlyTrend,
        headcount: headcountBreakdown,
        salaryStats: {
          min: minSalary,
          max: maxSalary,
          avg: Math.round(avgSalary),
          count: salaryDistribution.length,
        },
        turns: {
          resignations,
          turnoverRate,
        },
      },
    });
  } catch (err) {
    logger.error('HR payroll analytics error:', err);
    res.status(500).json({ error: 'Failed to generate HR analytics' });
  }
}

module.exports = {
  getPayrollAnalytics,
};
