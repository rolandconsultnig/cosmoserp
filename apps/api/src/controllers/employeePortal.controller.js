const prisma = require('../config/prisma');

async function me(req, res) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.employeePortal.tenantId },
      select: { tradingName: true, businessName: true },
    });
    res.json({
      data: {
        ...req.employeePortal,
        tenantName: tenant?.tradingName || tenant?.businessName,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function payslips(req, res) {
  try {
    const data = await prisma.payslip.findMany({
      where: { employeeId: req.employeePortal.id },
      orderBy: { createdAt: 'desc' },
      take: 48,
      include: {
        payrollRun: {
          select: { period: true, status: true, year: true, month: true },
        },
      },
    });
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load payslips' });
  }
}

module.exports = { me, payslips };
