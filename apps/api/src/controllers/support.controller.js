const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

function genTicketNumber(tenantId) {
  const ts = Date.now().toString(36).toUpperCase();
  return `TKT-${ts}`;
}

// ── TICKETS ─────────────────────────────────────────────────────────────────

async function listTickets(req, res) {
  try {
    const { status, priority, category, channel, assignedToId, search, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (channel) where.channel = channel;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    res.json({ data: tickets, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    logger.error('listTickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

async function getTicket(req, res) {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        comments: { orderBy: { createdAt: 'asc' } },
        callLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ data: ticket });
  } catch (error) {
    logger.error('getTicket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
}

async function createTicket(req, res) {
  try {
    const {
      customerId, customerName, customerEmail, customerPhone,
      channel, category, priority, subject, description,
      assignedToId, tags, slaDeadline,
    } = req.body;

    if (!customerName || !subject || !description) {
      return res.status(400).json({ error: 'customerName, subject, and description are required' });
    }

    const ticketNumber = genTicketNumber(req.tenantId);

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: req.tenantId,
        ticketNumber,
        customerId: customerId || null,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        channel: channel || 'EMAIL',
        category: category || 'GENERAL',
        priority: priority || 'MEDIUM',
        subject,
        description,
        assignedToId: assignedToId || null,
        tags: tags || [],
        slaDeadline: slaDeadline ? new Date(slaDeadline) : null,
      },
      include: {
        customer: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ data: ticket });
  } catch (error) {
    logger.error('createTicket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
}

async function updateTicket(req, res) {
  try {
    const existing = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const {
      status, priority, category, assignedToId,
      subject, description, tags, slaDeadline,
    } = req.body;

    const data = {};
    if (status !== undefined) {
      data.status = status;
      if (status === 'RESOLVED' && !existing.resolvedAt) data.resolvedAt = new Date();
      if (status === 'CLOSED' && !existing.closedAt) data.closedAt = new Date();
    }
    if (priority !== undefined) data.priority = priority;
    if (category !== undefined) data.category = category;
    if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
    if (subject !== undefined) data.subject = subject;
    if (description !== undefined) data.description = description;
    if (tags !== undefined) data.tags = tags;
    if (slaDeadline !== undefined) data.slaDeadline = slaDeadline ? new Date(slaDeadline) : null;

    const ticket = await prisma.supportTicket.update({
      where: { id: existing.id },
      data,
      include: {
        customer: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ data: ticket });
  } catch (error) {
    logger.error('updateTicket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}

async function addComment(req, res) {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { body, isInternal } = req.body;
    if (!body) return res.status(400).json({ error: 'Comment body is required' });

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user?.id || null,
        authorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Agent',
        body,
        isInternal: isInternal || false,
      },
    });

    if (!ticket.firstResponseAt) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { firstResponseAt: new Date() },
      });
    }

    res.status(201).json({ data: comment });
  } catch (error) {
    logger.error('addComment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

// ── CALL LOGS ────────────────────────────────────────────────────────────────

async function listCallLogs(req, res) {
  try {
    const { direction, outcome, agentId, search, page = 1, limit = 20 } = req.query;
    const where = { tenantId: req.tenantId };
    if (direction) where.direction = direction;
    if (outcome) where.outcome = outcome;
    if (agentId) where.agentId = agentId;
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      prisma.callLog.findMany({
        where, skip, take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, firstName: true, lastName: true } },
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
        },
      }),
      prisma.callLog.count({ where }),
    ]);

    res.json({ data: logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    logger.error('listCallLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
}

async function createCallLog(req, res) {
  try {
    const {
      ticketId, customerId, customerName, customerPhone,
      direction, outcome, durationSeconds, notes, recordingUrl,
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'customerName and customerPhone are required' });
    }

    const log = await prisma.callLog.create({
      data: {
        tenantId: req.tenantId,
        ticketId: ticketId || null,
        customerId: customerId || null,
        customerName,
        customerPhone,
        agentId: req.user?.id || null,
        direction: direction || 'INBOUND',
        outcome: outcome || 'CONNECTED',
        durationSeconds: durationSeconds || null,
        notes: notes || null,
        recordingUrl: recordingUrl || null,
      },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true } },
        ticket: { select: { id: true, ticketNumber: true } },
      },
    });

    res.status(201).json({ data: log });
  } catch (error) {
    logger.error('createCallLog error:', error);
    res.status(500).json({ error: 'Failed to create call log' });
  }
}

// ── STATS ────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const tenantId = req.tenantId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOpen, totalInProgress, totalResolved, totalClosed,
      urgentOpen, overdueCount, monthTickets,
      totalCallsMonth, inboundCalls, outboundCalls,
      byCategory, byChannel,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { tenantId, status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { tenantId, status: 'CLOSED' } }),
      prisma.supportTicket.count({ where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] }, priority: 'URGENT' } }),
      prisma.supportTicket.count({ where: { tenantId, status: { in: ['OPEN', 'IN_PROGRESS'] }, slaDeadline: { lt: now } } }),
      prisma.supportTicket.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      prisma.callLog.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      prisma.callLog.count({ where: { tenantId, direction: 'INBOUND', createdAt: { gte: startOfMonth } } }),
      prisma.callLog.count({ where: { tenantId, direction: 'OUTBOUND', createdAt: { gte: startOfMonth } } }),
      prisma.supportTicket.groupBy({ by: ['category'], where: { tenantId }, _count: true }),
      prisma.supportTicket.groupBy({ by: ['channel'], where: { tenantId }, _count: true }),
    ]);

    res.json({
      data: {
        tickets: { open: totalOpen, inProgress: totalInProgress, resolved: totalResolved, closed: totalClosed, urgentOpen, overdueCount, thisMonth: monthTickets },
        calls: { thisMonth: totalCallsMonth, inbound: inboundCalls, outbound: outboundCalls },
        byCategory,
        byChannel,
      },
    });
  } catch (error) {
    logger.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch support stats' });
  }
}

module.exports = { listTickets, getTicket, createTicket, updateTicket, addComment, listCallLogs, createCallLog, getStats };
