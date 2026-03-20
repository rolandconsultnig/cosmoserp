const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { processPayrollRun, generateNIBSSFile } = require('../services/payroll.service');
const { createAuditLog } = require('../middleware/audit.middleware');

function toNum(v) {
  return Number(v || 0);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoneyNGN(amount) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(n);
}

async function getSummary(req, res) {
  try {
    const { year } = req.query;
    const where = { tenantId: req.tenantId };
    if (year) where.year = parseInt(year, 10);

    const [totals, byStatus, latestRun] = await Promise.all([
      prisma.payrollRun.aggregate({
        where,
        _count: true,
        _sum: {
          totalGross: true,
          totalPaye: true,
          totalPension: true,
          totalNhf: true,
          totalItf: true,
          totalNet: true,
        },
      }),
      prisma.payrollRun.groupBy({ by: ['status'], where, _count: true }),
      prisma.payrollRun.findFirst({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { id: true, period: true, status: true, totalNet: true, month: true, year: true },
      }),
    ]);

    const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    res.json({
      data: {
        runCount: totals._count || 0,
        totalGross: toNum(totals._sum.totalGross),
        totalPaye: toNum(totals._sum.totalPaye),
        totalPension: toNum(totals._sum.totalPension),
        totalNhf: toNum(totals._sum.totalNhf),
        totalItf: toNum(totals._sum.totalItf),
        totalNet: toNum(totals._sum.totalNet),
        statusCounts: {
          DRAFT: counts.DRAFT || 0,
          PROCESSING: counts.PROCESSING || 0,
          APPROVED: counts.APPROVED || 0,
          PAID: counts.PAID || 0,
          CANCELLED: counts.CANCELLED || 0,
        },
        latestRun,
      },
    });
  } catch (error) {
    logger.error('Payroll summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll summary' });
  }
}

async function listRuns(req, res) {
  try {
    const { page, limit, year, month, status } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (year) where.year = parseInt(year, 10);
    if (month) where.month = parseInt(month, 10);
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      prisma.payrollRun.findMany({ where, take, skip, orderBy: [{ year: 'desc' }, { month: 'desc' }], include: { _count: { select: { payslips: true } } } }),
      prisma.payrollRun.count({ where }),
    ]);
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll runs' });
  }
}

async function getRun(req, res) {
  try {
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        payslips: {
          include: { employee: { select: { id: true, staffId: true, firstName: true, lastName: true, jobTitle: true, department: true, bankAccountNumber: true, bankName: true } } },
        },
      },
    });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    res.json({ data: run });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll run' });
  }
}

async function processRun(req, res) {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required' });
    if (month < 1 || month > 12) return res.status(400).json({ error: 'Invalid month' });
    const now = new Date();
    const target = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
    if (target > currentPeriod) {
      return res.status(400).json({ error: 'Cannot process payroll for a future period' });
    }

    const run = await processPayrollRun(req.tenantId, parseInt(month), parseInt(year), req.user.id);
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'PROCESS', resource: 'PayrollRun', resourceId: run.id, newValues: { month, year }, req });
    res.status(201).json({ data: run, message: `Payroll processed for ${month}/${year}` });
  } catch (error) {
    logger.error('Process payroll error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payroll' });
  }
}

async function approveRun(req, res) {
  try {
    const approvalNote = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    const run = await prisma.payrollRun.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status !== 'PROCESSING') return res.status(400).json({ error: 'Only runs in PROCESSING status can be approved' });
    const updated = await prisma.payrollRun.update({ where: { id: run.id }, data: { status: 'APPROVED', processedAt: new Date() } });
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'APPROVE',
      resource: 'PayrollRun',
      resourceId: run.id,
      newValues: approvalNote ? { note: approvalNote } : undefined,
      req,
    });

    prisma.tenant
      .findUnique({
        where: { id: req.tenantId },
        select: { email: true, tradingName: true, businessName: true },
      })
      .then((t) => {
        if (!t?.email) return;
        return emailService.sendPayrollApprovalNotificationEmail(
          t.email,
          t.tradingName || t.businessName,
          updated,
          approvalNote,
        );
      })
      .catch((err) => logger.warn('Payroll approval notification email:', err.message));

    res.json({ data: updated, message: 'Payroll approved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve payroll' });
  }
}

async function markRunPaid(req, res) {
  try {
    const run = await prisma.payrollRun.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status !== 'APPROVED') return res.status(400).json({ error: 'Only APPROVED runs can be marked as PAID' });
    const updated = await prisma.payrollRun.update({ where: { id: run.id }, data: { status: 'PAID', processedAt: new Date() } });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'MARK_PAID', resource: 'PayrollRun', resourceId: run.id, req });
    res.json({ data: updated, message: 'Payroll marked as paid' });
  } catch (error) {
    logger.error('Mark payroll paid error:', error);
    res.status(500).json({ error: 'Failed to mark payroll as paid' });
  }
}

async function cancelRun(req, res) {
  try {
    const run = await prisma.payrollRun.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status === 'PAID') return res.status(400).json({ error: 'Cannot cancel a PAID payroll run' });
    if (run.status === 'CANCELLED') return res.status(400).json({ error: 'Payroll run already cancelled' });
    const updated = await prisma.payrollRun.update({ where: { id: run.id }, data: { status: 'CANCELLED' } });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CANCEL', resource: 'PayrollRun', resourceId: run.id, req });
    res.json({ data: updated, message: 'Payroll run cancelled' });
  } catch (error) {
    logger.error('Cancel payroll error:', error);
    res.status(500).json({ error: 'Failed to cancel payroll run' });
  }
}

async function downloadNIBSS(req, res) {
  try {
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { payslips: true },
    });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (!['APPROVED', 'PAID'].includes(run.status)) {
      return res.status(400).json({ error: 'Payroll must be approved before downloading NIBSS file' });
    }

    const employees = await prisma.employee.findMany({ where: { tenantId: req.tenantId, isActive: true } });
    const employeesWithBank = employees.filter((emp) => emp?.bankAccountNumber && emp?.bankSortCode);
    if (!employeesWithBank.length) {
      return res.status(400).json({ error: 'No employees with complete bank details found for NIBSS export' });
    }
    const nibssContent = generateNIBSSFile(run, run.payslips, employeesWithBank);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="nibss-payroll-${run.period}.txt"`,
      'X-Employees-Included': String(employeesWithBank.length),
      'X-Employees-Skipped': String(Math.max(0, employees.length - employeesWithBank.length)),
    });
    res.send(nibssContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate NIBSS file' });
  }
}

async function exportRunCSV(req, res) {
  try {
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                staffId: true,
                firstName: true,
                lastName: true,
                department: true,
                jobTitle: true,
                bankName: true,
                bankAccountNumber: true,
              },
            },
          },
        },
      },
    });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });

    const header = [
      'Staff ID', 'Employee Name', 'Department', 'Job Title',
      'Gross Salary', 'PAYE', 'Employee Pension', 'Employer Pension', 'NHF', 'ITF', 'Other Deductions', 'Net Pay',
      'Bank Name', 'Bank Account',
    ];
    const rows = run.payslips.map((slip) => [
      slip.employee?.staffId || '',
      `${slip.employee?.firstName || ''} ${slip.employee?.lastName || ''}`.trim(),
      slip.employee?.department || '',
      slip.employee?.jobTitle || '',
      slip.grossSalary, slip.payeeTax, slip.employeePension, slip.employerPension, slip.nhf, slip.itf, slip.otherDeductions, slip.netPay,
      slip.employee?.bankName || '',
      slip.employee?.bankAccountNumber || '',
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="payroll-${run.period}.csv"`,
    });
    res.send(csv);
  } catch (error) {
    logger.error('Payroll CSV export error:', error);
    res.status(500).json({ error: 'Failed to export payroll CSV' });
  }
}

async function getPayslip(req, res) {
  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id: req.params.payslipId, payrollRunId: req.params.id, payrollRun: { tenantId: req.tenantId } },
      include: {
        employee: true,
        payrollRun: { select: { period: true, month: true, year: true, status: true } },
      },
    });
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    res.json({ data: payslip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslip' });
  }
}

/** Printable payslip (HTML) for compliance / employee records; use browser Print → Save as PDF. */
async function exportPayslipHtml(req, res) {
  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id: req.params.payslipId, payrollRunId: req.params.id, payrollRun: { tenantId: req.tenantId } },
      include: {
        employee: true,
        payrollRun: { select: { period: true, month: true, year: true, status: true } },
      },
    });
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        businessName: true,
        tradingName: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        email: true,
        tin: true,
      },
    });

    const emp = payslip.employee;
    const period = payslip.payrollRun?.period || `${payslip.payrollRun?.year}-${String(payslip.payrollRun?.month || '').padStart(2, '0')}`;
    const employerName = escapeHtml(tenant?.tradingName || tenant?.businessName || 'Employer');
    const empName = escapeHtml(`${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || 'Employee');
    const generatedAt = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    const rowsEarnings = [
      ['Basic salary', payslip.basicSalary],
      ['Housing allowance', payslip.housing],
      ['Transport allowance', payslip.transport],
      ['Other allowances', payslip.otherAllowances],
      ['Gross pay', payslip.grossSalary],
    ];
    const rowsDeductions = [
      ['PAYE (PIT)', payslip.payeeTax],
      ['Employee pension (8%)', payslip.employeePension],
      ['Employer pension (10%) — informational', payslip.employerPension],
      ['NHF (2.5%)', payslip.nhf],
      ['ITF (1%)', payslip.itf],
      ['Other deductions', payslip.otherDeductions],
    ];

    const table = (title, items) => {
      const body = items
        .map(
          ([label, val]) => `<tr><td>${escapeHtml(label)}</td><td class="num">${formatMoneyNGN(val)}</td></tr>`,
        )
        .join('');
      return `<h2>${escapeHtml(title)}</h2><table class="lines">${body}</table>`;
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Payslip — ${empName} — ${escapeHtml(period)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; color: #111; max-width: 720px; margin: 24px auto; padding: 0 16px; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.06em; color: #555; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .meta { font-size: 0.9rem; color: #444; line-height: 1.5; margin-bottom: 16px; }
    .lines { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
    .lines td { padding: 6px 0; border-bottom: 1px solid #eee; }
    .lines td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .net { margin-top: 20px; padding: 14px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
    .net strong { font-size: 1.15rem; }
    .foot { margin-top: 28px; font-size: 0.75rem; color: #666; line-height: 1.5; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Payslip</h1>
  <div class="meta">
    <div><strong>${employerName}</strong></div>
    <div>${escapeHtml([tenant?.address, tenant?.city, tenant?.state, tenant?.country].filter(Boolean).join(', '))}</div>
    <div>Tel: ${escapeHtml(tenant?.phone || '—')} · Email: ${escapeHtml(tenant?.email || '—')}${tenant?.tin ? ` · TIN: ${escapeHtml(tenant.tin)}` : ''}</div>
    <div style="margin-top:12px"><strong>Employee:</strong> ${empName} &nbsp;·&nbsp; <strong>Staff ID:</strong> ${escapeHtml(emp?.staffId || '—')}</div>
    <div><strong>Department:</strong> ${escapeHtml(emp?.department || '—')} &nbsp;·&nbsp; <strong>Role:</strong> ${escapeHtml(emp?.jobTitle || '—')}</div>
    <div><strong>Pay period:</strong> ${escapeHtml(period)} &nbsp;·&nbsp; <strong>Run status:</strong> ${escapeHtml(payslip.payrollRun?.status || '—')}</div>
    <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
  </div>
  ${table('Earnings', rowsEarnings)}
  ${table('Deductions & statutory', rowsDeductions)}
  <div class="net"><span>Net pay</span><strong>${formatMoneyNGN(payslip.netPay)}</strong></div>
  <div class="foot">
    <p>This payslip summarizes Nigerian statutory deductions (PAYE, Pension Act contributions, NHF, ITF) based on configured employee gross pay. Employer pension is shown for information and is typically remitted separately. Use your browser’s <strong>Print</strong> dialog to save as PDF for records.</p>
    <p class="no-print"><button type="button" onclick="window.print()">Print / Save as PDF</button></p>
  </div>
</body>
</html>`;

    const safeStaff = String(emp?.staffId || payslip.id).replace(/[^a-zA-Z0-9-_]/g, '_');
    const safePeriod = String(period).replace(/[^a-zA-Z0-9-_]/g, '_');
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="payslip-${safeStaff}-${safePeriod}.html"`,
    });
    res.send(html);
  } catch (error) {
    logger.error('Payslip HTML export error:', error);
    res.status(500).json({ error: 'Failed to generate payslip' });
  }
}

module.exports = {
  getSummary,
  listRuns,
  getRun,
  processRun,
  approveRun,
  markRunPaid,
  cancelRun,
  downloadNIBSS,
  exportRunCSV,
  getPayslip,
  exportPayslipHtml,
};
