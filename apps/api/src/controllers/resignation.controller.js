const prisma = require('../config/prisma');
const { createAuditLog } = require('../middleware/audit.middleware');

const STATUSES = ['SUBMITTED', 'ACKNOWLEDGED', 'WITHDRAWN'];

async function list(req, res) {
  try {
    const status = req.query?.status ? String(req.query.status).toUpperCase() : null;
    const where = { tenantId: req.tenantId };
    if (status && STATUSES.includes(status)) where.status = status;

    const rows = await prisma.resignation.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
            employmentDate: true,
            isActive: true,
            terminationDate: true,
          },
        },
        decidedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load resignations' });
  }
}

async function decide(req, res) {
  try {
    const id = String(req.params.id);
    const action = String(req.body?.action || '').toLowerCase();
    const deactivateEmployee = req.body?.deactivateEmployee === true;

    const row = await prisma.resignation.findFirst({
      where: { id, tenantId: req.tenantId },
      include: { employee: true },
    });
    if (!row) return res.status(404).json({ error: 'Resignation not found' });
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Only submitted resignations can be decided' });
    }

    if (action === 'withdraw') {
      const updated = await prisma.resignation.update({
        where: { id: row.id },
        data: {
          status: 'WITHDRAWN',
          decidedAt: new Date(),
          decidedById: req.user.id,
        },
      });
      await createAuditLog({
        tenantId: req.tenantId,
        userId: req.user.id,
        action: 'RESIGNATION_WITHDRAWN',
        resource: 'Resignation',
        resourceId: row.id,
        newValues: { status: 'WITHDRAWN' },
        req,
      });
      return res.json({ data: updated });
    }

    if (action !== 'acknowledge') {
      return res.status(400).json({ error: 'action must be "acknowledge" or "withdraw"' });
    }

    const data = {
      status: 'ACKNOWLEDGED',
      decidedAt: new Date(),
      decidedById: req.user.id,
    };
    if (deactivateEmployee) {
      const term = row.lastWorkingDate || new Date();
      data.employee = {
        update: {
          terminationDate: term,
          isActive: false,
        },
      };
    }

    const updated = await prisma.resignation.update({
      where: { id: row.id },
      data,
      include: {
        employee: {
          select: {
            id: true,
            staffId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
            employmentDate: true,
            isActive: true,
            terminationDate: true,
          },
        },
        decidedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'RESIGNATION_ACKNOWLEDGED',
      resource: 'Resignation',
      resourceId: row.id,
      newValues: { status: 'ACKNOWLEDGED', deactivateEmployee },
      req,
    });

    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update resignation' });
  }
}

module.exports = {
  list,
  decide,
};
