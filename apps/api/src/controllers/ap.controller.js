const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { calculateVAT, calculateWHT, paginate, paginatedResponse, roundDecimal } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const apPaymentService = require('../services/apPayment.service');

const BASE_CURRENCY = 'NGN';

function requireJournalAccounts(tenantId, codes) {
  return prisma.account.findMany({ where: { tenantId, code: { in: codes } }, select: { id: true, code: true } });
}

function toBaseAmount(amount, currency, exchangeRate) {
  const a = roundDecimal(parseFloat(amount || 0));
  if (!currency || currency === BASE_CURRENCY) return a;
  return roundDecimal(a * parseFloat(exchangeRate || 1));
}

async function getAccountsByCode(tenantId, codes) {
  const rows = await requireJournalAccounts(tenantId, codes);
  const map = {};
  for (const r of rows) map[r.code] = r;
  return map;
}

exports.submitVendorBillForApproval = async (req, res) => {
  try {
    const billId = req.params.id;
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null;
    const bill = await prisma.vendorBill.findFirst({ where: { id: billId, tenantId: req.tenantId } });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (bill.status !== 'DRAFT') return res.status(409).json({ error: 'Only draft bills can be submitted for approval' });

    const updated = await prisma.vendorBill.update({
      where: { id: bill.id },
      data: {
        approvalStatus: 'PENDING',
        approvalRequestedAt: new Date(),
        approvalNote: note,
        rejectionReason: null,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'SUBMIT_APPROVAL',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { approvalStatus: 'PENDING' },
      req,
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('submitVendorBillForApproval', err);
    res.status(500).json({ error: err.message || 'Failed to submit vendor bill for approval' });
  }
};

exports.reviewVendorBillApproval = async (req, res) => {
  try {
    const billId = req.params.id;
    const decision = String(req.body?.decision || '').toUpperCase();
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null;
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be APPROVE or REJECT' });
    }

    const bill = await prisma.vendorBill.findFirst({ where: { id: billId, tenantId: req.tenantId } });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (bill.status !== 'DRAFT') return res.status(409).json({ error: 'Only draft bills can be reviewed' });

    const approved = decision === 'APPROVE';
    const updated = await prisma.vendorBill.update({
      where: { id: bill.id },
      data: {
        approvalStatus: approved ? 'APPROVED' : 'REJECTED',
        approvedAt: approved ? new Date() : null,
        approvedById: req.user?.id || null,
        approvalNote: approved ? (note || bill.approvalNote || null) : bill.approvalNote,
        rejectionReason: approved ? null : (note || 'Rejected during review'),
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: approved ? 'APPROVE' : 'REJECT',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { approvalStatus: approved ? 'APPROVED' : 'REJECTED' },
      req,
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('reviewVendorBillApproval', err);
    res.status(500).json({ error: err.message || 'Failed to review vendor bill' });
  }
};

exports.createBillPaymentSchedule = async (req, res) => {
  try {
    const billId = req.params.id;
    const { amount, dueDate, notes } = req.body;
    const scheduleAmount = roundDecimal(parseFloat(amount));
    if (!scheduleAmount || scheduleAmount <= 0) return res.status(422).json({ error: 'amount must be > 0' });
    if (!dueDate) return res.status(400).json({ error: 'dueDate is required' });

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      include: { paymentSchedules: { where: { status: 'PENDING' } } },
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (['CANCELLED', 'PAID'].includes(bill.status)) {
      return res.status(409).json({ error: 'Cannot schedule payments for this bill status' });
    }

    const pendingTotal = (bill.paymentSchedules || []).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    if (roundDecimal(pendingTotal + scheduleAmount) > roundDecimal(parseFloat(bill.amountDue || 0))) {
      return res.status(422).json({
        error: 'Scheduled amount exceeds current amount due',
        amountDue: bill.amountDue,
        pendingScheduled: pendingTotal,
      });
    }

    const schedule = await prisma.vendorBillPaymentSchedule.create({
      data: {
        tenantId: req.tenantId,
        billId,
        amount: scheduleAmount,
        dueDate: new Date(dueDate),
        notes: notes ? String(notes).trim() : null,
        createdById: req.user?.id,
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'SCHEDULE_PAYMENT',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { scheduleId: schedule.id, amount: schedule.amount, dueDate: schedule.dueDate },
      req,
    });

    res.status(201).json({ data: schedule });
  } catch (err) {
    logger.error('createBillPaymentSchedule', err);
    res.status(500).json({ error: err.message || 'Failed to schedule bill payment' });
  }
};

exports.listBillPaymentSchedules = async (req, res) => {
  try {
    const billId = req.params.id;
    const rows = await prisma.vendorBillPaymentSchedule.findMany({
      where: { tenantId: req.tenantId, billId },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ data: rows });
  } catch (err) {
    logger.error('listBillPaymentSchedules', err);
    res.status(500).json({ error: err.message || 'Failed to list schedules' });
  }
};

exports.getDuePaymentAlerts = async (req, res) => {
  try {
    const days = Math.max(0, Math.min(parseInt(req.query.days, 10) || 7, 60));
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    const upcomingSchedules = await prisma.vendorBillPaymentSchedule.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
        dueDate: { gte: now, lte: until },
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            amountDue: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const overdueSchedules = await prisma.vendorBillPaymentSchedule.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
        dueDate: { lt: now },
      },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            amountDue: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json({
      data: {
        windowDays: days,
        upcoming: upcomingSchedules,
        overdue: overdueSchedules,
      },
    });
  } catch (err) {
    logger.error('getDuePaymentAlerts', err);
    res.status(500).json({ error: err.message || 'Failed to fetch due alerts' });
  }
};

async function ensureAccountingPeriodOpen(tenantId, entryDate) {
  const closedPeriod = await prisma.accountingPeriod.findFirst({
    where: {
      tenantId,
      isClosed: true,
      startDate: { lte: entryDate },
      endDate: { gte: entryDate },
    },
    select: { id: true, name: true },
  });
  if (closedPeriod) {
    const err = new Error(`Accounting period is closed: ${closedPeriod.name}`);
    err.code = 'ACCOUNTING_PERIOD_CLOSED';
    throw err;
  }
}

function computeBillAmounts(lines, exchangeRate) {
  // We store amounts on the bill in its currency, and also compute base amounts for posting.
  let subtotal = 0;
  let vatAmount = 0;
  let whtAmount = 0;
  let totalAmount = 0;

  for (const l of lines) {
    const lineSubtotal = roundDecimal(parseFloat(l.lineSubtotal || 0));
    const vat = roundDecimal(parseFloat(l.vatAmount || 0));
    const wht = roundDecimal(parseFloat(l.whtAmount || 0));
    const lineTotal = roundDecimal(lineSubtotal + vat - wht);
    subtotal += lineSubtotal;
    vatAmount += vat;
    whtAmount += wht;
    totalAmount += lineTotal;
  }

  subtotal = roundDecimal(subtotal);
  vatAmount = roundDecimal(vatAmount);
  whtAmount = roundDecimal(whtAmount);
  totalAmount = roundDecimal(totalAmount);

  return { subtotal, vatAmount, whtAmount, totalAmount };
}

async function createVendorBillJournalEntry({ tenantId, bill, lines, createdById }) {
  // Use default tenant accounts:
  // Debit Inventory (1200): subtotal
  // Debit VAT Recoverable (2110): VAT
  // Credit WHT Payable (2200): WHT
  // Credit Accounts Payable (2000): subtotal + VAT - WHT
  const entryDate = bill.billDate || new Date();
  await ensureAccountingPeriodOpen(tenantId, entryDate);

  const accountCodes = ['1200', '2110', '2200', '2000', '1000'];
  const accMap = await getAccountsByCode(tenantId, accountCodes);
  const missing = accountCodes.filter((c) => !accMap[c]);
  if (missing.length) {
    const err = new Error(`Missing chart of accounts codes: ${missing.join(', ')}`);
    err.code = 'MISSING_COA';
    throw err;
  }

  const exchangeRate = bill.exchangeRate || 1;
  const baseSubtotal = toBaseAmount(bill.subtotal, bill.currency, exchangeRate);
  const baseVatAmount = toBaseAmount(bill.vatAmount, bill.currency, exchangeRate);
  const baseWhtAmount = toBaseAmount(bill.whtAmount, bill.currency, exchangeRate);
  const baseTotal = toBaseAmount(bill.totalAmount, bill.currency, exchangeRate);

  // Build journal lines (base currency amounts).
  const journalLines = [];
  if (baseSubtotal > 0) {
    journalLines.push({ accountId: accMap['1200'].id, description: 'Vendor bill - inventory', debit: baseSubtotal, credit: 0 });
  }
  if (baseVatAmount > 0) {
    journalLines.push({ accountId: accMap['2110'].id, description: 'Vendor bill - VAT recoverable', debit: baseVatAmount, credit: 0 });
  }
  if (baseWhtAmount > 0) {
    journalLines.push({ accountId: accMap['2200'].id, description: 'Vendor bill - WHT payable', debit: 0, credit: baseWhtAmount });
  }

  // Credit AP for total net.
  journalLines.push({ accountId: accMap['2000'].id, description: 'Vendor bill - accounts payable', debit: 0, credit: baseTotal });

  // Create posted journal + apply to accounts.
  // Mirror logic from /api/accounts posting (account.routes.js).
  const reference = `VB-${bill.billNumber}`;
  const entry = await prisma.journalEntry.create({
    data: {
      tenantId,
      reference,
      description: `Vendor bill ${bill.billNumber}`,
      date: entryDate,
      currency: BASE_CURRENCY,
      exchangeRate: 1,
      status: 'POSTED',
      sourceType: 'VENDOR_BILL',
      sourceId: bill.id,
      postedAt: new Date(),
      createdById,
      lines: {
        create: journalLines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debit: roundDecimal(l.debit),
          credit: roundDecimal(l.credit),
        })),
      },
    },
    include: { lines: true },
  });

  // Update account balances using signedDelta rule.
  for (const jl of entry.lines) {
    const account = await prisma.account.findFirst({ where: { id: jl.accountId, tenantId } });
    if (!account) continue;
    const net = roundDecimal((jl.debit || 0) - (jl.credit || 0));
    const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
    const signedDelta = isDebitNormal ? net : -net;
    await prisma.account.updateMany({ where: { id: account.id, tenantId }, data: { balance: { increment: signedDelta } } });
  }

  return entry;
}

exports.listVendorBills = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, supplierId, approvalStatus, search } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (approvalStatus) where.approvalStatus = approvalStatus;
    if (search && String(search).trim()) {
      where.OR = [
        { billNumber: { contains: String(search).trim(), mode: 'insensitive' } },
        { supplier: { name: { contains: String(search).trim(), mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.vendorBill.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          lines: { take: 3 },
          paymentSchedules: {
            where: { status: 'PENDING' },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
      }),
      prisma.vendorBill.count({ where }),
    ]);

    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    logger.error('listVendorBills', err);
    res.status(500).json({ error: err.message || 'Failed to list vendor bills' });
  }
};

exports.listPoMatchingCandidates = async (req, res) => {
  try {
    const supplierId = req.query.supplierId ? String(req.query.supplierId) : null;
    const poId = req.query.poId ? String(req.query.poId) : null;
    const where = {
      po: {
        tenantId: req.tenantId,
        status: { in: ['SENT', 'PARTIAL', 'RECEIVED'] },
      },
      receivedQty: { gt: 0 },
    };
    if (supplierId) where.po.supplierId = supplierId;
    if (poId) where.po.id = poId;

    const poLines = await prisma.purchaseOrderLine.findMany({
      where,
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            supplierId: true,
            currency: true,
            supplier: { select: { id: true, name: true } },
          },
        },
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: [{ id: 'desc' }],
      take: 300,
    });

    const lineIds = poLines.map((l) => l.id);
    if (!lineIds.length) return res.json({ data: [] });

    const billedAgg = await prisma.vendorBillLine.groupBy({
      by: ['poLineId'],
      where: {
        poLineId: { in: lineIds },
        bill: { tenantId: req.tenantId, status: { not: 'CANCELLED' } },
      },
      _sum: { matchedQty: true },
    });
    const billedQtyByLine = Object.fromEntries(
      billedAgg.map((row) => [row.poLineId, parseFloat(row._sum.matchedQty || 0)]),
    );

    const candidates = poLines
      .map((line) => {
        const orderedQty = parseFloat(line.quantity || 0);
        const receivedQty = parseFloat(line.receivedQty || 0);
        const billedQty = roundDecimal(billedQtyByLine[line.id] || 0);
        const maxInvoiceableQty = roundDecimal(Math.max(0, Math.min(orderedQty, receivedQty) - billedQty));
        return {
          poLineId: line.id,
          poId: line.poId,
          poNumber: line.po?.poNumber,
          supplierId: line.po?.supplierId,
          supplierName: line.po?.supplier?.name,
          currency: line.po?.currency || 'NGN',
          productId: line.productId,
          productName: line.product?.name || line.description || 'PO line',
          sku: line.product?.sku || null,
          description: line.description || line.product?.name || 'PO line',
          unitPrice: line.unitPrice,
          vatRate: line.vatRate,
          orderedQty,
          receivedQty,
          billedQty,
          maxInvoiceableQty,
        };
      })
      .filter((line) => line.maxInvoiceableQty > 0);

    res.json({ data: candidates });
  } catch (err) {
    logger.error('listPoMatchingCandidates', err);
    res.status(500).json({ error: err.message || 'Failed to fetch PO matching candidates' });
  }
};

exports.getVendorBill = async (req, res) => {
  try {
    const bill = await prisma.vendorBill.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        supplier: true,
        lines: { include: { poLine: true, product: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        paymentSchedules: { orderBy: { dueDate: 'asc' } },
      },
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    res.json({ data: bill });
  } catch (err) {
    logger.error('getVendorBill', err);
    res.status(500).json({ error: err.message || 'Failed to fetch vendor bill' });
  }
};

exports.createVendorBill = async (req, res) => {
  try {
    const { supplierId, billNumber, billDate, dueDate, currency, exchangeRate, notes, lines } = req.body;
    if (!supplierId || !billNumber) return res.status(400).json({ error: 'supplierId and billNumber are required' });
    if (!dueDate) return res.status(400).json({ error: 'dueDate is required' });
    if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ error: 'Vendor bill lines are required' });

    // Validate supplier belongs to tenant.
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId: req.tenantId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    // Validate and normalize PO matching for each line.
    const normalizedLines = [];
    let allSubtotal = 0;
    let allVat = 0;
    let allWht = 0;
    let allTotal = 0;

    // We need PO line data to validate receivedQty.
    const poLineIds = [...new Set(lines.map((l) => l.poLineId).filter(Boolean))];
    if (!poLineIds.length) return res.status(400).json({ error: 'Each vendor bill line must include poLineId for 3-way matching' });

    const poLines = await prisma.purchaseOrderLine.findMany({
      where: { id: { in: poLineIds } },
      include: { po: { select: { tenantId: true, supplierId: true, id: true } }, product: true },
    });
    const poLineMap = {};
    for (const pl of poLines) poLineMap[pl.id] = pl;

    for (const l of lines) {
      const poLineId = l.poLineId;
      if (!poLineId) return res.status(400).json({ error: 'poLineId is required for each vendor bill line' });
      const poLine = poLineMap[poLineId];
      if (!poLine) return res.status(400).json({ error: `Invalid poLineId: ${poLineId}` });
      if (poLine.po.tenantId !== req.tenantId) return res.status(400).json({ error: 'PO line does not belong to your tenant' });
      if (String(poLine.po.supplierId) !== String(supplierId)) {
        return res.status(400).json({ error: 'PO line supplier mismatch' });
      }

      const qty = roundDecimal(parseFloat(l.quantity));
      const unitPrice = roundDecimal(parseFloat(l.unitPrice));
      if (!qty || qty <= 0) return res.status(400).json({ error: 'Line quantity must be > 0' });
      if (!unitPrice || unitPrice < 0) return res.status(400).json({ error: 'Line unitPrice must be >= 0' });

      const receivedQty = roundDecimal(poLine.receivedQty);
      if (qty > receivedQty) {
        return res.status(422).json({ error: 'Three-way matching failed: invoice quantity cannot exceed received quantity', line: { poLineId, receivedQty, qty } });
      }

      const vatRate = l.vatRate != null ? parseFloat(l.vatRate) : parseFloat(poLine.vatRate || 0.075);
      const whtRate = l.whtRate != null ? parseFloat(l.whtRate) : 0;
      const lineSubtotal = roundDecimal(qty * unitPrice);
      const vatAmount = roundDecimal(calculateVAT(lineSubtotal, vatRate));
      const whtAmount = roundDecimal(calculateWHT(lineSubtotal, whtRate));
      const lineTotal = roundDecimal(lineSubtotal + vatAmount - whtAmount);

      const matchStatus = qty === receivedQty ? 'MATCHED' : 'PARTIAL';

      normalizedLines.push({
        poLineId,
        productId: poLine.productId,
        description: l.description || poLine.description || poLine.product?.name || 'Vendor bill line',
        quantity: qty,
        unitPrice,
        vatRate,
        vatAmount,
        whtRate,
        whtAmount,
        lineSubtotal,
        lineTotal,
        matchedQty: qty,
        matchStatus,
      });

      allSubtotal += lineSubtotal;
      allVat += vatAmount;
      allWht += whtAmount;
      allTotal += lineTotal;
    }

    const finalSubtotal = roundDecimal(allSubtotal);
    const finalVat = roundDecimal(allVat);
    const finalWht = roundDecimal(allWht);
    const finalTotal = roundDecimal(allTotal);

    // Tenant currency amounts.
    const billCurrency = currency || supplier.currency || 'NGN';
    const billExchangeRate = exchangeRate != null ? parseFloat(exchangeRate) : 1;

    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.vendorBill.create({
        data: {
          tenantId: req.tenantId,
          supplierId,
          billNumber: String(billNumber).trim(),
          billDate: billDate ? new Date(billDate) : new Date(),
          dueDate: new Date(dueDate),
          currency: billCurrency,
          exchangeRate: billExchangeRate,
          notes: notes ? String(notes) : null,
          status: 'DRAFT',
          subtotal: finalSubtotal,
          vatAmount: finalVat,
          whtAmount: finalWht,
          totalAmount: finalTotal,
          amountPaid: 0,
          amountDue: finalTotal,
          createdById: req.user?.id,
          lines: {
            create: normalizedLines,
          },
        },
        include: { lines: true },
      });
      return created;
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { billNumber: bill.billNumber, totalAmount: bill.totalAmount },
      req,
    });

    res.status(201).json({ data: bill });
  } catch (err) {
    logger.error('createVendorBill', err);
    res.status(500).json({ error: err.message || 'Failed to create vendor bill' });
  }
};

// Approve & post vendor bill to General Ledger
exports.postVendorBill = async (req, res) => {
  try {
    const billId = req.params.id;
    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      include: { lines: true },
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (bill.status !== 'DRAFT' && bill.status !== 'POSTED') {
      return res.status(409).json({ error: `Vendor bill cannot be posted from status ${bill.status}` });
    }
    if (bill.approvalStatus !== 'APPROVED') {
      return res.status(409).json({ error: 'Vendor bill must be approved before posting' });
    }

    const alreadyPosted = bill.status === 'POSTED' && bill.postedAt;
    if (alreadyPosted) return res.json({ data: bill });

    await prisma.$transaction(async (tx) => {
      await tx.vendorBill.update({
        where: { id: billId },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    });

    // Create journal + apply balances.
    const journalEntry = await createVendorBillJournalEntry({
      tenantId: req.tenantId,
      bill,
      lines: bill.lines,
      createdById: req.user?.id,
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'POST',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { status: 'POSTED', journalEntryId: journalEntry.id },
      req,
    });

    const updated = await prisma.vendorBill.findFirst({
      where: { id: billId },
      include: { supplier: true, lines: true, payments: true },
    });
    res.json({ data: updated });
  } catch (err) {
    logger.error('postVendorBill', err);
    res.status(500).json({ error: err.message || 'Failed to post vendor bill' });
  }
};

exports.recordBillPayment = async (req, res) => {
  try {
    const billId = req.params.id;
    const { amount, currency, exchangeRate, method, reference, paidAt, notes, scheduleId } = req.body;

    const settlementAmount = roundDecimal(parseFloat(amount));
    if (!settlementAmount || settlementAmount <= 0) return res.status(422).json({ error: 'amount must be > 0' });

    const { bill, payment } = await apPaymentService.executeVendorPayment({
      tenantId: req.tenantId,
      userId: req.user?.id,
      billId,
      settlementAmount,
      currency,
      exchangeRate,
      method: method || 'BANK_TRANSFER',
      reference,
      paidAt,
      notes,
      scheduleId,
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'PAYMENT',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { amount, reference: payment.reference, status: bill.status },
      req,
    });

    res.json({ data: bill });
  } catch (err) {
    logger.error('recordBillPayment', err);
    if (err.message === 'Vendor bill not found') return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message || 'Failed to record bill payment' });
  }
};

exports.listBillNotes = async (req, res) => {
  try {
    const billId = req.params.id;
    const bill = await prisma.vendorBill.findFirst({ where: { id: billId, tenantId: req.tenantId }, select: { id: true } });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });

    const notes = await prisma.vendorBillPayment.findMany({
      where: {
        tenantId: req.tenantId,
        billId,
        method: { in: ['CREDIT_NOTE', 'DEBIT_NOTE'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: notes });
  } catch (err) {
    logger.error('listBillNotes', err);
    res.status(500).json({ error: err.message || 'Failed to list bill notes' });
  }
};

exports.createBillNote = async (req, res) => {
  try {
    const billId = req.params.id;
    const type = String(req.body?.type || '').toUpperCase();
    const amount = roundDecimal(parseFloat(req.body?.amount || 0));
    const reason = String(req.body?.reason || '').trim();
    const reference = req.body?.reference ? String(req.body.reference).trim() : null;

    if (!['CREDIT', 'DEBIT'].includes(type)) return res.status(400).json({ error: 'type must be CREDIT or DEBIT' });
    if (!amount || amount <= 0) return res.status(422).json({ error: 'amount must be > 0' });
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      select: { id: true, billNumber: true, status: true, amountPaid: true, amountDue: true, totalAmount: true, currency: true, exchangeRate: true },
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (bill.status === 'CANCELLED') return res.status(409).json({ error: 'Cannot apply notes to cancelled bill' });

    if (reference) {
      const existing = await prisma.vendorBillPayment.findFirst({ where: { tenantId: req.tenantId, reference } });
      if (existing) return res.status(409).json({ error: 'Reference already used' });
    }

    let nextAmountDue = roundDecimal(parseFloat(bill.amountDue || 0));
    let nextAmountPaid = roundDecimal(parseFloat(bill.amountPaid || 0));
    if (type === 'CREDIT') {
      nextAmountDue = roundDecimal(Math.max(0, nextAmountDue - amount));
      nextAmountPaid = roundDecimal(nextAmountPaid + amount);
    } else {
      nextAmountDue = roundDecimal(nextAmountDue + amount);
      nextAmountPaid = roundDecimal(Math.max(0, nextAmountPaid - amount));
    }
    const nextStatus = nextAmountDue <= 0 ? 'PAID' : nextAmountPaid > 0 ? 'PARTIAL' : bill.status === 'PAID' ? 'POSTED' : bill.status;

    const method = type === 'CREDIT' ? 'CREDIT_NOTE' : 'DEBIT_NOTE';
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.vendorBillPayment.create({
        data: {
          tenantId: req.tenantId,
          billId: bill.id,
          amount,
          currency: bill.currency || 'NGN',
          exchangeRate: bill.exchangeRate || 1,
          method,
          reference: reference || null,
          status: 'SUCCESS',
          paidAt: new Date(),
          notes: reason,
        },
      });

      await tx.vendorBill.update({
        where: { id: bill.id },
        data: {
          amountDue: nextAmountDue,
          amountPaid: nextAmountPaid,
          status: nextStatus,
        },
      });
      return created;
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: type === 'CREDIT' ? 'APPLY_CREDIT_NOTE' : 'APPLY_DEBIT_NOTE',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: { type, amount, reference: note.reference, reason, amountDue: nextAmountDue, amountPaid: nextAmountPaid, status: nextStatus },
      req,
    });

    res.status(201).json({ data: note });
  } catch (err) {
    logger.error('createBillNote', err);
    res.status(500).json({ error: err.message || 'Failed to create bill note' });
  }
};

exports.getAgedPayables = async (req, res) => {
  try {
    const now = new Date();
    const { asOf, to } = req.query;
    const asOfDate = asOf ? new Date(asOf) : (to ? new Date(to) : now);

    const bills = await prisma.vendorBill.findMany({
      where: {
        tenantId: req.tenantId,
        status: { in: ['POSTED', 'PARTIAL'] },
        amountDue: { gt: 0 },
      },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };
    for (const b of bills) {
      const daysOverdue = Math.floor((asOfDate - new Date(b.dueDate)) / 86400000);
      if (daysOverdue <= 0) buckets.current.push(b);
      else if (daysOverdue <= 30) buckets.days1_30.push(b);
      else if (daysOverdue <= 60) buckets.days31_60.push(b);
      else if (daysOverdue <= 90) buckets.days61_90.push(b);
      else buckets.over90.push(b);
    }

    const summary = Object.fromEntries(
      Object.entries(buckets).map(([k, v]) => [
        k,
        {
          count: v.length,
          total: v.reduce((s, i) => s + parseFloat(i.amountDue || 0), 0),
          bills: v,
        },
      ]),
    );

    res.json({
      data: {
        current: summary.current.total,
        days1_30: summary.days1_30.total,
        days31_60: summary.days31_60.total,
        days61_90: summary.days61_90.total,
        over90: summary.over90.total,
        bills,
        buckets: summary,
      },
    });
  } catch (err) {
    logger.error('getAgedPayables', err);
    res.status(500).json({ error: err.message || 'Failed to generate aged payables' });
  }
};

module.exports = {
  listPoMatchingCandidates: exports.listPoMatchingCandidates,
  listVendorBills: exports.listVendorBills,
  getVendorBill: exports.getVendorBill,
  createVendorBill: exports.createVendorBill,
  submitVendorBillForApproval: exports.submitVendorBillForApproval,
  reviewVendorBillApproval: exports.reviewVendorBillApproval,
  postVendorBill: exports.postVendorBill,
  createBillPaymentSchedule: exports.createBillPaymentSchedule,
  listBillPaymentSchedules: exports.listBillPaymentSchedules,
  listBillNotes: exports.listBillNotes,
  createBillNote: exports.createBillNote,
  getDuePaymentAlerts: exports.getDuePaymentAlerts,
  recordBillPayment: exports.recordBillPayment,
  getAgedPayables: exports.getAgedPayables,
};

