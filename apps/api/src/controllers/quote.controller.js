const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { generateQuoteNumber, generateInvoiceNumber, calculateVAT, calculateWHT, roundDecimal, paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

async function list(req, res) {
  try {
    const { page, limit, status, customerId, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.quote.findMany({ where, take, skip, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true } }, lines: true } }),
      prisma.quote.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('List quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
}

async function getOne(req, res) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { customer: true, lines: { include: { product: { select: { id: true, name: true, sku: true } } } }, invoice: true },
    });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json({ data: quote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}

async function create(req, res) {
  try {
    const { customerId, issueDate, expiryDate, currency, exchangeRate, lines, notes, terms } = req.body;
    if (!customerId || !lines?.length) return res.status(400).json({ error: 'Customer and line items are required' });

    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: req.tenantId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const count = await prisma.quote.count({ where: { tenantId: req.tenantId } });
    const quoteNumber = generateQuoteNumber('QT', count + 1);

    let subtotal = 0, vatAmount = 0, whtAmount = 0;
    const processedLines = lines.map((line) => {
      const lineSubtotal = roundDecimal(line.quantity * line.unitPrice);
      const vat = calculateVAT(lineSubtotal, line.vatRate ?? 0.075);
      const wht = calculateWHT(lineSubtotal, line.whtRate ?? 0);
      subtotal += lineSubtotal;
      vatAmount += vat;
      whtAmount += wht;
      return { ...line, vatAmount: vat, whtAmount: wht, lineTotal: roundDecimal(lineSubtotal + vat - wht) };
    });

    const discountAmount = roundDecimal(req.body.discountAmount || 0);
    const totalAmount = roundDecimal(subtotal + vatAmount - whtAmount - discountAmount);

    const quote = await prisma.quote.create({
      data: {
        tenantId: req.tenantId,
        customerId,
        quoteNumber,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: currency || 'NGN',
        exchangeRate: exchangeRate || 1,
        subtotal: roundDecimal(subtotal),
        vatAmount: roundDecimal(vatAmount),
        discountAmount,
        totalAmount,
        notes,
        terms,
        createdById: req.user.id,
        lines: { create: processedLines },
      },
      include: { lines: true, customer: true },
    });

    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', resource: 'Quote', resourceId: quote.id, newValues: { quoteNumber, totalAmount }, req });
    res.status(201).json({ data: quote });
  } catch (error) {
    logger.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
}

async function update(req, res) {
  try {
    const quote = await prisma.quote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (!['DRAFT', 'SENT'].includes(quote.status)) return res.status(400).json({ error: 'Cannot edit this quote' });

    const updated = await prisma.quote.update({
      where: { id: quote.id },
      data: { notes: req.body.notes, terms: req.body.terms, expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined },
    });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quote' });
  }
}

async function sendQuote(req, res) {
  try {
    const quote = await prisma.quote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'SENT' } });
    res.json({ message: 'Quote sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send quote' });
  }
}

async function convertToInvoice(req, res) {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { lines: true, customer: true },
    });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (quote.status === 'CONVERTED') return res.status(400).json({ error: 'Quote already converted' });
    if (quote.invoice) return res.status(400).json({ error: 'Invoice already exists for this quote' });

    const { dueDate, invoiceType } = req.body;
    if (!dueDate) return res.status(400).json({ error: 'Due date is required' });

    const count = await prisma.invoice.count({ where: { tenantId: req.tenantId } });
    const invoiceNumber = generateInvoiceNumber('INV', count + 1);

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId: req.tenantId,
          customerId: quote.customerId,
          quoteId: quote.id,
          invoiceNumber,
          invoiceType: invoiceType || 'B2B',
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          currency: quote.currency,
          exchangeRate: quote.exchangeRate,
          subtotal: quote.subtotal,
          vatAmount: quote.vatAmount,
          whtAmount: 0,
          discountAmount: quote.discountAmount,
          totalAmount: quote.totalAmount,
          amountDue: quote.totalAmount,
          notes: quote.notes,
          terms: quote.terms,
          createdById: req.user.id,
          lines: {
            create: quote.lines.map(({ id, quoteId, ...line }) => line),
          },
        },
        include: { lines: true, customer: true },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'CONVERTED' } });
      return inv;
    });

    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CONVERT', resource: 'Quote', resourceId: quote.id, newValues: { invoiceId: invoice.id, invoiceNumber }, req });
    res.status(201).json({ data: invoice, message: 'Quote converted to invoice' });
  } catch (error) {
    logger.error('Convert quote error:', error);
    res.status(500).json({ error: 'Failed to convert quote to invoice' });
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const quote = await prisma.quote.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    const updated = await prisma.quote.update({ where: { id: quote.id }, data: { status } });
    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quote status' });
  }
}

module.exports = { list, getOne, create, update, sendQuote, convertToInvoice, updateStatus };
