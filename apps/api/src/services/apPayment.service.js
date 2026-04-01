const prisma = require('../config/prisma');
const { roundDecimal } = require('../utils/helpers');

const BASE_CURRENCY = 'NGN';

async function requireJournalAccounts(tenantId, codes) {
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

/**
 * settlementAmount = gross amount applied against AP (before prompt discount).
 * Returns discount taken and net cash to pay if eligible.
 */
function computeEarlyPaymentDiscount(bill, settlementAmount, paidDate) {
  const cap = roundDecimal(Math.min(settlementAmount, parseFloat(bill.amountDue || 0)));
  const p = bill.earlyPaymentDiscountPercent != null ? parseFloat(bill.earlyPaymentDiscountPercent) : 0;
  const deadline = bill.earlyPaymentDeadline;
  if (!p || p <= 0 || !deadline || cap <= 0) {
    return { discountAmount: 0, grossSettlement: cap, netCash: cap };
  }
  if (new Date(paidDate) > new Date(deadline)) {
    return { discountAmount: 0, grossSettlement: cap, netCash: cap };
  }
  const discountAmount = roundDecimal(cap * p);
  const netCash = roundDecimal(cap - discountAmount);
  return { discountAmount, grossSettlement: cap, netCash };
}

async function createPaymentJournalEntry({ tenantId, bill, payment, createdById, discountAmount = 0 }) {
  const entryDate = payment.paidAt || new Date();
  await ensureAccountingPeriodOpen(tenantId, entryDate);

  const netCash = roundDecimal(parseFloat(payment.amount || 0));
  const disc = roundDecimal(parseFloat(discountAmount || 0));
  const exchangeRate = payment.exchangeRate || bill.exchangeRate || 1;

  const baseNet = toBaseAmount(netCash, payment.currency, exchangeRate);
  const baseDisc = toBaseAmount(disc, payment.currency, exchangeRate);
  const baseAp = roundDecimal(baseNet + baseDisc);

  const accountCodes = ['2000', '1000'];
  if (disc > 0) accountCodes.push('4200', '4900', '7790');
  const accMap = await getAccountsByCode(tenantId, [...new Set(accountCodes)]);
  const missing = ['2000', '1000'].filter((c) => !accMap[c]);
  if (missing.length) throw new Error(`Missing chart of accounts codes: ${missing.join(', ')}`);

  let discountAccountId = null;
  if (disc > 0) {
    discountAccountId = accMap['4200']?.id || accMap['4900']?.id || accMap['7790']?.id;
    if (!discountAccountId) {
      throw new Error('Create account code 4200 (or 4900/7790) for purchase discounts / prompt payment to post discounted payments');
    }
  }

  const lineCreates = [
    {
      accountId: accMap['2000'].id,
      description: 'Vendor bill payment - accounts payable',
      debit: baseAp,
      credit: 0,
    },
    {
      accountId: accMap['1000'].id,
      description: 'Vendor bill payment - cash/bank',
      debit: 0,
      credit: baseNet,
    },
  ];
  if (disc > 0) {
    lineCreates.push({
      accountId: discountAccountId,
      description: 'Early / prompt payment discount',
      debit: 0,
      credit: baseDisc,
    });
  }

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
      lines: { create: lineCreates },
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

const METHOD_STRING = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CHEQUE: 'CHEQUE',
  MOBILE_MONEY: 'MOBILE_MONEY',
  CASH: 'CASH',
};

/**
 * Executes one AP payment: updates bill, optional schedule, creates payment row, posts GL.
 * @param {object} opts
 * @param {string} opts.settlementAmount - gross amount to clear from AP (before prompt discount)
 */
async function executeVendorPayment(opts) {
  const {
    tenantId,
    userId,
    billId,
    settlementAmount,
    currency,
    exchangeRate,
    method,
    reference,
    paidAt,
    notes,
    scheduleId,
    batchId,
    skipJournal,
    forceStatus,
  } = opts;

  const bill = await prisma.vendorBill.findFirst({
    where: { id: billId, tenantId },
    include: { payments: true },
  });
  if (!bill) throw new Error('Vendor bill not found');
  if (bill.status === 'CANCELLED') throw new Error('Cannot pay a cancelled bill');

  const payCurrency = currency || bill.currency || 'NGN';
  if (String(payCurrency) !== String(bill.currency)) {
    throw new Error('Multi-currency payments for AP are not implemented yet. Payment currency must match the bill currency.');
  }

  const payExchangeRate = exchangeRate != null ? parseFloat(exchangeRate) : bill.exchangeRate || 1;
  const paidDate = paidAt ? new Date(paidAt) : new Date();

  const { discountAmount, grossSettlement, netCash } = computeEarlyPaymentDiscount(bill, settlementAmount, paidDate);
  if (!grossSettlement || grossSettlement <= 0) throw new Error('amount must be > 0');

  if (reference) {
    const existing = await prisma.vendorBillPayment.findFirst({ where: { reference, tenantId } });
    if (existing) throw new Error('Payment reference already used');
  }

  if (grossSettlement > parseFloat(bill.amountDue)) {
    throw new Error(`Payment amount cannot exceed amount due (${bill.amountDue})`);
  }

  const newAmountPaid = roundDecimal(parseFloat(bill.amountPaid) + netCash);
  const newAmountDue = roundDecimal(parseFloat(bill.amountDue) - grossSettlement);
  const newStatus = newAmountDue <= 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : bill.status;

  const methodStr = typeof method === 'string' ? method : METHOD_STRING[method] || 'BANK_TRANSFER';

  const payment = await prisma.$transaction(async (tx) => {
    let schedule = null;
    if (scheduleId) {
      schedule = await tx.vendorBillPaymentSchedule.findFirst({
        where: { id: scheduleId, tenantId, billId, status: 'PENDING' },
      });
      if (!schedule) throw new Error('Payment schedule not found or already settled');
    }

    const createdPayment = await tx.vendorBillPayment.create({
      data: {
        tenantId,
        billId,
        batchId: batchId || null,
        amount: netCash,
        discountAmount: discountAmount || 0,
        currency: payCurrency,
        exchangeRate: payExchangeRate,
        method: methodStr,
        reference: reference || null,
        status: forceStatus || 'SUCCESS',
        paidAt: paidDate,
        notes: notes || null,
      },
    });

    await tx.vendorBill.update({
      where: { id: billId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
      },
    });

    if (schedule) {
      await tx.vendorBillPaymentSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'PAID',
          paidAt: paidDate,
          notes: notes || schedule.notes || null,
        },
      });
    }

    return createdPayment;
  });

  if (!skipJournal && payment.status === 'SUCCESS') {
    await createPaymentJournalEntry({
      tenantId,
      bill,
      payment,
      createdById: userId,
      discountAmount,
    });
    await prisma.vendorBillPayment.update({
      where: { id: payment.id },
      data: { journalPostedAt: new Date() },
    });
  }

  const updated = await prisma.vendorBill.findFirst({
    where: { id: billId, tenantId },
    include: {
      supplier: true,
      lines: { include: { poLine: true } },
      payments: true,
      paymentSchedules: { orderBy: { dueDate: 'asc' } },
    },
  });

  return { payment, bill: updated };
}

module.exports = {
  computeEarlyPaymentDiscount,
  createPaymentJournalEntry,
  executeVendorPayment,
  ensureAccountingPeriodOpen,
  toBaseAmount,
  getAccountsByCode,
};
