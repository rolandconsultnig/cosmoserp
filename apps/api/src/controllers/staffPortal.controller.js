const path = require('path');
const prisma = require('../config/prisma');
const { UPLOAD_BASE } = require('../middleware/upload.middleware');
const { logger } = require('../utils/logger');

/** Map Prisma / DB errors to clearer API responses (avoids opaque 500s). */
function sendStaffPortalError(res, e, fallbackMessage) {
  if (e.status && e.message) {
    return res.status(e.status).json({ error: e.message });
  }
  const code = e.code;
  if (code === 'P2021') {
    return res.status(503).json({
      error:
        'HR / staff portal tables are missing. From repo root run: cd apps/api && npx prisma migrate deploy',
      code: 'MIGRATION_REQUIRED',
    });
  }
  if (code === 'P2001' || code === 'P2015') {
    return res.status(503).json({
      error: 'Database schema may be out of date. Run: cd apps/api && npx prisma migrate deploy',
      code: 'SCHEMA_MISMATCH',
    });
  }
  // Raw Postgres: undefined_column (e.g. Employee.userId missing before migration)
  if (code === 'P2010' || /42703|does not exist/i.test(String(e.message || ''))) {
    return res.status(503).json({
      error:
        'Database is missing HR/staff-portal columns or tables. Run: cd apps/api && npx prisma migrate deploy',
      code: 'MIGRATION_REQUIRED',
    });
  }
  logger.error('staffPortal', { code, message: e.message, name: e.name });
  return res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? fallbackMessage
        : e.message || fallbackMessage,
    code: code || undefined,
  });
}

async function requireMyEmployee(req) {
  if (!req.user?.id || !req.tenantId) {
    const err = new Error('Authentication required');
    err.status = 401;
    throw err;
  }

  const employee = await prisma.employee.findFirst({
    where: {
      tenantId: req.tenantId,
      userId: req.user.id,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      staffId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      department: true,
      jobTitle: true,
      employmentType: true,
      employmentDate: true,
      terminationDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!employee) {
    const err = new Error('Your user account is not linked to an employee profile. Ask HR to link your account.');
    err.status = 403;
    throw err;
  }

  return employee;
}

async function me(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    res.json({ data: employee });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load staff profile');
  }
}

async function listDocuments(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const docs = await prisma.employeeDocument.findMany({
      where: { tenantId: req.tenantId, employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: docs });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load documents');
  }
}

async function uploadDocument(req, res) {
  try {
    const employee = await requireMyEmployee(req);

    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'File required (field name: file). PDF or image.' });
    }

    const title = String(req.body?.title || '').trim();
    const documentType = String(req.body?.documentType || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!documentType) return res.status(400).json({ error: 'documentType is required' });

    const relativePath = path.relative(UPLOAD_BASE, req.file.path).replace(/\\/g, '/');

    const doc = await prisma.employeeDocument.create({
      data: {
        tenantId: req.tenantId,
        employeeId: employee.id,
        title,
        documentType,
        filePath: relativePath,
        fileName: req.file.originalname || path.basename(req.file.path),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: req.user.id,
      },
    });

    res.status(201).json({ data: doc });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to upload document');
  }
}

async function listLeave(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.leaveRequest.findMany({
      where: { tenantId: req.tenantId, employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load leave requests');
  }
}

async function applyLeave(req, res) {
  try {
    const employee = await requireMyEmployee(req);

    const startDateRaw = req.body?.startDate;
    const endDateRaw = req.body?.endDate;
    const reasonRaw = req.body?.reason;

    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;
    const reason = reasonRaw === undefined || reasonRaw === null ? null : String(reasonRaw).trim();

    if (!startDate || Number.isNaN(startDate.valueOf())) return res.status(400).json({ error: 'Valid startDate is required' });
    if (!endDate || Number.isNaN(endDate.valueOf())) return res.status(400).json({ error: 'Valid endDate is required' });
    if (endDate < startDate) return res.status(400).json({ error: 'endDate cannot be before startDate' });

    const row = await prisma.leaveRequest.create({
      data: {
        tenantId: req.tenantId,
        employeeId: employee.id,
        startDate,
        endDate,
        reason,
      },
    });

    res.status(201).json({ data: row });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to apply for leave');
  }
}

async function listResignations(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.resignation.findMany({
      where: { tenantId: req.tenantId, employeeId: employee.id },
      orderBy: { submittedAt: 'desc' },
      take: 50,
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load resignations');
  }
}

async function submitResignation(req, res) {
  try {
    const employee = await requireMyEmployee(req);

    const lastWorkingDateRaw = req.body?.lastWorkingDate;
    const reasonRaw = req.body?.reason;

    const lastWorkingDate = lastWorkingDateRaw ? new Date(lastWorkingDateRaw) : null;
    if (lastWorkingDateRaw && (!lastWorkingDate || Number.isNaN(lastWorkingDate.valueOf()))) {
      return res.status(400).json({ error: 'Invalid lastWorkingDate' });
    }

    const reason = reasonRaw === undefined || reasonRaw === null ? null : String(reasonRaw).trim();

    const row = await prisma.resignation.create({
      data: {
        tenantId: req.tenantId,
        employeeId: employee.id,
        lastWorkingDate,
        reason,
      },
    });

    res.status(201).json({ data: row });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to submit resignation');
  }
}

async function withdrawResignation(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const id = String(req.params.id);
    const row = await prisma.resignation.findFirst({
      where: { id, tenantId: req.tenantId, employeeId: employee.id },
      select: { id: true, status: true },
    });
    if (!row) return res.status(404).json({ error: 'Resignation not found' });
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ error: 'Only submitted resignations can be withdrawn' });
    }
    const updated = await prisma.resignation.update({
      where: { id: row.id },
      data: { status: 'WITHDRAWN' },
    });
    res.json({ data: updated });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to withdraw resignation');
  }
}

async function inbox(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.intranetMessage.findMany({
      where: { tenantId: req.tenantId, recipientId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load inbox');
  }
}

async function sent(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.intranetMessage.findMany({
      where: { tenantId: req.tenantId, senderId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load sent messages');
  }
}

async function sendMessage(req, res) {
  try {
    const employee = await requireMyEmployee(req);

    const recipientIdRaw = req.body?.recipientId;
    const subject = String(req.body?.subject || '').trim();
    const body = String(req.body?.body || '').trim();

    const recipientId = recipientIdRaw ? String(recipientIdRaw) : '';
    if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
    if (!subject) return res.status(400).json({ error: 'subject is required' });
    if (!body) return res.status(400).json({ error: 'body is required' });

    if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, tenantId: req.tenantId, isActive: true },
      select: { id: true },
    });
    if (!recipient) return res.status(400).json({ error: 'Recipient not found' });

    const msg = await prisma.intranetMessage.create({
      data: {
        tenantId: req.tenantId,
        senderId: req.user.id,
        recipientId,
        subject,
        body,
      },
    });

    res.status(201).json({ data: msg });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to send message');
  }
}

async function markRead(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const existing = await prisma.intranetMessage.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId, recipientId: req.user.id },
      select: { id: true, readAt: true },
    });
    if (!existing) return res.status(404).json({ error: 'Message not found' });

    const updated = await prisma.intranetMessage.update({
      where: { id: existing.id },
      data: { readAt: existing.readAt || new Date() },
    });

    res.json({ data: updated });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to mark read');
  }
}

async function listUsers(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.user.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 500,
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load users');
  }
}

async function listPayslips(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const rows = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        payrollRun: {
          select: { id: true, period: true, status: true, year: true, month: true },
        },
      },
    });
    res.json({ data: rows });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load payslips');
  }
}

async function getPayslip(req, res) {
  try {
    const employee = await requireMyEmployee(req);
    const payslipId = String(req.params.id);

    const row = await prisma.payslip.findFirst({
      where: { id: payslipId, employeeId: employee.id },
      include: {
        payrollRun: {
          select: { id: true, period: true, status: true, year: true, month: true },
        },
        employee: {
          select: { id: true, staffId: true, firstName: true, lastName: true, department: true, jobTitle: true, bankName: true, bankAccountNumber: true },
        },
      },
    });
    if (!row) return res.status(404).json({ error: 'Payslip not found' });
    res.json({ data: row });
  } catch (e) {
    sendStaffPortalError(res, e, 'Failed to load payslip');
  }
}

module.exports = {
  me,
  listDocuments,
  uploadDocument,
  listLeave,
  applyLeave,
  listResignations,
  submitResignation,
  withdrawResignation,
  inbox,
  sent,
  sendMessage,
  markRead,
  listUsers,
  listPayslips,
  getPayslip,
};
