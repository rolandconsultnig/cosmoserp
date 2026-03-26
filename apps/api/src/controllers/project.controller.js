const prisma = require('../config/prisma');

async function list(req, res) {
  try {
    const rows = await prisma.project.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
}

async function create(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const codeRaw = req.body?.code;
    const code = codeRaw === null || codeRaw === undefined ? null : String(codeRaw).trim();
    const descriptionRaw = req.body?.description;
    const description = descriptionRaw === null || descriptionRaw === undefined ? null : String(descriptionRaw).trim();
    const statusRaw = req.body?.status;
    const status = statusRaw ? String(statusRaw).toUpperCase() : 'ACTIVE';
    const startDate = req.body?.startDate ? new Date(req.body.startDate) : null;
    const endDate = req.body?.endDate ? new Date(req.body.endDate) : null;

    if (!name) return res.status(400).json({ error: 'Project name is required' });
    if (!['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }

    const project = await prisma.project.create({
      data: {
        tenantId: req.tenantId,
        name,
        code,
        description,
        status,
        startDate,
        endDate,
        createdById: req.user.id,
        members: {
          create: {
            tenantId: req.tenantId,
            userId: req.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({ data: project });
  } catch (e) {
    if (String(e?.code) === 'P2002') {
      return res.status(409).json({ error: 'Project name/code already exists' });
    }
    res.status(500).json({ error: 'Failed to create project' });
  }
}

async function update(req, res) {
  try {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const nameRaw = req.body?.name;
    const name = nameRaw === undefined ? undefined : String(nameRaw).trim();
    const codeRaw = req.body?.code;
    const code = codeRaw === undefined ? undefined : (codeRaw === null ? null : String(codeRaw).trim());
    const descriptionRaw = req.body?.description;
    const description = descriptionRaw === undefined ? undefined : (descriptionRaw === null ? null : String(descriptionRaw).trim());
    const statusRaw = req.body?.status;
    const status = statusRaw === undefined ? undefined : String(statusRaw).toUpperCase();
    const startDateRaw = req.body?.startDate;
    const startDate = startDateRaw === undefined ? undefined : (startDateRaw ? new Date(startDateRaw) : null);
    const endDateRaw = req.body?.endDate;
    const endDate = endDateRaw === undefined ? undefined : (endDateRaw ? new Date(endDateRaw) : null);

    if (name !== undefined && !name) return res.status(400).json({ error: 'Project name cannot be empty' });
    if (status !== undefined && !['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: { name, code, description, status, startDate, endDate },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true } },
      },
    });

    res.json({ data: project });
  } catch (e) {
    if (String(e?.code) === 'P2002') {
      return res.status(409).json({ error: 'Project name/code already exists' });
    }
    res.status(500).json({ error: 'Failed to update project' });
  }
}

async function remove(req, res) {
  try {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    await prisma.project.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
}

module.exports = { list, create, update, remove };
