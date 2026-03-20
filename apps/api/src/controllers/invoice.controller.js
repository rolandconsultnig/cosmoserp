const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { generateInvoiceNumber, calculateVAT, calculateWHT, roundDecimal, paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const nrsService = require('../services/nrs.service');
const pdfService = require('../services/pdf.service');
const whatsappService = require('../services/whatsapp.service');

/** Invoice header/amount is frozen after these statuses */
const IMMUTABLE_INVOICE_STATUSES = ['PAID', 'CREDITED', 'CANCELLED'];
/** Cannot record customer payments against these */
const NON_PAYABLE_STATUSES = ['CANCELLED', 'CREDITED'];
/** Cannot distribute / send as active invoice */
const NON_SENDABLE_STATUSES = ['CANCELLED', 'CREDITED'];

function num(v) {
  return roundDecimal(parseFloat(v == null ? 0 : v));
}

async function list(req, res) {
  try {
    const { page, limit, status, customerId, from, to, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.issueDate = {};
      if (from) where.issueDate.gte = new Date(from);
      if (to) where.issueDate.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where, take, skip,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, email: true } }, lines: true },
      }),
      prisma.invoice.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    logger.error('List invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
}

async function getOne(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        customer: true,
        lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: true,
        nrsLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ data: invoice });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
}

async function create(req, res) {
  try {
    const { customerId, invoiceType, issueDate, dueDate, currency, exchangeRate, lines, notes, terms, quoteId } = req.body;
    if (!customerId || !dueDate || !lines?.length) {
      return res.status(400).json({ error: 'Customer, due date, and at least one line item are required' });
    }

    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId: req.tenantId } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const count = await prisma.invoice.count({ where: { tenantId: req.tenantId } });
    const invoiceNumber = generateInvoiceNumber('INV', count + 1);

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
    const amountDue = totalAmount;

    // Credit limit check
    if (customer.creditLimit > 0 && customer.creditUsed + totalAmount > customer.creditLimit) {
      return res.status(400).json({
        error: 'Credit limit exceeded',
        creditLimit: customer.creditLimit,
        creditUsed: customer.creditUsed,
        available: roundDecimal(customer.creditLimit - customer.creditUsed),
      });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId: req.tenantId,
          customerId,
          quoteId,
          invoiceNumber,
          invoiceType: invoiceType || 'B2B',
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          dueDate: new Date(dueDate),
          currency: currency || 'NGN',
          exchangeRate: exchangeRate || 1,
          subtotal: roundDecimal(subtotal),
          vatAmount: roundDecimal(vatAmount),
          whtAmount: roundDecimal(whtAmount),
          discountAmount,
          totalAmount,
          amountDue,
          notes,
          terms,
          createdById: req.user.id,
          lines: { create: processedLines },
        },
        include: { lines: true, customer: true },
      });

      if (quoteId) {
        const quote = await tx.quote.findFirst({ where: { id: quoteId, tenantId: req.tenantId }, select: { id: true } });
        if (!quote) throw new Error('Quote not found');
        await tx.quote.update({ where: { id: quote.id }, data: { status: 'CONVERTED' } });
      }

      if (customer.creditLimit > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { creditUsed: { increment: totalAmount } },
        });
      }

      await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', resource: 'Invoice', resourceId: inv.id, newValues: { invoiceNumber, totalAmount }, req });
      return inv;
    });

    // Auto-submit to NRS if invoice > ₦50,000 for B2C or any B2B/B2G
    if (invoice.invoiceType !== 'B2C' || invoice.totalAmount >= 50000) {
      nrsService.submitInvoice(invoice.id, req.tenantId).catch((err) =>
        logger.error(`NRS auto-submit failed for invoice ${invoice.id}:`, err.message)
      );
    }

    res.status(201).json({ data: invoice });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
}

async function update(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (IMMUTABLE_INVOICE_STATUSES.includes(invoice.status)) {
      return res.status(409).json({
        error: `Invoice is ${invoice.status} and cannot be modified`,
        code: 'INVOICE_IMMUTABLE',
      });
    }
    const data = {};
    if (req.body.notes !== undefined) data.notes = req.body.notes;
    if (req.body.terms !== undefined) data.terms = req.body.terms;
    if (req.body.dueDate !== undefined) {
      if (invoice.status !== 'DRAFT') {
        return res.status(422).json({
          error: 'Due date can only be changed while the invoice is in DRAFT',
          code: 'DUE_DATE_LOCKED',
        });
      }
      data.dueDate = new Date(req.body.dueDate);
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No allowed fields to update', code: 'NO_CHANGES' });
    }
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data,
      include: { lines: true, customer: true },
    });
    res.json({ data: updated });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
}

async function sendInvoice(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { customer: true, lines: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (NON_SENDABLE_STATUSES.includes(invoice.status)) {
      return res.status(422).json({
        error: 'Cannot send an invoice that is cancelled or credited',
        code: 'INVOICE_NOT_SENDABLE',
      });
    }

    // Generate PDF
    const pdfPath = await pdfService.generateInvoicePDF(invoice, req.tenantId);

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT', pdfUrl: pdfPath },
    });

    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'SEND', resource: 'Invoice', resourceId: invoice.id, req });
    res.json({ message: 'Invoice sent', pdfUrl: pdfPath });
  } catch (error) {
    logger.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
}

async function sendWhatsApp(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { customer: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (NON_SENDABLE_STATUSES.includes(invoice.status)) {
      return res.status(422).json({
        error: 'Cannot send an invoice that is cancelled or credited',
        code: 'INVOICE_NOT_SENDABLE',
      });
    }
    if (!invoice.customer.whatsapp) {
      return res.status(400).json({ error: 'Customer WhatsApp number not configured' });
    }
    await whatsappService.sendInvoice(invoice);
    await prisma.invoice.update({ where: { id: invoice.id }, data: { whatsappSentAt: new Date() } });
    res.json({ message: 'Invoice sent via WhatsApp' });
  } catch (error) {
    logger.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
}

async function recordPayment(req, res) {
  try {
    const { amount, method, reference, paidAt, notes } = req.body;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { customer: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (NON_PAYABLE_STATUSES.includes(invoice.status)) {
      return res.status(422).json({
        error: 'Cannot record payment on a cancelled or credited invoice',
        code: 'INVOICE_NOT_PAYABLE',
      });
    }

    const paymentAmount = num(amount);
    if (paymentAmount <= 0) {
      return res.status(422).json({ error: 'Payment amount must be positive', code: 'INVALID_PAYMENT_AMOUNT' });
    }

    const total = num(invoice.totalAmount);
    const alreadyPaid = num(invoice.amountPaid);
    /** Authoritative remaining balance (avoids stale amountDue) */
    const maxPayable = roundDecimal(total - alreadyPaid);

    if (invoice.status === 'PAID' || maxPayable <= 0) {
      return res.status(409).json({
        error: 'Invoice is already fully paid',
        code: 'INVOICE_ALREADY_PAID',
        amountDue: 0,
        totalAmount: total,
        amountPaid: alreadyPaid,
      });
    }

    if (paymentAmount > maxPayable) {
      return res.status(422).json({
        error: 'Payment amount exceeds amount due',
        code: 'PAYMENT_EXCEEDS_DUE',
        amountDue: maxPayable,
        attemptedAmount: paymentAmount,
        totalAmount: total,
        amountPaid: alreadyPaid,
      });
    }

    const newAmountPaid = roundDecimal(alreadyPaid + paymentAmount);
    const newAmountDue = roundDecimal(total - newAmountPaid);
    const newStatus = newAmountDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : invoice.status;

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          tenantId: req.tenantId,
          invoiceId: invoice.id,
          amount: paymentAmount,
          currency: invoice.currency,
          method: method || 'BANK_TRANSFER',
          reference,
          status: 'SUCCESS',
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          notes,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus },
      });
      if (newStatus === 'PAID' && parseFloat(invoice.customer?.creditLimit || 0) > 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { creditUsed: { decrement: parseFloat(invoice.totalAmount) } },
        });
      }
    });

    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'PAYMENT', resource: 'Invoice', resourceId: invoice.id, newValues: { amount, method }, req });
    res.json({ message: 'Payment recorded', amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
}

async function submitToNRS(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (['CANCELLED', 'CREDITED'].includes(invoice.status)) {
      return res.status(422).json({
        error: 'Cannot submit a cancelled or credited invoice to NRS',
        code: 'INVOICE_NOT_NRS_ELIGIBLE',
      });
    }
    const result = await nrsService.submitInvoice(invoice.id, req.tenantId);
    res.json({ data: result });
  } catch (error) {
    logger.error('NRS submit error:', error);
    res.status(500).json({ error: error.message || 'NRS submission failed' });
  }
}

async function downloadPDF(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { customer: true, lines: { include: { product: true } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const pdfBuffer = await pdfService.generateInvoicePDFBuffer(invoice, req.tenantId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"` });
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF download error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

module.exports = { list, getOne, create, update, sendInvoice, sendWhatsApp, recordPayment, submitToNRS, downloadPDF };
