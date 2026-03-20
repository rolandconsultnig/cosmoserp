const crypto = require('crypto');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { generateStaffId, paginate, paginatedResponse } = require('../utils/helpers');
const { createAuditLog } = require('../middleware/audit.middleware');
const { calculateMonthlyPayroll } = require('../services/payroll.service');

async function list(req, res) {
  try {
    const { page, limit, search, department, isActive } = req.query;
    const { take, skip } = paginate(page, limit);
    const where = { tenantId: req.tenantId };
    if (department) where.department = { contains: department, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { staffId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.employee.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
      prisma.employee.count({ where }),
    ]);
    const data = rows.map((e) => {
      const { portalAccessToken, portalAccessTokenExpiresAt, ...rest } = e;
      return {
        ...rest,
        portalAccessActive: Boolean(
          portalAccessToken && portalAccessTokenExpiresAt && new Date(portalAccessTokenExpiresAt) > new Date(),
        ),
      };
    });
    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
}

async function getOne(req, res) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: { payslips: { orderBy: { createdAt: 'desc' }, take: 12, include: { payrollRun: { select: { period: true } } } } },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const payrollCalc = calculateMonthlyPayroll(employee);
    const { portalAccessToken, portalAccessTokenExpiresAt, ...rest } = employee;
    res.json({
      data: {
        ...rest,
        payrollCalc,
        portalAccessActive: Boolean(
          portalAccessToken && portalAccessTokenExpiresAt && new Date(portalAccessTokenExpiresAt) > new Date(),
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
}

async function create(req, res) {
  try {
    const { firstName, lastName, email, phone, nin, bvn, dateOfBirth, gender, address, city, state, department, jobTitle, employmentType, employmentDate, grossSalary, bankName, bankAccountNumber, bankAccountName, pensionPin, nhfNumber, taxId } = req.body;
    if (!firstName || !lastName || !grossSalary || !employmentDate) {
      return res.status(400).json({ error: 'First name, last name, gross salary, and employment date are required' });
    }
    const count = await prisma.employee.count({ where: { tenantId: req.tenantId } });
    const staffId = generateStaffId('EMP', count + 1);

    const employee = await prisma.employee.create({
      data: {
        tenantId: req.tenantId,
        staffId, firstName, lastName, email, phone, nin, bvn,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender, address, city, state, department, jobTitle,
        employmentType: employmentType || 'FULL_TIME',
        employmentDate: new Date(employmentDate),
        grossSalary: parseFloat(grossSalary),
        bankName, bankAccountNumber, bankAccountName, pensionPin, nhfNumber, taxId,
      },
    });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE', resource: 'Employee', resourceId: employee.id, newValues: { staffId, firstName, lastName }, req });
    const { portalAccessToken, portalAccessTokenExpiresAt, ...safe } = employee;
    res.status(201).json({
      data: {
        ...safe,
        portalAccessActive: Boolean(
          portalAccessToken && portalAccessTokenExpiresAt && new Date(portalAccessTokenExpiresAt) > new Date(),
        ),
      },
    });
  } catch (error) {
    logger.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

async function update(req, res) {
  try {
    const employee = await prisma.employee.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const { firstName, lastName, email, phone, address, city, state, department, jobTitle, employmentType, grossSalary, bankName, bankAccountNumber, bankAccountName, pensionPin, nhfNumber, taxId, isActive, terminationDate } = req.body;
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { firstName, lastName, email, phone, address, city, state, department, jobTitle, employmentType, grossSalary: grossSalary !== undefined ? parseFloat(grossSalary) : undefined, bankName, bankAccountNumber, bankAccountName, pensionPin, nhfNumber, taxId, isActive, terminationDate: terminationDate ? new Date(terminationDate) : undefined },
    });
    const { portalAccessToken, portalAccessTokenExpiresAt, ...safe } = updated;
    res.json({
      data: {
        ...safe,
        portalAccessActive: Boolean(
          portalAccessToken && portalAccessTokenExpiresAt && new Date(portalAccessTokenExpiresAt) > new Date(),
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
}

async function issuePortalAccess(req, res) {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    await prisma.employee.update({
      where: { id: employee.id },
      data: { portalAccessToken: token, portalAccessTokenExpiresAt: expires },
    });
    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'EMPLOYEE_PORTAL_TOKEN',
      resource: 'Employee',
      resourceId: employee.id,
      req,
    });
    res.json({
      data: { token, expiresAt: expires },
      message: 'Open Employee Portal with ?t=TOKEN on your ERP site, or use Authorization: Bearer TOKEN against /api/employee-portal/*',
    });
  } catch (error) {
    logger.error('issuePortalAccess', error);
    res.status(500).json({ error: 'Failed to issue portal access' });
  }
}

module.exports = { list, getOne, create, update, issuePortalAccess };
