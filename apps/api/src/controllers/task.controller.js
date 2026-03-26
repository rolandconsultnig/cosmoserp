const prisma = require('../config/prisma');

async function list(req, res) {
  try {
    const projectId = req.query?.projectId ? String(req.query.projectId) : null;

    const rows = await prisma.task.findMany({
      where: {
        tenantId: req.tenantId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

async function create(req, res) {
  try {
    const title = String(req.body?.title || '').trim();
    const descriptionRaw = req.body?.description;
    const description = descriptionRaw === null || descriptionRaw === undefined ? null : String(descriptionRaw).trim();
    const projectId = req.body?.projectId ? String(req.body.projectId) : null;
    const assigneeIdRaw = req.body?.assigneeId;
    const assigneeId = assigneeIdRaw ? String(assigneeIdRaw) : null;
    const statusRaw = req.body?.status;
    const status = statusRaw ? String(statusRaw).toUpperCase() : 'TODO';
    const priorityRaw = req.body?.priority;
    const priority = priorityRaw ? String(priorityRaw).toUpperCase() : 'MEDIUM';
    const dueDate = req.body?.dueDate ? new Date(req.body.dueDate) : null;

    if (!title) return res.status(400).json({ error: 'Task title is required' });
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid task priority' });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!project) return res.status(400).json({ error: 'Project not found' });

    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assigneeId, tenantId: req.tenantId, isActive: true, role: 'STAFF' },
        select: { id: true },
      });
      if (!assignee) return res.status(400).json({ error: 'Assignee must be an active STAFF user in this tenant' });
    }

    const task = await prisma.task.create({
      data: {
        tenantId: req.tenantId,
        title,
        description,
        projectId,
        assigneeId,
        status,
        priority,
        dueDate,
        createdById: req.user.id,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.status(201).json({ data: task });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create task' });
  }
}

async function update(req, res) {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const titleRaw = req.body?.title;
    const title = titleRaw === undefined ? undefined : String(titleRaw).trim();
    const descriptionRaw = req.body?.description;
    const description = descriptionRaw === undefined ? undefined : (descriptionRaw === null ? null : String(descriptionRaw).trim());
    const statusRaw = req.body?.status;
    const status = statusRaw === undefined ? undefined : String(statusRaw).toUpperCase();
    const priorityRaw = req.body?.priority;
    const priority = priorityRaw === undefined ? undefined : String(priorityRaw).toUpperCase();
    const assigneeIdRaw = req.body?.assigneeId;
    const assigneeId = assigneeIdRaw === undefined ? undefined : (assigneeIdRaw ? String(assigneeIdRaw) : null);
    const dueDateRaw = req.body?.dueDate;
    const dueDate = dueDateRaw === undefined ? undefined : (dueDateRaw ? new Date(dueDateRaw) : null);

    if (title !== undefined && !title) return res.status(400).json({ error: 'Task title cannot be empty' });
    if (status !== undefined && !['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid task priority' });
    }

    if (assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assigneeId, tenantId: req.tenantId, isActive: true, role: 'STAFF' },
        select: { id: true },
      });
      if (!assignee) return res.status(400).json({ error: 'Assignee must be an active STAFF user in this tenant' });
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: { title, description, status, priority, assigneeId, dueDate },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ data: task });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update task' });
  }
}

async function remove(req, res) {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await prisma.task.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
}

module.exports = { list, create, update, remove };
