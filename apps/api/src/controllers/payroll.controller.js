const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
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
    const run = await prisma.payrollRun.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!run) return res.status(404).json({ error: 'Payroll run not found' });
    if (run.status !== 'PROCESSING') return res.status(400).json({ error: 'Only runs in PROCESSING status can be approved' });
    const updated = await prisma.payrollRun.update({ where: { id: run.id }, data: { status: 'APPROVED', processedAt: new Date() } });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'APPROVE', resource: 'PayrollRun', resourceId: run.id, req });
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
        payrollRun: { select: { period: true, month: true, year: true } },
      },
    });
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
    res.json({ data: payslip });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslip' });
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
};
