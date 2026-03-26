const prisma = require('../config/prisma');

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

async function list(req, res) {
  try {
    const statusRaw = req.query?.status ? String(req.query.status).toUpperCase() : null;
    const where = { tenantId: req.tenantId };
    if (statusRaw && STATUSES.includes(statusRaw)) {
      where.status = statusRaw;
    }

    const rows = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffId: true,
            department: true,
            jobTitle: true,
          },
        },
        decidedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load leave requests' });
  }
}

async function decide(req, res) {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || '').toLowerCase();

    const row = await prisma.leaveRequest.findFirst({
      where: { id, tenantId: req.tenantId },
    });
    if (!row) return res.status(404).json({ error: 'Leave request not found' });
    if (row.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be decided' });
    }

    const status = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : null;
    if (!status) {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        decidedAt: new Date(),
        decidedById: req.user.id,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffId: true,
            department: true,
            jobTitle: true,
          },
        },
        decidedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update leave request' });
  }
}

module.exports = {
  list,
  decide,
};
