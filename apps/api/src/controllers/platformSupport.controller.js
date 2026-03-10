const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

function genPlatformTicketNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  return `PLT-${ts}`;
}

// ── Customer: create ticket (e.g. from live chat), list my tickets, get ticket, add message
async function createTicket(req, res) {
  try {
    const customer = req.customer; // from authenticateMarketplace
    const { subject, description, category = 'GENERAL' } = req.body || {};
    const subj = (subject || '').trim();
    const desc = (description || '').trim();
    if (!subj || !desc) {
      return res.status(400).json({ error: 'Subject and description are required' });
    }
    const ticketNumber = genPlatformTicketNumber();
    const ticket = await prisma.platformSupportTicket.create({
      data: {
        ticketNumber,
        marketplaceCustomerId: customer.id,
        customerEmail: customer.email,
        customerName: customer.fullName,
        subject: subj,
        description: desc,
        channel: 'CHAT',
        category: category || 'GENERAL',
        priority: 'MEDIUM',
        status: 'OPEN',
        comments: {
          create: {
            authorType: 'CUSTOMER',
            authorName: customer.fullName,
            body: desc,
            isInternal: false,
          },
        },
      },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    res.status(201).json({ data: ticket });
  } catch (error) {
    logger.error('Platform support createTicket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
}

async function listMyTickets(req, res) {
  try {
    const customer = req.customer;
    const { status, page = 1, limit = 20 } = req.query;
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const where = { marketplaceCustomerId: customer.id };
    if (status) where.status = status;
    const [tickets, total] = await Promise.all([
      prisma.platformSupportTicket.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { comments: true } } },
      }),
      prisma.platformSupportTicket.count({ where }),
    ]);
    res.json({
      data: tickets,
      meta: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    logger.error('Platform support listMyTickets error:', error);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
}

async function getMyTicket(req, res) {
  try {
    const customer = req.customer;
    const ticket = await prisma.platformSupportTicket.findFirst({
      where: { id: req.params.id, marketplaceCustomerId: customer.id },
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ data: ticket });
  } catch (error) {
    logger.error('Platform support getMyTicket error:', error);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
}

async function addMessage(req, res) {
  try {
    const customer = req.customer;
    const { body } = req.body || {};
    const messageBody = (body || '').trim();
    if (!messageBody) return res.status(400).json({ error: 'Message body is required' });
    const ticket = await prisma.platformSupportTicket.findFirst({
      where: { id: req.params.id, marketplaceCustomerId: customer.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return res.status(400).json({ error: 'Cannot add message to closed ticket' });
    }
    const comment = await prisma.platformTicketComment.create({
      data: {
        ticketId: ticket.id,
        authorType: 'CUSTOMER',
        authorName: customer.fullName,
        body: messageBody,
        isInternal: false,
      },
    });
    await prisma.platformSupportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    });
    res.status(201).json({ data: comment });
  } catch (error) {
    logger.error('Platform support addMessage error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

// ── Admin (Back Office): list all platform tickets, get one, assign, add reply, update status
async function adminListTickets(req, res) {
  try {
    const { status, priority, assignedToAdminId, page = 1, limit = 20, search } = req.query;
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToAdminId) where.assignedToAdminId = assignedToAdminId;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [tickets, total] = await Promise.all([
      prisma.platformSupportTicket.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedToAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.platformSupportTicket.count({ where }),
    ]);
    res.json({
      data: tickets,
      meta: { page: Number(page) || 1, limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    logger.error('Platform support adminListTickets error:', error);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
}

async function adminGetTicket(req, res) {
  try {
    const ticket = await prisma.platformSupportTicket.findUnique({
      where: { id: req.params.id },
      include: {
        assignedToAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ data: ticket });
  } catch (error) {
    logger.error('Platform support adminGetTicket error:', error);
    res.status(500).json({ error: 'Failed to load ticket' });
  }
}

async function adminUpdateTicket(req, res) {
  try {
    const { status, assignedToAdminId, priority } = req.body || {};
    const ticket = await prisma.platformSupportTicket.findUnique({
      where: { id: req.params.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const data = {};
    if (status !== undefined) {
      data.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        data.resolvedAt = status === 'RESOLVED' ? new Date() : undefined;
        data.closedAt = status === 'CLOSED' ? new Date() : undefined;
      }
    }
    if (assignedToAdminId !== undefined) data.assignedToAdminId = assignedToAdminId || null;
    if (priority !== undefined) data.priority = priority;
    const updated = await prisma.platformSupportTicket.update({
      where: { id: req.params.id },
      data,
      include: {
        assignedToAdmin: { select: { id: true, firstName: true, lastName: true } },
        comments: { orderBy: { createdAt: 'asc' } },
      },
    });
    res.json({ data: updated });
  } catch (error) {
    logger.error('Platform support adminUpdateTicket error:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
}

async function adminAddReply(req, res) {
  try {
    const admin = req.admin; // from requireAdmin or requireRole
    const { body, isInternal } = req.body || {};
    const messageBody = (body || '').trim();
    if (!messageBody) return res.status(400).json({ error: 'Message body is required' });
    const ticket = await prisma.platformSupportTicket.findUnique({
      where: { id: req.params.id },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const comment = await prisma.platformTicketComment.create({
      data: {
        ticketId: ticket.id,
        authorType: 'AGENT',
        authorId: admin.id,
        authorName: `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.email,
        body: messageBody,
        isInternal: !!isInternal,
      },
    });
    await prisma.platformSupportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date(), status: 'IN_PROGRESS' },
    });
    res.status(201).json({ data: comment });
  } catch (error) {
    logger.error('Platform support adminAddReply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
}

async function adminGetStats(req, res) {
  try {
    const [open, inProgress, resolved, total] = await Promise.all([
      prisma.platformSupportTicket.count({ where: { status: 'OPEN' } }),
      prisma.platformSupportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.platformSupportTicket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.platformSupportTicket.count(),
    ]);
    res.json({
      data: { open, inProgress, resolved, total },
    });
  } catch (error) {
    logger.error('Platform support adminGetStats error:', error);
    res.status(500).json({ error: 'Failed to load stats' });
  }
}

module.exports = {
  createTicket,
  listMyTickets,
  getMyTicket,
  addMessage,
  adminListTickets,
  adminGetTicket,
  adminUpdateTicket,
  adminAddReply,
  adminGetStats,
};
