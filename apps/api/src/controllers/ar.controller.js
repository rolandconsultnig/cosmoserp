const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

exports.listCollections = async (req, res) => {
  try {
    const now = new Date();
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const where = {
      tenantId: req.tenantId,
      status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
      amountDue: { gt: 0 },
    };
    if (from || to) {
      where.dueDate = {};
      if (from && !Number.isNaN(from.getTime())) where.dueDate.gte = from;
      if (to && !Number.isNaN(to.getTime())) where.dueDate.lte = to;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, whatsapp: true, creditLimit: true, creditUsed: true } },
        reminders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, channel: true, status: true, sentAt: true, createdAt: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };
    for (const inv of invoices) {
      const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / 86400000);
      if (daysOverdue <= 0) buckets.current.push(inv);
      else if (daysOverdue <= 30) buckets.days1_30.push(inv);
      else if (daysOverdue <= 60) buckets.days31_60.push(inv);
      else if (daysOverdue <= 90) buckets.days61_90.push(inv);
      else buckets.over90.push(inv);
    }

    const totals = Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [k, v.reduce((sum, i) => sum + parseFloat(i.amountDue || 0), 0)]),
    );

    const dueToday = invoices.filter((i) => {
      const due = new Date(i.dueDate);
      const start = startOfDay(now);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return due >= start && due < end;
    });

    const overdue = invoices.filter((i) => new Date(i.dueDate) < now);

    res.json({
      data: {
        invoices,
        buckets,
        totals,
        summary: {
          totalOpenInvoices: invoices.length,
          totalOutstanding: invoices.reduce((s, i) => s + parseFloat(i.amountDue || 0), 0),
          dueTodayCount: dueToday.length,
          overdueCount: overdue.length,
        },
      },
    });
  } catch (err) {
    logger.error('listCollections', err);
    res.status(500).json({ error: err.message || 'Failed to load collections queue' });
  }
};

exports.sendOverdueReminders = async (req, res) => {
  try {
    const channel = String(req.body?.channel || 'EMAIL').toUpperCase();
    const daysOverdue = Math.max(0, Math.min(parseInt(req.body?.daysOverdue, 10) || 1, 365));
    const limit = Math.max(1, Math.min(parseInt(req.body?.limit, 10) || 100, 500));
    const dryRun = !!req.body?.dryRun;

    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() - daysOverdue);

    const candidates = await prisma.invoice.findMany({
      where: {
        tenantId: req.tenantId,
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        amountDue: { gt: 0 },
        dueDate: { lte: threshold },
      },
      include: {
        customer: { select: { id: true, name: true, email: true, whatsapp: true } },
        reminders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });

    if (dryRun) {
      return res.json({
        data: {
          dryRun: true,
          channel,
          daysOverdue,
          candidateCount: candidates.length,
          candidates: candidates.map((i) => ({
            invoiceId: i.id,
            invoiceNumber: i.invoiceNumber,
            dueDate: i.dueDate,
            amountDue: i.amountDue,
            customer: i.customer,
            lastReminderAt: i.reminders?.[0]?.createdAt || null,
          })),
        },
      });
    }

    const results = [];
    for (const invoice of candidates) {
      const recipient = channel === 'WHATSAPP' ? invoice.customer?.whatsapp : invoice.customer?.email;
      const reminder = await prisma.invoiceReminder.create({
        data: {
          tenantId: req.tenantId,
          invoiceId: invoice.id,
          channel,
          recipient: recipient || null,
          status: recipient ? 'SENT' : 'SKIPPED',
          sentAt: recipient ? new Date() : null,
          notes: recipient ? `Reminder queued via ${channel}` : `No ${channel} recipient configured`,
          createdById: req.user?.id,
        },
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'OVERDUE',
          notes: invoice.notes
            ? `${invoice.notes}\n[REMINDER ${new Date().toISOString()}] ${channel}`
            : `[REMINDER ${new Date().toISOString()}] ${channel}`,
        },
      });

      results.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        recipient,
        status: reminder.status,
      });
    }

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'SEND_REMINDER_BATCH',
      resource: 'Invoice',
      resourceId: null,
      newValues: { channel, daysOverdue, count: results.length },
      req,
    });

    res.json({ data: { channel, daysOverdue, count: results.length, results } });
  } catch (err) {
    logger.error('sendOverdueReminders', err);
    res.status(500).json({ error: err.message || 'Failed to send overdue reminders' });
  }
};

exports.getCustomerCreditOverview = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { tenantId: req.tenantId, isActive: true, creditLimit: { gt: 0 } },
      orderBy: { creditUsed: 'desc' },
    });

    const customerIds = customers.map((c) => c.id);
    const overdueByCustomer = await prisma.invoice.groupBy({
      by: ['customerId'],
      where: {
        tenantId: req.tenantId,
        customerId: { in: customerIds },
        status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
        amountDue: { gt: 0 },
        dueDate: { lt: new Date() },
      },
      _sum: { amountDue: true },
      _count: { customerId: true },
    });

    const overdueMap = Object.fromEntries(overdueByCustomer.map((r) => [
      r.customerId,
      {
        overdueAmount: parseFloat(r._sum.amountDue || 0),
        overdueInvoices: r._count.customerId,
      },
    ]));

    const data = customers.map((c) => {
      const limit = parseFloat(c.creditLimit || 0);
      const used = parseFloat(c.creditUsed || 0);
      const available = Math.max(0, limit - used);
      const utilizationPct = limit > 0 ? Math.round((used / limit) * 100) : 0;
      const overdue = overdueMap[c.id] || { overdueAmount: 0, overdueInvoices: 0 };
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        creditLimit: c.creditLimit,
        creditUsed: c.creditUsed,
        availableCredit: available,
        utilizationPct,
        overdueAmount: overdue.overdueAmount,
        overdueInvoices: overdue.overdueInvoices,
      };
    });

    res.json({ data });
  } catch (err) {
    logger.error('getCustomerCreditOverview', err);
    res.status(500).json({ error: err.message || 'Failed to load credit overview' });
  }
};
