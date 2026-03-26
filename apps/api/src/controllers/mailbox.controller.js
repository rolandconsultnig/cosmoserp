const prisma = require('../config/prisma');

async function listUsers(req, res) {
  try {
    const rows = await prisma.user.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load users' });
  }
}

async function inbox(req, res) {
  try {
    const rows = await prisma.intranetMessage.findMany({
      where: { tenantId: req.tenantId, recipientId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load inbox' });
  }
}

async function sent(req, res) {
  try {
    const rows = await prisma.intranetMessage.findMany({
      where: { tenantId: req.tenantId, senderId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load sent messages' });
  }
}

async function send(req, res) {
  try {
    const recipientId = String(req.body?.recipientId || '').trim();
    const subject = String(req.body?.subject || '').trim();
    const body = String(req.body?.body || '').trim();

    if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
    if (!subject) return res.status(400).json({ error: 'subject is required' });
    if (!body) return res.status(400).json({ error: 'body is required' });
    if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, tenantId: req.tenantId, isActive: true },
      select: { id: true },
    });
    if (!recipient) return res.status(400).json({ error: 'Recipient not found' });

    const msg = await prisma.intranetMessage.create({
      data: {
        tenantId: req.tenantId,
        senderId: req.user.id,
        recipientId: recipient.id,
        subject,
        body,
      },
    });
    res.status(201).json({ data: msg });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send message' });
  }
}

async function markRead(req, res) {
  try {
    const id = String(req.params.id);
    const existing = await prisma.intranetMessage.findFirst({
      where: { id, tenantId: req.tenantId, recipientId: req.user.id },
      select: { id: true, readAt: true },
    });
    if (!existing) return res.status(404).json({ error: 'Message not found' });
    const updated = await prisma.intranetMessage.update({
      where: { id: existing.id },
      data: { readAt: existing.readAt || new Date() },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
}

module.exports = {
  listUsers,
  inbox,
  sent,
  send,
  markRead,
};
