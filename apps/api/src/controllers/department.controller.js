const prisma = require('../config/prisma');

async function list(req, res) {
  try {
    const rows = await prisma.department.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { name: 'asc' },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

async function create(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const codeRaw = req.body?.code;
    const code = codeRaw === null || codeRaw === undefined ? undefined : String(codeRaw).trim();
    const managerIdRaw = req.body?.managerId;
    const managerId = managerIdRaw === null || managerIdRaw === undefined || managerIdRaw === '' ? null : String(managerIdRaw);

    if (!name) return res.status(400).json({ error: 'Department name is required' });

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, tenantId: req.tenantId, isActive: true },
        select: { id: true },
      });
      if (!manager) return res.status(400).json({ error: 'Manager not found' });
    }

    const dept = await prisma.department.create({
      data: {
        tenantId: req.tenantId,
        name,
        code: code || null,
        managerId,
      },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    res.status(201).json({ data: dept });
  } catch (e) {
    if (String(e?.code) === 'P2002') {
      return res.status(409).json({ error: 'Department name/code already exists' });
    }
    res.status(500).json({ error: 'Failed to create department' });
  }
}

async function update(req, res) {
  try {
    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Department not found' });

    const nameRaw = req.body?.name;
    const name = nameRaw === undefined ? undefined : String(nameRaw).trim();
    const codeRaw = req.body?.code;
    const code = codeRaw === undefined ? undefined : (codeRaw === null ? null : String(codeRaw).trim());
    const managerIdRaw = req.body?.managerId;
    const managerId = managerIdRaw === undefined ? undefined : (managerIdRaw ? String(managerIdRaw) : null);

    if (name !== undefined && !name) return res.status(400).json({ error: 'Department name cannot be empty' });

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, tenantId: req.tenantId, isActive: true },
        select: { id: true },
      });
      if (!manager) return res.status(400).json({ error: 'Manager not found' });
    }

    const dept = await prisma.department.update({
      where: { id: existing.id },
      data: { name, code, managerId },
      include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    res.json({ data: dept });
  } catch (e) {
    if (String(e?.code) === 'P2002') {
      return res.status(409).json({ error: 'Department name/code already exists' });
    }
    res.status(500).json({ error: 'Failed to update department' });
  }
}

async function remove(req, res) {
  try {
    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Department not found' });

    await prisma.department.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
}

module.exports = { list, create, update, remove };
