const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { paginate, paginatedResponse } = require('../utils/helpers');
const { processPayrollRun, generateNIBSSFile } = require('../services/payroll.service');
const { createAuditLog } = require('../middleware/audit.middleware');

async function listRuns(req, res) {
  try {
    const { page, limit, year } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (year) where.year = parseInt(year);
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
    const nibssContent = generateNIBSSFile(run, run.payslips, employees);

    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="nibss-payroll-${run.period}.txt"`,
    });
    res.send(nibssContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate NIBSS file' });
  }
}

async function getPayslip(req, res) {
  try {
    const payslip = await prisma.payslip.findFirst({
      where: { id: req.params.payslipId, payrollRun: { tenantId: req.tenantId } },
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

module.exports = { listRuns, getRun, processRun, approveRun, downloadNIBSS, getPayslip };
