const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { calculateVAT, calculateWHT, paginate, paginatedResponse, roundDecimal } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');

const BASE_CURRENCY = 'NGN';
const AP_PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY'];

function normalizePaymentMethod(method) {
  const value = String(method || 'BANK_TRANSFER').trim().toUpperCase();
  if (!AP_PAYMENT_METHODS.includes(value)) {
    const err = new Error(`Unsupported payment method. Allowed: ${AP_PAYMENT_METHODS.join(', ')}`);
    err.code = 'INVALID_PAYMENT_METHOD';
    throw err;
  }
  return value;
}

function parseMetaJSON(input) {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    return null;
  }
  return null;
}

function toScheduleNotes(userNotes, meta = {}) {
  return JSON.stringify({ userNotes: userNotes || null, apMeta: meta || {} });
}

function fromScheduleNotes(notes) {
  const parsed = parseMetaJSON(notes);
  if (parsed && parsed.apMeta) {
    return {
      userNotes: parsed.userNotes || null,
      apMeta: parsed.apMeta || {},
    };
  }
  return {
    userNotes: notes || null,
    apMeta: {},
  };
}

function paymentApprovalLevelsFor(amount, requestedLevels) {
  const req = requestedLevels != null ? Math.max(1, Math.min(3, parseInt(requestedLevels, 10) || 1)) : null;
  if (req) return req;
  const a = roundDecimal(parseFloat(amount || 0));
  if (a >= 1000000) return 3;
  if (a >= 250000) return 2;
  return 1;
}

function parsePaymentApprovalMeta(payment) {
  const parsed = parseMetaJSON(payment?.gatewayRef);
  if (parsed && typeof parsed.required === 'number') {
    return {
      required: Math.max(1, Math.min(3, parseInt(parsed.required, 10) || 1)),
      current: Math.max(0, parseInt(parsed.current, 10) || 0),
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
      rejectedBy: parsed.rejectedBy || null,
      rejectedAt: parsed.rejectedAt || null,
      rejectionReason: parsed.rejectionReason || null,
    };
  }
  return {
    required: 1,
    current: 0,
    approvals: [],
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  };
}

function approvalRoleAllowedForLevel(role, level) {
  const r = String(role || '').toUpperCase();
  if (level <= 1) return ['OWNER', 'ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(r);
  if (level === 2) return ['OWNER', 'ADMIN', 'MANAGER'].includes(r);
  return ['OWNER', 'ADMIN'].includes(r);
}

async function settleBillPayment({ tx, tenantId, bill, paymentAmount, paymentDate, scheduleId, notes }) {
  const newAmountPaid = roundDecimal(parseFloat(bill.amountPaid || 0) + paymentAmount);
  const newAmountDue = roundDecimal(parseFloat(bill.amountDue || 0) - paymentAmount);
  const newStatus = newAmountDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : bill.status;

  await tx.vendorBill.update({
    where: { id: bill.id },
    data: {
      amountPaid: newAmountPaid,
      amountDue: newAmountDue,
      status: newStatus,
    },
  });

  if (scheduleId) {
    const schedule = await tx.vendorBillPaymentSchedule.findFirst({
      where: { id: scheduleId, tenantId, billId: bill.id, status: 'PENDING' },
    });
    if (schedule) {
      await tx.vendorBillPaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'PAID',
          paidAt: paymentDate,
          notes: notes || schedule.notes || null,
        },
      });
    }
  }

  return { newAmountPaid, newAmountDue, newStatus };
}

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

exports.listBillPayments = async (req, res) => {
  try {
    const billId = req.params.id;
    const rows = await prisma.vendorBillPayment.findMany({
      where: { tenantId: req.tenantId, billId },
      orderBy: { createdAt: 'desc' },
    });
    const data = rows.map((p) => {
      const approval = parsePaymentApprovalMeta(p);
      return {
        ...p,
        approvalRequiredLevels: approval.required,
        approvalCurrentLevel: approval.current,
        approvals: approval.approvals,
      };
    });
    res.json({ data });
  } catch (err) {
    logger.error('listBillPayments', err);
    res.status(500).json({ error: err.message || 'Failed to list bill payments' });
  }
};

exports.approveBillPayment = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const approvalNote = typeof req.body?.note === 'string' ? req.body.note.trim() : null;

    const payment = await prisma.vendorBillPayment.findFirst({
      where: { id: paymentId, tenantId: req.tenantId },
      include: { bill: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'PENDING') return res.status(409).json({ error: 'Only pending payments can be approved' });

    const approval = parsePaymentApprovalMeta(payment);
    const nextLevel = approval.current + 1;
    if (!approvalRoleAllowedForLevel(req.user?.role, nextLevel)) {
      return res.status(403).json({ error: `Role ${req.user?.role || 'UNKNOWN'} cannot approve level ${nextLevel}` });
    }

    approval.current = nextLevel;
    approval.approvals.push({
      level: nextLevel,
      approverId: req.user?.id || null,
      approverRole: req.user?.role || null,
      note: approvalNote || null,
      approvedAt: new Date().toISOString(),
    });

    const finalApproval = approval.current >= approval.required;
    const approvedPayment = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.vendorBillPayment.update({
        where: { id: payment.id },
        data: {
          gatewayRef: JSON.stringify(approval),
          status: finalApproval ? 'SUCCESS' : 'PENDING',
          paidAt: finalApproval ? new Date() : payment.paidAt,
          notes: approvalNote ? [payment.notes, `Approval L${nextLevel}: ${approvalNote}`].filter(Boolean).join(' | ') : payment.notes,
        },
      });

      if (finalApproval) {
        await settleBillPayment({
          tx,
          tenantId: req.tenantId,
          bill: payment.bill,
          paymentAmount: roundDecimal(parseFloat(payment.amount || 0)),
          paymentDate: new Date(),
          scheduleId: null,
          notes: updatedPayment.notes,
        });
      }

      return updatedPayment;
    });

    if (finalApproval) {
      await createPaymentJournalEntry({
        tenantId: req.tenantId,
        bill: payment.bill,
        payment: approvedPayment,
        createdById: req.user?.id,
      });
    }

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: finalApproval ? 'APPROVE_PAYMENT_FINAL' : 'APPROVE_PAYMENT_LEVEL',
      resource: 'VendorBillPayment',
      resourceId: payment.id,
      newValues: { approvalCurrent: approval.current, approvalRequired: approval.required, status: approvedPayment.status },
      req,
    });

    res.json({
      data: {
        payment: approvedPayment,
        approval,
        finalized: finalApproval,
      },
    });
  } catch (err) {
    logger.error('approveBillPayment', err);
    res.status(500).json({ error: err.message || 'Failed to approve payment' });
  }
};

exports.rejectBillPayment = async (req, res) => {
  try {
    const paymentId = req.params.paymentId;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : 'Rejected during payment approval';

    const payment = await prisma.vendorBillPayment.findFirst({ where: { id: paymentId, tenantId: req.tenantId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'PENDING') return res.status(409).json({ error: 'Only pending payments can be rejected' });

    const approval = parsePaymentApprovalMeta(payment);
    approval.rejectedBy = req.user?.id || null;
    approval.rejectedAt = new Date().toISOString();
    approval.rejectionReason = reason;

    const updated = await prisma.vendorBillPayment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        gatewayRef: JSON.stringify(approval),
        notes: [payment.notes, `Rejected: ${reason}`].filter(Boolean).join(' | '),
      },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'REJECT_PAYMENT',
      resource: 'VendorBillPayment',
      resourceId: payment.id,
      newValues: { status: 'FAILED', reason },
      req,
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('rejectBillPayment', err);
    res.status(500).json({ error: err.message || 'Failed to reject payment' });
  }
};

exports.getEarlyPaymentDiscountQuote = async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;
    const schedule = await prisma.vendorBillPaymentSchedule.findFirst({
      where: { id: scheduleId, tenantId: req.tenantId },
      include: { bill: true },
    });
    if (!schedule) return res.status(404).json({ error: 'Payment schedule not found' });

    const parsed = fromScheduleNotes(schedule.notes);
    const rate = parseFloat(parsed.apMeta?.earlyDiscountRate || 0);
    const deadline = parsed.apMeta?.earlyDiscountDeadline ? new Date(parsed.apMeta.earlyDiscountDeadline) : null;
    const now = new Date();
    const eligible = rate > 0 && deadline && now <= deadline && now < new Date(schedule.bill?.dueDate);
    const amount = roundDecimal(parseFloat(schedule.amount || 0));
    const discountAmount = eligible ? roundDecimal(amount * rate) : 0;

    res.json({
      data: {
        scheduleId: schedule.id,
        billId: schedule.billId,
        amount,
        earlyDiscountRate: rate,
        earlyDiscountDeadline: deadline,
        eligible,
        discountAmount,
        payableAfterDiscount: roundDecimal(amount - discountAmount),
      },
    });
  } catch (err) {
    logger.error('getEarlyPaymentDiscountQuote', err);
    res.status(500).json({ error: err.message || 'Failed to compute early payment discount quote' });
  }
};

exports.executeAutomaticPaymentRun = async (req, res) => {
  req.body = { ...(req.body || {}), autoOnly: true };
  return exports.executeBatchPaymentRun(req, res);
};

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

exports.executeBatchPaymentRun = async (req, res) => {
  try {
    const {
      dueTo,
      limit = 100,
      method = 'BANK_TRANSFER',
      dryRun = false,
      notes,
      autoOnly = false,
    } = req.body || {};

    const limitNum = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));
    const dueToDate = dueTo ? new Date(dueTo) : new Date();

    const schedulesRaw = await prisma.vendorBillPaymentSchedule.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
        dueDate: { lte: dueToDate },
        bill: {
          status: { in: ['POSTED', 'PARTIAL'] },
          amountDue: { gt: 0 },
        },
      },
      include: {
        bill: {
          include: {
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limitNum,
    });

    const schedules = schedulesRaw.filter((s) => {
      if (!autoOnly) return true;
      const meta = fromScheduleNotes(s.notes).apMeta || {};
      return !!meta.autoExecute;
    });

    if (dryRun) {
      return res.json({
        data: {
          dryRun: true,
          count: schedules.length,
          totalPlanned: roundDecimal(schedules.reduce((s, x) => s + parseFloat(x.amount || 0), 0)),
          schedules: schedules.map((s) => ({
            scheduleId: s.id,
            billId: s.billId,
            billNumber: s.bill?.billNumber,
            supplierName: s.bill?.supplier?.name,
            dueDate: s.dueDate,
            amount: s.amount,
            amountDue: s.bill?.amountDue,
          })),
        },
      });
    }

    const success = [];
    const failed = [];

    for (const schedule of schedules) {
      const bill = schedule.bill;
      const payable = roundDecimal(Math.min(parseFloat(schedule.amount || 0), parseFloat(bill.amountDue || 0)));
      if (payable <= 0) {
        failed.push({ scheduleId: schedule.id, reason: 'No payable amount remaining' });
        continue;
      }

      try {
        const scheduleMeta = fromScheduleNotes(schedule.notes).apMeta || {};
        const effectiveMethod = normalizePaymentMethod(scheduleMeta.paymentMethod || method || 'BANK_TRANSFER');
        const requiredLevels = paymentApprovalLevelsFor(payable, scheduleMeta.approvalLevels);
        const shouldProcessNow = requiredLevels <= 1;

        const payment = await prisma.$transaction(async (tx) => {
          const createdPayment = await tx.vendorBillPayment.create({
            data: {
              tenantId: req.tenantId,
              billId: bill.id,
              amount: payable,
              currency: bill.currency || 'NGN',
              exchangeRate: bill.exchangeRate || 1,
              method: effectiveMethod,
              reference: `BATCH-${schedule.id}-${Date.now()}`,
              status: shouldProcessNow ? 'SUCCESS' : 'PENDING',
              paidAt: shouldProcessNow ? new Date() : null,
              notes: notes ? String(notes).trim() : `Batch payment run for due schedule ${schedule.id}`,
              gateway: shouldProcessNow ? null : 'AP_APPROVAL',
              gatewayRef: shouldProcessNow
                ? null
                : JSON.stringify({ required: requiredLevels, current: 0, approvals: [], createdBy: req.user?.id || null }),
            },
          });

          if (shouldProcessNow) {
            await settleBillPayment({
              tx,
              tenantId: req.tenantId,
              bill,
              paymentAmount: payable,
              paymentDate: new Date(),
              scheduleId: schedule.id,
              notes: createdPayment.notes,
            });
          }

          return createdPayment;
        });

        if (payment.status === 'SUCCESS') {
          await createPaymentJournalEntry({
            tenantId: req.tenantId,
            bill,
            payment,
            createdById: req.user?.id,
          });
        }

        success.push({
          scheduleId: schedule.id,
          billId: bill.id,
          paymentId: payment.id,
          amount: payable,
          paymentStatus: payment.status,
          requiredApprovals: parsePaymentApprovalMeta(payment).required,
        });
      } catch (err) {
        failed.push({ scheduleId: schedule.id, reason: err.message || 'Failed to pay schedule' });
      }
    }

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'BATCH_PAYMENT_RUN',
      resource: 'VendorBillPaymentSchedule',
      resourceId: null,
      newValues: { processed: schedules.length, success: success.length, failed: failed.length },
      req,
    });

    res.json({
      data: {
        processed: schedules.length,
        successCount: success.length,
        failedCount: failed.length,
        success,
        failed,
      },
    });
  } catch (err) {
    logger.error('executeBatchPaymentRun', err);
    res.status(500).json({ error: err.message || 'Failed to execute batch payment run' });
  }
};

exports.getVendorStatement = async (req, res) => {
  try {
    const supplierId = req.params.supplierId;
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId: req.tenantId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const bills = await prisma.vendorBill.findMany({
      where: { tenantId: req.tenantId, supplierId },
      include: {
        lines: { select: { id: true, lineTotal: true, whtAmount: true } },
        payments: { select: { id: true, amount: true, paidAt: true, reference: true } },
      },
      orderBy: [{ billDate: 'asc' }, { createdAt: 'asc' }],
    });

    const totals = bills.reduce((acc, b) => {
      acc.invoiced += parseFloat(b.totalAmount || 0);
      acc.paid += parseFloat(b.amountPaid || 0);
      acc.outstanding += parseFloat(b.amountDue || 0);
      acc.wht += parseFloat(b.whtAmount || 0);
      return acc;
    }, { invoiced: 0, paid: 0, outstanding: 0, wht: 0 });

    const now = new Date();
    const overdueTotal = bills.reduce((sum, b) => {
      if (parseFloat(b.amountDue || 0) > 0 && new Date(b.dueDate) < now) return sum + parseFloat(b.amountDue || 0);
      return sum;
    }, 0);

    res.json({
      data: {
        supplier: { id: supplier.id, name: supplier.name, currency: supplier.currency },
        totals: {
          invoiced: roundDecimal(totals.invoiced),
          paid: roundDecimal(totals.paid),
          outstanding: roundDecimal(totals.outstanding),
          overdue: roundDecimal(overdueTotal),
          whtWithheld: roundDecimal(totals.wht),
        },
        bills,
      },
    });
  } catch (err) {
    logger.error('getVendorStatement', err);
    res.status(500).json({ error: err.message || 'Failed to fetch vendor statement' });
  }
};

exports.getWhtRemittanceReport = async (req, res) => {
  try {
    const now = new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const bills = await prisma.vendorBill.findMany({
      where: {
        tenantId: req.tenantId,
        billDate: { gte: from, lte: to },
        status: { in: ['POSTED', 'PARTIAL', 'PAID'] },
      },
      include: {
        supplier: { select: { id: true, name: true, tin: true } },
        lines: { select: { id: true, whtRate: true, whtAmount: true, lineSubtotal: true } },
      },
      orderBy: { billDate: 'asc' },
    });

    const bySupplier = {};
    let totalWht = 0;

    for (const bill of bills) {
      const supplierKey = bill.supplierId;
      if (!bySupplier[supplierKey]) {
        bySupplier[supplierKey] = {
          supplierId: supplierKey,
          supplierName: bill.supplier?.name || 'Unknown Supplier',
          supplierTin: bill.supplier?.tin || null,
          billCount: 0,
          taxableBase: 0,
          whtAmount: 0,
        };
      }
      bySupplier[supplierKey].billCount += 1;
      bySupplier[supplierKey].taxableBase += (bill.lines || []).reduce((s, l) => s + parseFloat(l.lineSubtotal || 0), 0);
      bySupplier[supplierKey].whtAmount += parseFloat(bill.whtAmount || 0);
      totalWht += parseFloat(bill.whtAmount || 0);
    }

    const supplierRows = Object.values(bySupplier).map((row) => ({
      ...row,
      taxableBase: roundDecimal(row.taxableBase),
      whtAmount: roundDecimal(row.whtAmount),
    }));

    res.json({
      data: {
        from,
        to,
        totals: {
          bills: bills.length,
          whtAmount: roundDecimal(totalWht),
        },
        bySupplier: supplierRows,
        bills,
      },
    });
  } catch (err) {
    logger.error('getWhtRemittanceReport', err);
    res.status(500).json({ error: err.message || 'Failed to generate WHT remittance report' });
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
    const {
      amount,
      dueDate,
      notes,
      paymentMethod = 'BANK_TRANSFER',
      autoExecute = false,
      approvalLevels,
      earlyDiscountRate,
      earlyDiscountDeadline,
    } = req.body;
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

    const normalizedMethod = normalizePaymentMethod(paymentMethod);
    const levels = paymentApprovalLevelsFor(scheduleAmount, approvalLevels);
    const discountRateNum = earlyDiscountRate != null ? Math.max(0, Math.min(parseFloat(earlyDiscountRate) || 0, 0.5)) : 0;

    const schedule = await prisma.vendorBillPaymentSchedule.create({
      data: {
        tenantId: req.tenantId,
        billId,
        amount: scheduleAmount,
        dueDate: new Date(dueDate),
        notes: toScheduleNotes(notes ? String(notes).trim() : null, {
          paymentMethod: normalizedMethod,
          autoExecute: !!autoExecute,
          approvalLevels: levels,
          earlyDiscountRate: discountRateNum,
          earlyDiscountDeadline: earlyDiscountDeadline ? new Date(earlyDiscountDeadline).toISOString() : null,
        }),
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
    const mapped = rows.map((r) => {
      const parsed = fromScheduleNotes(r.notes);
      return {
        ...r,
        notes: parsed.userNotes,
        paymentMethod: parsed.apMeta?.paymentMethod || 'BANK_TRANSFER',
        autoExecute: !!parsed.apMeta?.autoExecute,
        approvalLevels: parsed.apMeta?.approvalLevels || 1,
        earlyDiscountRate: parsed.apMeta?.earlyDiscountRate || 0,
        earlyDiscountDeadline: parsed.apMeta?.earlyDiscountDeadline || null,
      };
    });
    res.json({ data: mapped });
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

async function createPaymentJournalEntry({ tenantId, bill, payment, createdById }) {
  const entryDate = payment.paidAt || new Date();
  await ensureAccountingPeriodOpen(tenantId, entryDate);

  const accountCodes = ['2000', '1000']; // AP and cash/bank
  const accMap = await getAccountsByCode(tenantId, accountCodes);
  const missing = accountCodes.filter((c) => !accMap[c]);
  if (missing.length) throw new Error(`Missing chart of accounts codes: ${missing.join(', ')}`);

  // Enforce payment currency == bill currency for now.
  const exchangeRate = payment.exchangeRate || bill.exchangeRate || 1;
  const baseAmount = toBaseAmount(payment.amount, payment.currency, exchangeRate);

  const journalEntry = await prisma.journalEntry.create({
    data: {
      tenantId,
      reference: payment.reference || `APAY-${payment.id}`,
      description: `Vendor bill payment for ${bill.billNumber}`,
      date: entryDate,
      currency: BASE_CURRENCY,
      exchangeRate: 1,
      status: 'POSTED',
      sourceType: 'VENDOR_BILL_PAYMENT',
      sourceId: payment.id,
      postedAt: new Date(),
      createdById,
      lines: {
        create: [
          {
            accountId: accMap['2000'].id,
            description: 'Vendor bill payment - accounts payable',
            debit: baseAmount,
            credit: 0,
          },
          {
            accountId: accMap['1000'].id,
            description: 'Vendor bill payment - cash/bank',
            debit: 0,
            credit: baseAmount,
          },
        ],
      },
    },
    include: { lines: true },
  });

  for (const jl of journalEntry.lines) {
    const account = await prisma.account.findFirst({ where: { id: jl.accountId, tenantId } });
    if (!account) continue;
    const net = roundDecimal((jl.debit || 0) - (jl.credit || 0));
    const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';
    const signedDelta = isDebitNormal ? net : -net;
    await prisma.account.updateMany({ where: { id: account.id, tenantId }, data: { balance: { increment: signedDelta } } });
  }

  return journalEntry;
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
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
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
    const {
      supplierId,
      billNumber,
      billDate,
      dueDate,
      currency,
      exchangeRate,
      notes,
      lines,
      matchingMode,
    } = req.body;
    if (!supplierId || !billNumber) return res.status(400).json({ error: 'supplierId and billNumber are required' });
    if (!dueDate) return res.status(400).json({ error: 'dueDate is required' });
    if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ error: 'Vendor bill lines are required' });

    // Validate supplier belongs to tenant.
    const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, tenantId: req.tenantId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const existingByNumber = await prisma.vendorBill.findFirst({
      where: {
        tenantId: req.tenantId,
        supplierId,
        billNumber: String(billNumber).trim(),
      },
      select: { id: true, billNumber: true },
    });
    if (existingByNumber) {
      return res.status(409).json({ error: 'Duplicate billNumber for this supplier' });
    }

    const normalizedMatchingMode = String(matchingMode || '').toUpperCase() === 'THREE_WAY' ? 'THREE_WAY' : 'TWO_WAY';

    // Validate and normalize PO matching for each line.
    const normalizedLines = [];
    let allSubtotal = 0;
    let allVat = 0;
    let allWht = 0;
    let allTotal = 0;

    // PO matching can be two-way (PO vs invoice) or three-way (PO vs receipt vs invoice).
    const poLineIds = [...new Set(lines.map((l) => l.poLineId).filter(Boolean))];
    if (normalizedMatchingMode === 'THREE_WAY' && !poLineIds.length) {
      return res.status(400).json({ error: 'poLineId is required for THREE_WAY matching' });
    }

    const poLines = poLineIds.length
      ? await prisma.purchaseOrderLine.findMany({
        where: { id: { in: poLineIds } },
        include: { po: { select: { tenantId: true, supplierId: true, id: true } }, product: true },
      })
      : [];
    const poLineMap = {};
    for (const pl of poLines) poLineMap[pl.id] = pl;

    for (const l of lines) {
      const poLineId = l.poLineId;
      const poLine = poLineId ? poLineMap[poLineId] : null;
      if (poLineId && !poLine) return res.status(400).json({ error: `Invalid poLineId: ${poLineId}` });
      if (poLine && poLine.po.tenantId !== req.tenantId) return res.status(400).json({ error: 'PO line does not belong to your tenant' });
      if (poLine && String(poLine.po.supplierId) !== String(supplierId)) {
        return res.status(400).json({ error: 'PO line supplier mismatch' });
      }
      if (normalizedMatchingMode === 'THREE_WAY' && !poLineId) {
        return res.status(400).json({ error: 'poLineId is required for each line in THREE_WAY matching mode' });
      }

      const qty = roundDecimal(parseFloat(l.quantity));
      const unitPrice = roundDecimal(parseFloat(l.unitPrice));
      if (!qty || qty <= 0) return res.status(400).json({ error: 'Line quantity must be > 0' });
      if (!unitPrice || unitPrice < 0) return res.status(400).json({ error: 'Line unitPrice must be >= 0' });

      if (poLine && normalizedMatchingMode === 'THREE_WAY') {
        const receivedQty = roundDecimal(poLine.receivedQty);
        if (qty > receivedQty) {
          return res.status(422).json({ error: 'Three-way matching failed: invoice quantity cannot exceed received quantity', line: { poLineId, receivedQty, qty } });
        }
      }

      const vatRate = l.vatRate != null ? parseFloat(l.vatRate) : parseFloat(poLine?.vatRate || 0.075);
      const whtRate = l.whtRate != null ? parseFloat(l.whtRate) : 0;
      const lineSubtotal = roundDecimal(qty * unitPrice);
      const vatAmount = roundDecimal(calculateVAT(lineSubtotal, vatRate));
      const whtAmount = roundDecimal(calculateWHT(lineSubtotal, whtRate));
      const lineTotal = roundDecimal(lineSubtotal + vatAmount - whtAmount);

      let matchedQty = 0;
      let matchStatus = 'UNMATCHED';
      if (poLine) {
        if (normalizedMatchingMode === 'THREE_WAY') {
          const receivedQty = roundDecimal(poLine.receivedQty);
          matchedQty = qty;
          matchStatus = qty === receivedQty ? 'MATCHED' : 'PARTIAL';
        } else {
          const orderedQty = roundDecimal(poLine.quantity);
          matchedQty = Math.min(qty, orderedQty);
          matchStatus = qty <= orderedQty ? 'MATCHED' : 'PARTIAL';
        }
      }

      normalizedLines.push({
        poLineId: poLineId || null,
        productId: poLine?.productId || l.productId || null,
        description: l.description || poLine?.description || poLine?.product?.name || 'Vendor bill line',
        quantity: qty,
        unitPrice,
        vatRate,
        vatAmount,
        whtRate,
        whtAmount,
        lineSubtotal,
        lineTotal,
        matchedQty,
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
      newValues: { billNumber: bill.billNumber, totalAmount: bill.totalAmount, matchingMode: normalizedMatchingMode },
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
    const {
      amount,
      currency,
      exchangeRate,
      method,
      reference,
      paidAt,
      notes,
      scheduleId,
      processNow = true,
      approvalLevels,
    } = req.body;

    const bill = await prisma.vendorBill.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      include: { payments: true },
    });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });
    if (bill.status === 'CANCELLED') return res.status(409).json({ error: 'Cannot pay a cancelled bill' });

    const paymentAmount = roundDecimal(parseFloat(amount));
    if (!paymentAmount || paymentAmount <= 0) return res.status(422).json({ error: 'amount must be > 0' });

    const normalizedMethod = normalizePaymentMethod(method || 'BANK_TRANSFER');

    // Enforce same currency for now.
    const payCurrency = currency || bill.currency || 'NGN';
    if (String(payCurrency) !== String(bill.currency)) {
      return res.status(422).json({ error: 'Multi-currency payments for AP are not implemented yet. Payment currency must match the bill currency.' });
    }

    const payExchangeRate = exchangeRate != null ? parseFloat(exchangeRate) : bill.exchangeRate || 1;

    // Idempotency by reference, when provided.
    if (reference) {
      const existing = await prisma.vendorBillPayment.findFirst({ where: { reference, tenantId: req.tenantId } });
      if (existing) return res.status(409).json({ error: 'Payment reference already used' });
    }

    if (paymentAmount > bill.amountDue) {
      return res.status(422).json({
        error: 'Payment amount cannot exceed amount due',
        amountDue: bill.amountDue,
        attemptedAmount: paymentAmount,
      });
    }

    const newAmountPaid = roundDecimal(bill.amountPaid + paymentAmount);
    const newAmountDue = roundDecimal(bill.amountDue - paymentAmount);
    if (newAmountDue === bill.amountDue) {
      return res.status(409).json({ error: 'Payment did not reduce amount due' });
    }

    const newStatus = newAmountDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : bill.status;
    const requiredLevels = paymentApprovalLevelsFor(paymentAmount, approvalLevels);
    const shouldProcessNow = !!processNow && requiredLevels <= 1;

    const payment = await prisma.$transaction(async (tx) => {
      let schedule = null;
      if (scheduleId) {
        schedule = await tx.vendorBillPaymentSchedule.findFirst({
          where: { id: scheduleId, tenantId: req.tenantId, billId, status: 'PENDING' },
        });
        if (!schedule) throw new Error('Payment schedule not found or already settled');
      }

      const createdPayment = await tx.vendorBillPayment.create({
        data: {
          tenantId: req.tenantId,
          billId,
          amount: paymentAmount,
          currency: payCurrency,
          exchangeRate: payExchangeRate,
          method: normalizedMethod,
          reference: reference || null,
          status: shouldProcessNow ? 'SUCCESS' : 'PENDING',
          paidAt: shouldProcessNow ? (paidAt ? new Date(paidAt) : new Date()) : null,
          notes: notes || null,
          gateway: shouldProcessNow ? null : 'AP_APPROVAL',
          gatewayRef: shouldProcessNow
            ? null
            : JSON.stringify({ required: requiredLevels, current: 0, approvals: [], createdBy: req.user?.id || null }),
        },
      });

      if (shouldProcessNow) {
        await settleBillPayment({
          tx,
          tenantId: req.tenantId,
          bill,
          paymentAmount,
          paymentDate: paidAt ? new Date(paidAt) : new Date(),
          scheduleId: schedule?.id || null,
          notes: notes || null,
        });
      }

      return createdPayment;
    });

    if (payment.status === 'SUCCESS') {
      await createPaymentJournalEntry({
        tenantId: req.tenantId,
        bill,
        payment,
        createdById: req.user?.id,
      });
    }

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'PAYMENT',
      resource: 'VendorBill',
      resourceId: bill.id,
      newValues: {
        amount,
        reference: payment.reference,
        billStatus: payment.status === 'SUCCESS' ? newStatus : bill.status,
        paymentStatus: payment.status,
        requiredApprovals: requiredLevels,
      },
      req,
    });

    const updated = await prisma.vendorBill.findFirst({
      where: { id: billId, tenantId: req.tenantId },
      include: {
        supplier: true,
        lines: { include: { poLine: true } },
        payments: true,
        paymentSchedules: { orderBy: { dueDate: 'asc' } },
      },
    });

    res.json({ data: updated });
  } catch (err) {
    logger.error('recordBillPayment', err);
    res.status(500).json({ error: err.message || 'Failed to record bill payment' });
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

exports.getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {
      tenantId: req.tenantId,
      bill: { status: { in: ['POSTED', 'PARTIAL'] } },
    };

    if (status) where.status = status;
    if (method) where.method = normalizePaymentMethod(method);

    const [data, total] = await Promise.all([
      prisma.vendorBillPayment.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: {
            select: {
              id: true,
              billNumber: true,
              dueDate: true,
              amountDue: true,
              status: true,
              supplier: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.vendorBillPayment.count({ where }),
    ]);

    const now = new Date();
    const enriched = data.map(payment => {
      const daysUntilDue = Math.ceil((new Date(payment.bill.dueDate) - now) / (1000 * 60 * 60 * 24));
      const approvalMeta = parseMetaJSON(payment.gatewayRef);
      return {
        ...payment,
        daysUntilDue,
        approvalCurrentLevel: approvalMeta?.current || 0,
        approvalRequiredLevels: approvalMeta?.required || 1,
      };
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err) {
    logger.error('getPendingPayments', err);
    res.status(500).json({ error: err.message || 'Failed to fetch pending payments' });
  }
};

exports.getPaymentStats = async (req, res) => {
  try {
    const now = new Date();

    // Pending payments count and amount
    const pendingPayments = await prisma.vendorBillPayment.findMany({
      where: { tenantId: req.tenantId, status: 'PENDING' },
      select: { amount: true },
    });
    const pendingCount = pendingPayments.length;
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Due today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const dueToday = await prisma.vendorBillPaymentSchedule.count({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
        dueDate: { gte: startOfToday, lt: endOfToday },
      },
    });

    // Early discounts available
    const schedulesWithEarlyDiscount = await prisma.vendorBillPaymentSchedule.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
        notes: { contains: '"apMeta"' },
      },
      select: { amount: true, notes: true },
    });

    let earlyDiscountCount = 0;
    let earlyDiscountSavings = 0;
    for (const schedule of schedulesWithEarlyDiscount) {
      const notes = fromScheduleNotes(schedule.notes);
      if (notes.apMeta?.earlyDiscountRate) {
        earlyDiscountCount++;
        earlyDiscountSavings += parseFloat(schedule.amount || 0) * notes.apMeta.earlyDiscountRate;
      }
    }

    // Payments awaiting approval
    const awaitingApproval = await prisma.vendorBillPayment.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'PENDING',
      },
      select: { gatewayRef: true },
    });

    let awaitingApprovalCount = 0;
    for (const payment of awaitingApproval) {
      const approvalMeta = parseMetaJSON(payment.gatewayRef);
      if (approvalMeta?.required && approvalMeta?.current && approvalMeta.current < approvalMeta.required) {
        awaitingApprovalCount++;
      }
    }

    res.json({
      data: {
        pendingCount,
        pendingAmount: roundDecimal(pendingAmount),
        dueToday,
        earlyDiscountCount,
        earlyDiscountSavings: roundDecimal(earlyDiscountSavings),
        awaitingApprovalCount,
      },
    });
  } catch (err) {
    logger.error('getPaymentStats', err);
    res.status(500).json({ error: err.message || 'Failed to fetch payment statistics' });
  }
};

exports.getPaymentsAwaitingApproval = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { take, skip } = paginate(page, limit);

    const allPayments = await prisma.vendorBillPayment.findMany({
      where: { tenantId: req.tenantId },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            dueDate: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for payments awaiting approval or matching status
    const filtered = allPayments.filter(payment => {
      const approvalMeta = parseMetaJSON(payment.gatewayRef);
      if (status === 'PENDING') {
        return approvalMeta?.required && approvalMeta.current < approvalMeta.required;
      } else if (status === 'APPROVED') {
        return approvalMeta?.required && approvalMeta.current === approvalMeta.required && payment.status === 'APPROVED';
      } else if (status === 'REJECTED') {
        return approvalMeta?.rejected === true;
      }
      return approvalMeta?.required && approvalMeta.current < approvalMeta.required;
    });

    const paginated = filtered.slice(skip, skip + take);
    const total = filtered.length;

    const enriched = paginated.map(payment => {
      const approvalMeta = parseMetaJSON(payment.gatewayRef);
      return {
        ...payment,
        approvalCurrentLevel: approvalMeta?.current || 0,
        approvalRequiredLevels: approvalMeta?.required || 1,
        approvalHistory: approvalMeta?.approvals || [],
      };
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err) {
    logger.error('getPaymentsAwaitingApproval', err);
    res.status(500).json({ error: err.message || 'Failed to fetch payments awaiting approval' });
  }
};

exports.listPaymentSchedules = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, billId } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };

    if (status) where.status = status;
    if (billId) where.billId = billId;

    const [data, total] = await Promise.all([
      prisma.vendorBillPaymentSchedule.findMany({
        where,
        take,
        skip,
        orderBy: { dueDate: 'asc' },
        include: {
          bill: {
            select: {
              id: true,
              billNumber: true,
              supplier: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.vendorBillPaymentSchedule.count({ where }),
    ]);

    const enriched = data.map(schedule => {
      const notes = fromScheduleNotes(schedule.notes);
      return {
        ...schedule,
        notes: notes.userNotes,
        earlyDiscountRate: notes.apMeta?.earlyDiscountRate || 0,
        earlyDiscountDeadline: notes.apMeta?.earlyDiscountDeadline,
      };
    });

    res.json(paginatedResponse(enriched, total, page, limit));
  } catch (err) {
    logger.error('listPaymentSchedules', err);
    res.status(500).json({ error: err.message || 'Failed to list payment schedules' });
  }
};

module.exports = {
  listVendorBills: exports.listVendorBills,
  getVendorBill: exports.getVendorBill,
  createVendorBill: exports.createVendorBill,
  submitVendorBillForApproval: exports.submitVendorBillForApproval,
  reviewVendorBillApproval: exports.reviewVendorBillApproval,
  postVendorBill: exports.postVendorBill,
  createBillPaymentSchedule: exports.createBillPaymentSchedule,
  listBillPaymentSchedules: exports.listBillPaymentSchedules,
  listPaymentSchedules: exports.listPaymentSchedules,
  getDuePaymentAlerts: exports.getDuePaymentAlerts,
  recordBillPayment: exports.recordBillPayment,
  listBillPayments: exports.listBillPayments,
  approveBillPayment: exports.approveBillPayment,
  rejectBillPayment: exports.rejectBillPayment,
  getEarlyPaymentDiscountQuote: exports.getEarlyPaymentDiscountQuote,
  getAgedPayables: exports.getAgedPayables,
  executeBatchPaymentRun: exports.executeBatchPaymentRun,
  executeAutomaticPaymentRun: exports.executeAutomaticPaymentRun,
  getVendorStatement: exports.getVendorStatement,
  getWhtRemittanceReport: exports.getWhtRemittanceReport,
  getPendingPayments: exports.getPendingPayments,
  getPaymentStats: exports.getPaymentStats,
  getPaymentsAwaitingApproval: exports.getPaymentsAwaitingApproval,
};

