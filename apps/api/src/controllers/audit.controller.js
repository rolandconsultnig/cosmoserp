const prisma = require('../config/prisma');

/**
 * Tenant-scoped audit trail (Owner / Admin).
 */
async function listTenant(req, res) {
  try {
    const resource = req.query.resource ? String(req.query.resource).trim() : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);

    const where = { tenantId: req.tenantId };
    if (resource) {
      where.resource = resource;
    }

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load audit log' });
  }
}

module.exports = {
  listTenant,
};
