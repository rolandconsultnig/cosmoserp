const prisma = require('../config/prisma');

function now() {
  return new Date();
}

function isActiveForViewing(a) {
  const n = now();
  if (a.publishAt && new Date(a.publishAt) > n) return false;
  if (a.expiresAt && new Date(a.expiresAt) <= n) return false;
  return true;
}

async function list(req, res) {
  try {
    const includeAll = String(req.query?.includeAll || '').toLowerCase() === 'true';

    const rows = await prisma.announcement.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        acks: {
          where: { userId: req.user.id },
          select: { id: true, readAt: true },
        },
      },
    });

    const active = includeAll ? rows : rows.filter(isActiveForViewing);

    const data = active
      .filter((a) => {
        if (a.audienceType === 'ALL') return true;
        if (a.audienceType === 'ROLE') return a.audienceRole === req.user.role;
        if (a.audienceType === 'DEPARTMENT') {
          // CosmosERP currently stores employee.department as string, so we cannot reliably map user->departmentId.
          // For now: only show department announcements when departmentId is not set (fallback), or when userIds includes user.
          // Proper department targeting will be wired once Employee->Department relation is introduced.
          if (!a.departmentId) return true;
          return false;
        }
        if (a.audienceType === 'USERS') return Array.isArray(a.userIds) && a.userIds.includes(req.user.id);
        return false;
      })
      .map((a) => ({
        ...a,
        isRead: (a.acks || []).length > 0,
        readAt: (a.acks || [])[0]?.readAt || null,
        acks: undefined,
      }));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
}

async function create(req, res) {
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const audienceType = String(req.body?.audienceType || 'ALL').toUpperCase();
    const audienceRole = req.body?.audienceRole ? String(req.body.audienceRole).toUpperCase() : null;
    const departmentId = req.body?.departmentId ? String(req.body.departmentId) : null;
    const userIds = Array.isArray(req.body?.userIds) ? req.body.userIds.map(String) : [];
    const publishAt = req.body?.publishAt ? new Date(req.body.publishAt) : null;
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    if (!['ALL', 'ROLE', 'DEPARTMENT', 'USERS'].includes(audienceType)) {
      return res.status(400).json({ error: 'Invalid audience type' });
    }
    if (audienceType === 'ROLE' && !audienceRole) {
      return res.status(400).json({ error: 'audienceRole is required for ROLE announcements' });
    }
    if (audienceType === 'DEPARTMENT' && !departmentId) {
      return res.status(400).json({ error: 'departmentId is required for DEPARTMENT announcements' });
    }
    if (audienceType === 'USERS' && userIds.length === 0) {
      return res.status(400).json({ error: 'userIds is required for USERS announcements' });
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId: req.tenantId },
        select: { id: true },
      });
      if (!dept) return res.status(400).json({ error: 'Department not found' });
    }

    const ann = await prisma.announcement.create({
      data: {
        tenantId: req.tenantId,
        title,
        body,
        audienceType,
        audienceRole,
        departmentId,
        userIds,
        publishAt,
        expiresAt,
        createdById: req.user.id,
      },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.status(201).json({ data: ann });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
}

async function update(req, res) {
  try {
    const existing = await prisma.announcement.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const titleRaw = req.body?.title;
    const bodyRaw = req.body?.body;
    const title = titleRaw === undefined ? undefined : String(titleRaw).trim();
    const body = bodyRaw === undefined ? undefined : String(bodyRaw).trim();

    if (title !== undefined && !title) return res.status(400).json({ error: 'Title cannot be empty' });
    if (body !== undefined && !body) return res.status(400).json({ error: 'Body cannot be empty' });

    const audienceTypeRaw = req.body?.audienceType;
    const audienceType = audienceTypeRaw === undefined ? undefined : String(audienceTypeRaw).toUpperCase();
    const audienceRoleRaw = req.body?.audienceRole;
    const audienceRole = audienceRoleRaw === undefined ? undefined : (audienceRoleRaw ? String(audienceRoleRaw).toUpperCase() : null);
    const departmentIdRaw = req.body?.departmentId;
    const departmentId = departmentIdRaw === undefined ? undefined : (departmentIdRaw ? String(departmentIdRaw) : null);
    const userIdsRaw = req.body?.userIds;
    const userIds = userIdsRaw === undefined ? undefined : (Array.isArray(userIdsRaw) ? userIdsRaw.map(String) : []);
    const publishAtRaw = req.body?.publishAt;
    const publishAt = publishAtRaw === undefined ? undefined : (publishAtRaw ? new Date(publishAtRaw) : null);
    const expiresAtRaw = req.body?.expiresAt;
    const expiresAt = expiresAtRaw === undefined ? undefined : (expiresAtRaw ? new Date(expiresAtRaw) : null);

    if (audienceType !== undefined && !['ALL', 'ROLE', 'DEPARTMENT', 'USERS'].includes(audienceType)) {
      return res.status(400).json({ error: 'Invalid audience type' });
    }

    const updated = await prisma.announcement.update({
      where: { id: existing.id },
      data: { title, body, audienceType, audienceRole, departmentId, userIds, publishAt, expiresAt },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
}

async function remove(req, res) {
  try {
    const existing = await prisma.announcement.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    await prisma.announcement.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
}

async function ack(req, res) {
  try {
    const ann = await prisma.announcement.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true, tenantId: true },
    });
    if (!ann) return res.status(404).json({ error: 'Announcement not found' });

    const row = await prisma.announcementAck.upsert({
      where: { announcementId_userId: { announcementId: ann.id, userId: req.user.id } },
      update: { readAt: new Date() },
      create: { tenantId: req.tenantId, announcementId: ann.id, userId: req.user.id, readAt: new Date() },
    });

    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ error: 'Failed to acknowledge announcement' });
  }
}

module.exports = { list, create, update, remove, ack };
