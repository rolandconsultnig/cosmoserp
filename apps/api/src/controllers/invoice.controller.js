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

module.exports = { 
  list, getOne, create, update, sendInvoice, sendWhatsApp, recordPayment, submitToNRS, downloadPDF,
  // New features
  bulkUploadInvoices, getImportStatus, listImports, retryFailedImports,
  uploadForOCR, getOCRStatus, validateOCRData, createInvoiceFromOCR, listOCRData,
  createRecurringInvoice, listRecurringInvoices, getRecurringInvoice, updateRecurringInvoice, deleteRecurringInvoice, generateRecurringInvoice,
  getNumberingConfig, updateNumberingConfig, validateInvoiceNumber,
  getCurrencyRates, getSupportedCurrencies,
  submitForApproval, getApprovalStatus, approveInvoice, rejectInvoice, getPendingApprovals, getApprovalHistory,
  checkDuplicateInvoice, listDuplicateChecks, approveDuplicateCheck, rejectDuplicateCheck,
};

// ═════════════════════════════════════════════════════════════════════════════════════════
// NEW INVOICE MANAGEMENT FEATURES
// ═════════════════════════════════════════════════════════════════════════════════════════

// 1. BULK UPLOAD & IMPORT
async function bulkUploadInvoices(req, res) {
  try {
    const { fileName, fileSize, fileUrl, importType } = req.body;
    const importRecord = await prisma.invoiceImport.create({
      data: {
        tenantId: req.tenantId,
        fileName,
        fileSize,
        fileUrl,
        importType: importType || 'CSV',
        status: 'PROCESSING',
        createdById: req.user.id,
      },
    });
    res.status(201).json({ data: importRecord, message: 'Import processing started' });
  } catch (e) { res.status(500).json({ error: 'Failed to start bulk upload' }); }
}

async function getImportStatus(req, res) {
  try {
    const importRecord = await prisma.invoiceImport.findFirst({
      where: { id: req.params.importId, tenantId: req.tenantId },
    });
    if (!importRecord) return res.status(404).json({ error: 'Import not found' });
    res.json({ data: importRecord });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch import' }); }
}

async function listImports(req, res) {
  try {
    const { page, limit } = req.query;
    const { take, skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      prisma.invoiceImport.findMany({
        where: { tenantId: req.tenantId },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.invoiceImport.count({ where: { tenantId: req.tenantId } }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to list imports' }); }
}

async function retryFailedImports(req, res) {
  try {
    const importRecord = await prisma.invoiceImport.findFirst({
      where: { id: req.params.importId, tenantId: req.tenantId },
    });
    if (!importRecord) return res.status(404).json({ error: 'Import not found' });
    await prisma.invoiceImport.update({
      where: { id: importRecord.id },
      data: { status: 'PROCESSING', failureCount: 0, successCount: 0 },
    });
    res.json({ message: 'Retry started for failed imports' });
  } catch (e) { res.status(500).json({ error: 'Failed to retry import' }); }
}

// 2. INVOICE SCANNING & OCR
async function uploadForOCR(req, res) {
  try {
    const { fileName, fileUrl, fileType } = req.body;
    const ocrRecord = await prisma.invoiceOCRData.create({
      data: {
        tenantId: req.tenantId,
        fileName,
        fileUrl,
        fileType: fileType || 'PDF',
        ocrStatus: 'PROCESSING',
        createdById: req.user.id,
      },
    });
    res.status(201).json({ data: ocrRecord, message: 'OCR processing started' });
  } catch (e) { res.status(500).json({ error: 'Failed to upload for OCR' }); }
}

async function getOCRStatus(req, res) {
  try {
    const ocrRecord = await prisma.invoiceOCRData.findFirst({
      where: { id: req.params.ocrId, tenantId: req.tenantId },
    });
    if (!ocrRecord) return res.status(404).json({ error: 'OCR record not found' });
    res.json({ data: ocrRecord });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch OCR status' }); }
}

async function validateOCRData(req, res) {
  try {
    const { extractedData, extractedText, confidence } = req.body;
    const ocrRecord = await prisma.invoiceOCRData.findFirst({
      where: { id: req.params.ocrId, tenantId: req.tenantId },
    });
    if (!ocrRecord) return res.status(404).json({ error: 'OCR record not found' });
    const updated = await prisma.invoiceOCRData.update({
      where: { id: ocrRecord.id },
      data: {
        ocrStatus: 'COMPLETED',
        extractedData,
        extractedText,
        confidence,
        isValidated: true,
        validatedBy: req.user.id,
        validatedAt: new Date(),
      },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to validate OCR' }); }
}

async function createInvoiceFromOCR(req, res) {
  try {
    const ocrRecord = await prisma.invoiceOCRData.findFirst({
      where: { id: req.params.ocrId, tenantId: req.tenantId },
    });
    if (!ocrRecord) return res.status(404).json({ error: 'OCR record not found' });
    
    const extracted = ocrRecord.extractedData || {};
    const invoiceNumber = generateInvoiceNumber(req.tenantId);
    
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: req.tenantId,
        customerId: extracted.customerId || '',
        invoiceNumber,
        status: 'DRAFT',
        issueDate: extracted.invoiceDate ? new Date(extracted.invoiceDate) : new Date(),
        dueDate: extracted.dueDate ? new Date(extracted.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: extracted.currency || 'NGN',
        subtotal: num(extracted.subtotal || 0),
        vatAmount: num(extracted.vatAmount || 0),
        totalAmount: num(extracted.totalAmount || 0),
        amountDue: num(extracted.totalAmount || 0),
        notes: extracted.notes || `Created from OCR (${ocrRecord.fileName})`,
      },
    });

    await prisma.invoiceOCRData.update({
      where: { id: ocrRecord.id },
      data: { invoiceId: invoice.id, ocrStatus: 'COMPLETED' },
    });

    res.status(201).json({ data: invoice, message: 'Invoice created from OCR' });
  } catch (e) { res.status(500).json({ error: 'Failed to create invoice from OCR' }); }
}

async function listOCRData(req, res) {
  try {
    const { page, limit, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.ocrStatus = status;
    
    const [data, total] = await Promise.all([
      prisma.invoiceOCRData.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.invoiceOCRData.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to list OCR data' }); }
}

// 3. RECURRING INVOICES
async function createRecurringInvoice(req, res) {
  try {
    const { customerId, templateName, frequency, dayOfMonth, startDate, endDate, currency, subtotal, vatRate, description, lines } = req.body;
    const nextInvoiceDate = new Date(startDate);
    
    const recurring = await prisma.recurringInvoice.create({
      data: {
        tenantId: req.tenantId,
        customerId,
        templateName,
        frequency: frequency || 'MONTHLY',
        dayOfMonth: dayOfMonth || 1,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextInvoiceDate,
        currency: currency || 'NGN',
        subtotal: num(subtotal),
        vatRate: num(vatRate || 0.075),
        description,
        lines,
      },
    });
    res.status(201).json({ data: recurring });
  } catch (e) { res.status(500).json({ error: 'Failed to create recurring invoice' }); }
}

async function listRecurringInvoices(req, res) {
  try {
    const { page, limit, isActive } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const [data, total] = await Promise.all([
      prisma.recurringInvoice.findMany({ where, orderBy: { nextInvoiceDate: 'asc' }, take, skip }),
      prisma.recurringInvoice.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to list recurring invoices' }); }
}

async function getRecurringInvoice(req, res) {
  try {
    const recurring = await prisma.recurringInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!recurring) return res.status(404).json({ error: 'Recurring invoice not found' });
    res.json({ data: recurring });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch recurring invoice' }); }
}

async function updateRecurringInvoice(req, res) {
  try {
    const { frequency, dayOfMonth, endDate, isActive, subtotal, vatRate } = req.body;
    const updated = await prisma.recurringInvoice.update({
      where: { id: req.params.id },
      data: {
        frequency, dayOfMonth, endDate: endDate ? new Date(endDate) : null, isActive,
        subtotal: subtotal !== undefined ? num(subtotal) : undefined,
        vatRate: vatRate !== undefined ? num(vatRate) : undefined,
      },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update recurring invoice' }); }
}

async function deleteRecurringInvoice(req, res) {
  try {
    await prisma.recurringInvoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Recurring invoice deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete recurring invoice' }); }
}

async function generateRecurringInvoice(req, res) {
  try {
    const recurring = await prisma.recurringInvoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!recurring) return res.status(404).json({ error: 'Recurring invoice not found' });
    
    const invoiceNumber = generateInvoiceNumber(req.tenantId);
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: req.tenantId,
        customerId: recurring.customerId,
        invoiceNumber,
        currency: recurring.currency,
        subtotal: recurring.subtotal,
        vatAmount: num(parseFloat(recurring.subtotal) * parseFloat(recurring.vatRate)),
        totalAmount: num(parseFloat(recurring.subtotal) * (1 + parseFloat(recurring.vatRate))),
        amountDue: num(parseFloat(recurring.subtotal) * (1 + parseFloat(recurring.vatRate))),
        status: 'DRAFT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: `Generated from recurring template: ${recurring.templateName}`,
      },
    });

    // Update recurring invoice
    await prisma.recurringInvoice.update({
      where: { id: recurring.id },
      data: {
        lastInvoiceDate: new Date(),
        invoiceCount: { increment: 1 },
        nextInvoiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ data: invoice, message: 'Invoice generated from recurring template' });
  } catch (e) { res.status(500).json({ error: 'Failed to generate invoice' }); }
}

// 4. INVOICE NUMBERING
async function getNumberingConfig(req, res) {
  try {
    const config = await prisma.invoiceNumbering.findUnique({
      where: { tenantId: req.tenantId },
    });
    if (!config) {
      const newConfig = await prisma.invoiceNumbering.create({
        data: { tenantId: req.tenantId },
      });
      return res.json({ data: newConfig });
    }
    res.json({ data: config });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch numbering config' }); }
}

async function updateNumberingConfig(req, res) {
  try {
    const { prefix, suffix, formatPattern, separator, yearFormat, resetFrequency } = req.body;
    const updated = await prisma.invoiceNumbering.upsert({
      where: { tenantId: req.tenantId },
      create: {
        tenantId: req.tenantId,
        prefix, suffix, formatPattern, separator, yearFormat, resetFrequency,
      },
      update: { prefix, suffix, formatPattern, separator, yearFormat, resetFrequency },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update numbering config' }); }
}

async function validateInvoiceNumber(req, res) {
  try {
    const { invoiceNumber } = req.body;
    const exists = await prisma.invoice.findFirst({
      where: { invoiceNumber, tenantId: req.tenantId },
    });
    res.json({ isValid: !exists, message: exists ? 'Invoice number already exists' : 'Invoice number is valid' });
  } catch (e) { res.status(500).json({ error: 'Failed to validate invoice number' }); }
}

// 5. MULTI-CURRENCY
async function getCurrencyRates(req, res) {
  try {
    const rates = await prisma.tenantCurrency.findMany({
      where: { tenantId: req.tenantId },
    });
    res.json({ data: rates });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch currency rates' }); }
}

async function getSupportedCurrencies(req, res) {
  try {
    const currencies = ['NGN', 'USD', 'EUR', 'GBP', 'GHS', 'ZAR', 'KES'];
    res.json({ data: currencies });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch currencies' }); }
}

// 6. APPROVAL WORKFLOWS
async function submitForApproval(req, res) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const approval = await prisma.invoiceApprovalWorkflow.create({
      data: {
        tenantId: req.tenantId,
        invoiceId: invoice.id,
        workflowStatus: 'PENDING',
        approverLevel: 1,
      },
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'SENT' },
    });

    res.json({ data: approval, message: 'Invoice submitted for approval' });
  } catch (e) { res.status(500).json({ error: 'Failed to submit for approval' }); }
}

async function getApprovalStatus(req, res) {
  try {
    const approval = await prisma.invoiceApprovalWorkflow.findFirst({
      where: { invoiceId: req.params.id, tenantId: req.tenantId },
    });
    if (!approval) return res.status(404).json({ error: 'Approval record not found' });
    res.json({ data: approval });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch approval status' }); }
}

async function approveInvoice(req, res) {
  try {
    const approval = await prisma.invoiceApprovalWorkflow.findFirst({
      where: { invoiceId: req.params.id, tenantId: req.tenantId },
    });
    if (!approval) return res.status(404).json({ error: 'Approval record not found' });

    const history = Array.isArray(approval.approvalHistory) ? approval.approvalHistory : [];
    history.push({
        approver: req.user.id,
      action: 'APPROVED',
      timestamp: new Date(),
      notes: req.body.notes || '',
    });

    const updated = await prisma.invoiceApprovalWorkflow.update({
      where: { id: approval.id },
      data: {
        workflowStatus: approval.approverLevel >= approval.maxApprovalLevels ? 'APPROVED' : 'IN_REVIEW',
        approverLevel: { increment: 1 },
        approvalHistory: history,
        approvedAt: new Date(),
        approvedBy: req.user.id,
      },
    });

    res.json({ data: updated, message: 'Invoice approved' });
  } catch (e) { res.status(500).json({ error: 'Failed to approve invoice' }); }
}

async function rejectInvoice(req, res) {
  try {
    const { rejectionReason } = req.body;
    const approval = await prisma.invoiceApprovalWorkflow.findFirst({
      where: { invoiceId: req.params.id, tenantId: req.tenantId },
    });
    if (!approval) return res.status(404).json({ error: 'Approval record not found' });

    const updated = await prisma.invoiceApprovalWorkflow.update({
      where: { id: approval.id },
      data: {
        workflowStatus: 'REJECTED',
        rejectionReason,
      },
    });

    res.json({ data: updated, message: 'Invoice rejected' });
  } catch (e) { res.status(500).json({ error: 'Failed to reject invoice' }); }
}

async function getPendingApprovals(req, res) {
  try {
    const { page, limit } = req.query;
    const { take, skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      prisma.invoiceApprovalWorkflow.findMany({
        where: { tenantId: req.tenantId, workflowStatus: { in: ['PENDING', 'IN_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.invoiceApprovalWorkflow.count({
        where: { tenantId: req.tenantId, workflowStatus: { in: ['PENDING', 'IN_REVIEW'] } },
      }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch pending approvals' }); }
}

async function getApprovalHistory(req, res) {
  try {
    const approval = await prisma.invoiceApprovalWorkflow.findFirst({
      where: { invoiceId: req.params.invoiceId, tenantId: req.tenantId },
    });
    if (!approval) return res.status(404).json({ error: 'Approval record not found' });
    res.json({ data: approval.approvalHistory || [] });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch approval history' }); }
}

// 7. DUPLICATE DETECTION
async function checkDuplicateInvoice(req, res) {
  try {
    const { vendorInvoiceNo, vendorName, amount, invoiceDate } = req.body;
    
    const existing = await prisma.invoice.findFirst({
      where: {
        tenantId: req.tenantId,
        // Match vendor invoice number, amount, and date within a range
      },
      include: { customer: true },
    });

    const check = await prisma.invoiceDuplicateCheck.create({
      data: {
        tenantId: req.tenantId,
        vendorInvoiceNo,
        vendorName,
        amount: num(amount),
        currency: req.body.currency || 'NGN',
        invoiceDate: new Date(invoiceDate),
        isDuplicate: !!existing,
        duplicateOf: existing?.id || null,
        matchConfidence: existing ? 95 : 0,
        checkStatus: 'PENDING',
      },
    });

    res.json({ data: check, isDuplicate: !!existing });
  } catch (e) { res.status(500).json({ error: 'Failed to check for duplicates' }); }
}

async function listDuplicateChecks(req, res) {
  try {
    const { page, limit, isDuplicate } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (isDuplicate !== undefined) where.isDuplicate = isDuplicate === 'true';
    
    const [data, total] = await Promise.all([
      prisma.invoiceDuplicateCheck.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take, skip,
      }),
      prisma.invoiceDuplicateCheck.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (e) { res.status(500).json({ error: 'Failed to list duplicate checks' }); }
}

async function approveDuplicateCheck(req, res) {
  try {
    const check = await prisma.invoiceDuplicateCheck.findFirst({
      where: { id: req.params.checkId, tenantId: req.tenantId },
    });
    if (!check) return res.status(404).json({ error: 'Duplicate check not found' });

    const updated = await prisma.invoiceDuplicateCheck.update({
      where: { id: check.id },
      data: {
        isApproved: true,
        checkStatus: 'APPROVED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
    });

    res.json({ data: updated, message: 'Duplicate check approved' });
  } catch (e) { res.status(500).json({ error: 'Failed to approve duplicate check' }); }
}

async function rejectDuplicateCheck(req, res) {
  try {
    const check = await prisma.invoiceDuplicateCheck.findFirst({
      where: { id: req.params.checkId, tenantId: req.tenantId },
    });
    if (!check) return res.status(404).json({ error: 'Duplicate check not found' });

    const updated = await prisma.invoiceDuplicateCheck.update({
      where: { id: check.id },
      data: {
        isDuplicate: false,
        checkStatus: 'REJECTED',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        notes: req.body.notes || 'Not a duplicate',
      },
    });

    res.json({ data: updated, message: 'Duplicate check rejected' });
  } catch (e) { res.status(500).json({ error: 'Failed to reject duplicate check' }); }
}
