const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse, roundDecimal } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const apPaymentService = require('../services/apPayment.service');

function canApproveLevel1(role) {
  return ['OWNER', 'ADMIN', 'ACCOUNTANT'].includes(role);
}
function canApproveLevel2(role) {
  return ['OWNER', 'ADMIN'].includes(role);
}

exports.listApPayments = async (req, res) => {
  try {
    const { page = 1, limit = 30, status, method, billId } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = {
      tenantId: req.tenantId,
      method: { notIn: ['CREDIT_NOTE', 'DEBIT_NOTE'] },
    };
    if (status) where.status = status;
    if (method) where.method = method;
    if (billId) where.billId = billId;

    const [data, total] = await Promise.all([
      prisma.vendorBillPayment.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          bill: { select: { id: true, billNumber: true, amountDue: true, currency: true, supplier: { select: { name: true } } } },
          batch: { select: { id: true, reference: true, status: true } },
        },
      }),
      prisma.vendorBillPayment.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    logger.error('listApPayments', err);
    res.status(500).json({ error: err.message || 'Failed to list payments' });
  }
};

exports.patchVendorBillEarlyPayment = async (req, res) => {
  try {
    const billId = req.params.id;
    const { earlyPaymentDiscountPercent, earlyPaymentDeadline } = req.body;
    const bill = await prisma.vendorBill.findFirst({ where: { id: billId, tenantId: req.tenantId } });
    if (!bill) return res.status(404).json({ error: 'Vendor bill not found' });

    const data = {};
    if (earlyPaymentDiscountPercent !== undefined) {
      data.earlyPaymentDiscountPercent = earlyPaymentDiscountPercent === null || earlyPaymentDiscountPercent === ''
        ? null
        : roundDecimal(parseFloat(earlyPaymentDiscountPercent));
    }
    if (earlyPaymentDeadline !== undefined) {
      data.earlyPaymentDeadline = earlyPaymentDeadline ? new Date(earlyPaymentDeadline) : null;
    }

    const updated = await prisma.vendorBill.update({ where: { id: billId }, data });
    res.json({ data: updated });
  } catch (err) {
    logger.error('patchVendorBillEarlyPayment', err);
    res.status(500).json({ error: err.message || 'Failed to update bill' });
  }
};

exports.listPaymentBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.apPaymentBatch.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: {
            include: {
              bill: { select: { id: true, billNumber: true, supplierId: true, amountDue: true, currency: true } },
            },
          },
        },
      }),
      prisma.apPaymentBatch.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    logger.error('listPaymentBatches', err);
    res.status(500).json({ error: err.message || 'Failed to list payment batches' });
  }
};

exports.getPaymentBatch = async (req, res) => {
  try {
    const batch = await prisma.apPaymentBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        lines: {
          include: {
            bill: { include: { supplier: { select: { id: true, name: true } } } },
            schedule: true,
            payment: true,
          },
        },
      },
    });
    if (!batch) return res.status(404).json({ error: 'Payment batch not found' });
    res.json({ data: batch });
  } catch (err) {
    logger.error('getPaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to load batch' });
  }
};

exports.createPaymentBatch = async (req, res) => {
  try {
    const {
      lines,
      batchType = 'BATCH',
      approvalLevelsRequired = 1,
      scheduledFor,
      autoExecute = false,
      notes,
    } = req.body;

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'lines[] is required with at least one { billId, amount, apMethod? }' });
    }
    if (![1, 2].includes(Number(approvalLevelsRequired))) {
      return res.status(400).json({ error: 'approvalLevelsRequired must be 1 or 2' });
    }

    const count = await prisma.apPaymentBatch.count({ where: { tenantId: req.tenantId } });
    const reference = `APB-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;

    let totalAmount = 0;
    let currency = 'NGN';

    const normalized = [];
    for (const ln of lines) {
      const bill = await prisma.vendorBill.findFirst({
        where: { id: ln.billId, tenantId: req.tenantId },
      });
      if (!bill) return res.status(400).json({ error: `Bill not found: ${ln.billId}` });
      if (!['POSTED', 'PARTIAL'].includes(bill.status)) {
        return res.status(400).json({ error: `Bill ${bill.billNumber} must be POSTED or PARTIAL to pay` });
      }
      const amt = roundDecimal(parseFloat(ln.amount));
      if (!amt || amt <= 0) return res.status(400).json({ error: 'Each line amount must be > 0' });
      if (amt > parseFloat(bill.amountDue)) {
        return res.status(400).json({ error: `Amount exceeds due for ${bill.billNumber}` });
      }
      currency = bill.currency || currency;
      totalAmount += amt;
      const apMethod = ln.apMethod && ['BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'CASH'].includes(ln.apMethod)
        ? ln.apMethod
        : 'BANK_TRANSFER';
      normalized.push({
        billId: bill.id,
        scheduleId: ln.scheduleId || null,
        amount: amt,
        apMethod,
      });
    }
    totalAmount = roundDecimal(totalAmount);

    const approval2 = Number(approvalLevelsRequired) >= 2 ? 'PENDING' : 'NOT_REQUIRED';

    const batch = await prisma.apPaymentBatch.create({
      data: {
        tenantId: req.tenantId,
        reference,
        batchType: lines.length === 1 ? 'SINGLE' : batchType === 'SINGLE' ? 'SINGLE' : 'BATCH',
        status: 'DRAFT',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        autoExecute: !!autoExecute,
        approvalLevelsRequired: Number(approvalLevelsRequired),
        approval1Status: 'PENDING',
        approval2Status: approval2,
        totalAmount,
        currency,
        notes: notes ? String(notes) : null,
        createdById: req.user?.id,
        lines: { create: normalized },
      },
      include: { lines: { include: { bill: { select: { billNumber: true } } } } },
    });

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'CREATE',
      resource: 'ApPaymentBatch',
      resourceId: batch.id,
      newValues: { reference: batch.reference, totalAmount: batch.totalAmount },
      req,
    });

    res.status(201).json({ data: batch });
  } catch (err) {
    logger.error('createPaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to create payment batch' });
  }
};

exports.submitPaymentBatch = async (req, res) => {
  try {
    const batch = await prisma.apPaymentBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status !== 'DRAFT') return res.status(409).json({ error: 'Only DRAFT batches can be submitted' });

    const updated = await prisma.apPaymentBatch.update({
      where: { id: batch.id },
      data: {
        status: 'PENDING_APPROVAL',
        approval1Status: 'PENDING',
        approval2Status: batch.approvalLevelsRequired >= 2 ? 'PENDING' : 'NOT_REQUIRED',
      },
    });
    res.json({ data: updated });
  } catch (err) {
    logger.error('submitPaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to submit batch' });
  }
};

exports.approvePaymentBatch = async (req, res) => {
  try {
    const { level = 1 } = req.body;
    const role = req.user?.role;
    const batch = await prisma.apPaymentBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.status !== 'PENDING_APPROVAL') {
      return res.status(409).json({ error: 'Batch is not pending approval' });
    }

    if (Number(level) === 1) {
      if (!canApproveLevel1(role)) return res.status(403).json({ error: 'Insufficient role for level 1 approval' });
      const next =
        batch.approvalLevelsRequired >= 2
          ? { approval1Status: 'APPROVED', approvedById1: req.user.id, approvedAt1: new Date() }
          : {
              approval1Status: 'APPROVED',
              approvedById1: req.user.id,
              approvedAt1: new Date(),
              status: batch.scheduledFor && new Date(batch.scheduledFor) > new Date() ? 'SCHEDULED' : 'APPROVED',
            };
      const updated = await prisma.apPaymentBatch.update({
        where: { id: batch.id },
        data: next,
      });
      if (batch.approvalLevelsRequired >= 2) {
        return res.json({ data: updated });
      }
      return res.json({ data: updated });
    }

    if (Number(level) === 2) {
      if (!canApproveLevel2(role)) return res.status(403).json({ error: 'Insufficient role for level 2 approval' });
      if (batch.approval1Status !== 'APPROVED') return res.status(409).json({ error: 'Level 1 approval required first' });
      const updated = await prisma.apPaymentBatch.update({
        where: { id: batch.id },
        data: {
          approval2Status: 'APPROVED',
          approvedById2: req.user.id,
          approvedAt2: new Date(),
          status: batch.scheduledFor && new Date(batch.scheduledFor) > new Date() ? 'SCHEDULED' : 'APPROVED',
        },
      });
      return res.json({ data: updated });
    }

    return res.status(400).json({ error: 'level must be 1 or 2' });
  } catch (err) {
    logger.error('approvePaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to approve batch' });
  }
};

exports.rejectPaymentBatch = async (req, res) => {
  try {
    const { reason } = req.body;
    const batch = await prisma.apPaymentBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(batch.status)) {
      return res.status(409).json({ error: 'Cannot reject batch in this status' });
    }

    const updated = await prisma.apPaymentBatch.update({
      where: { id: batch.id },
      data: {
        status: 'CANCELLED',
        approval1Status: 'REJECTED',
        failureSummary: reason ? String(reason).slice(0, 500) : 'Rejected',
      },
    });
    res.json({ data: updated });
  } catch (err) {
    logger.error('rejectPaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to reject batch' });
  }
};

exports.schedulePaymentBatch = async (req, res) => {
  try {
    const { scheduledFor, autoExecute = true } = req.body;
    if (!scheduledFor) return res.status(400).json({ error: 'scheduledFor is required' });

    const batch = await prisma.apPaymentBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (!['APPROVED', 'SCHEDULED'].includes(batch.status)) {
      return res.status(409).json({ error: 'Approve the payment batch before scheduling' });
    }

    const when = new Date(scheduledFor);
    const updated = await prisma.apPaymentBatch.update({
      where: { id: batch.id },
      data: {
        scheduledFor: when,
        autoExecute: !!autoExecute,
        status: when > new Date() ? 'SCHEDULED' : 'APPROVED',
      },
    });
    res.json({ data: updated });
  } catch (err) {
    logger.error('schedulePaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to schedule batch' });
  }
};

async function runBatchExecution(batchId, tenantId, userId, force) {
  const batch = await prisma.apPaymentBatch.findFirst({
    where: { id: batchId, tenantId },
    include: {
      lines: {
        include: { bill: true },
      },
    },
  });
  if (!batch) throw new Error('Batch not found');
  if (!['APPROVED', 'SCHEDULED'].includes(batch.status)) {
    throw new Error('Batch must be APPROVED or SCHEDULED to execute');
  }
  if (batch.scheduledFor && new Date(batch.scheduledFor) > new Date() && !force) {
    throw new Error('Batch is scheduled for a future date; use force=true to override');
  }

  await prisma.apPaymentBatch.update({
    where: { id: batchId },
    data: { status: 'EXECUTING' },
  });

  const errors = [];
  for (const line of batch.lines) {
    if (line.lineStatus !== 'PENDING') continue;
    try {
      const { payment, bill } = await apPaymentService.executeVendorPayment({
        tenantId,
        userId,
        billId: line.billId,
        settlementAmount: parseFloat(line.amount),
        method: line.apMethod,
        scheduleId: line.scheduleId || undefined,
        batchId: batch.id,
        paidAt: new Date().toISOString(),
        reference: `${batch.reference}-${line.id.slice(0, 8)}`,
      });

      await prisma.apPaymentBatchLine.update({
        where: { id: line.id },
        data: { lineStatus: 'COMPLETED', paymentId: payment.id },
      });
    } catch (e) {
      errors.push(`${line.bill?.billNumber || line.billId}: ${e.message}`);
      await prisma.apPaymentBatchLine.update({
        where: { id: line.id },
        data: { lineStatus: 'FAILED', errorMessage: e.message?.slice(0, 500) || 'Error' },
      });
    }
  }

  const lines = await prisma.apPaymentBatchLine.findMany({ where: { batchId } });
  const failed = lines.filter((l) => l.lineStatus === 'FAILED').length;
  const done = lines.filter((l) => l.lineStatus === 'COMPLETED').length;

  const finalStatus = failed === 0 ? 'COMPLETED' : done === 0 ? 'PARTIALLY_FAILED' : 'PARTIALLY_FAILED';

  await prisma.apPaymentBatch.update({
    where: { id: batchId },
    data: {
      status: finalStatus,
      executedAt: new Date(),
      failureSummary: errors.length ? errors.join('; ').slice(0, 2000) : null,
    },
  });

  return prisma.apPaymentBatch.findFirst({
    where: { id: batchId },
    include: { lines: { include: { bill: { select: { billNumber: true } }, payment: true } } },
  });
}

exports.executePaymentBatch = async (req, res) => {
  try {
    const force = !!req.body?.force;
    const data = await runBatchExecution(req.params.id, req.tenantId, req.user?.id, force);
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user?.id,
      action: 'EXECUTE',
      resource: 'ApPaymentBatch',
      resourceId: req.params.id,
      newValues: { status: data.status },
      req,
    });
    res.json({ data });
  } catch (err) {
    logger.error('executePaymentBatch', err);
    res.status(500).json({ error: err.message || 'Failed to execute batch' });
  }
};

exports.processDueScheduledBatches = async (req, res) => {
  try {
    const now = new Date();
    const due = await prisma.apPaymentBatch.findMany({
      where: {
        tenantId: req.tenantId,
        status: 'SCHEDULED',
        autoExecute: true,
        scheduledFor: { lte: now },
      },
    });

    const results = [];
    for (const b of due) {
      try {
        const data = await runBatchExecution(b.id, req.tenantId, req.user?.id, true);
        results.push({ id: b.id, reference: b.reference, status: data.status });
      } catch (e) {
        results.push({ id: b.id, reference: b.reference, error: e.message });
      }
    }

    res.json({ data: { processed: results.length, results } });
  } catch (err) {
    logger.error('processDueScheduledBatches', err);
    res.status(500).json({ error: err.message || 'Failed to process due batches' });
  }
};
