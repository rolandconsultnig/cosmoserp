const prisma = require('../config/prisma');

async function authenticateEmployeePortal(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Portal token required (Authorization: Bearer …)' });
    }
    const token = auth.split(' ')[1]?.trim();
    if (!token) return res.status(401).json({ error: 'Invalid token' });

    const employee = await prisma.employee.findFirst({
      where: {
        portalAccessToken: token,
        portalAccessTokenExpiresAt: { gt: new Date() },
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        staffId: true,
        email: true,
      },
    });
    if (!employee) {
      return res.status(401).json({ error: 'Invalid or expired portal access. Ask HR for a new link.' });
    }
    req.employeePortal = employee;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Portal auth failed' });
  }
}

module.exports = { authenticateEmployeePortal };
