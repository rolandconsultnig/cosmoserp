const prisma = require('../config/prisma');
const { createAuditLog } = require('../middleware/audit.middleware');

function dayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}
function dayEnd(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

async function listShifts(req, res) {
  try {
    const active = String(req.query?.active || '').toLowerCase();
    const employeeId = req.query?.employeeId ? String(req.query.employeeId) : null;
    const where = { tenantId: req.tenantId };
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (employeeId) where.employeeId = employeeId;
    const rows = await prisma.workShift.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load shifts' });
  }
}

async function createShift(req, res) {
  try {
    const name = String(req.body?.name || '').trim();
    const startTime = String(req.body?.startTime || '').trim();
    const endTime = String(req.body?.endTime || '').trim();
    const employeeId = req.body?.employeeId ? String(req.body.employeeId) : null;
    const isActive = req.body?.isActive !== false;
    const days = Array.isArray(req.body?.daysOfWeek) ? req.body.daysOfWeek.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6) : [];
    if (!name || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return res.status(400).json({ error: 'name, startTime and endTime are required (HH:mm)' });
    }
    const row = await prisma.workShift.create({
      data: { tenantId: req.tenantId, employeeId, name, startTime, endTime, daysOfWeek: days, isActive, createdById: req.user.id },
    });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'CREATE_SHIFT', resource: 'WorkShift', resourceId: row.id, newValues: row, req });
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
}

async function updateShift(req, res) {
  try {
    const id = String(req.params.id);
    const existing = await prisma.workShift.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!existing) return res.status(404).json({ error: 'Shift not found' });
    const payload = {};
    ['name', 'startTime', 'endTime', 'employeeId', 'isActive'].forEach((k) => {
      if (req.body?.[k] !== undefined) payload[k] = req.body[k];
    });
    if (payload.employeeId === '') payload.employeeId = null;
    if (req.body?.daysOfWeek !== undefined) {
      payload.daysOfWeek = Array.isArray(req.body.daysOfWeek)
        ? req.body.daysOfWeek.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
        : [];
    }
    const row = await prisma.workShift.update({ where: { id: existing.id }, data: payload });
    await createAuditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'UPDATE_SHIFT', resource: 'WorkShift', resourceId: row.id, oldValues: existing, newValues: payload, req });
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update shift' });
  }
}

async function listEntries(req, res) {
  try {
    const employeeId = req.query?.employeeId ? String(req.query.employeeId) : null;
    const from = req.query?.from ? new Date(req.query.from) : null;
    const to = req.query?.to ? new Date(req.query.to) : null;
    const where = { tenantId: req.tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (from || to) {
      where.clockInAt = {};
      if (from && !Number.isNaN(from.valueOf())) where.clockInAt.gte = from;
      if (to && !Number.isNaN(to.valueOf())) where.clockInAt.lte = to;
    }
    const rows = await prisma.attendanceEntry.findMany({ where, orderBy: { clockInAt: 'desc' }, take: 1000 });
    const employeeIds = [...new Set(rows.map((r) => r.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { tenantId: req.tenantId, id: { in: employeeIds } },
      select: { id: true, staffId: true, firstName: true, lastName: true, department: true, jobTitle: true },
    });
    const byId = Object.fromEntries(employees.map((e) => [e.id, e]));
    res.json({ data: rows.map((r) => ({ ...r, employee: byId[r.employeeId] || null })) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load attendance entries' });
  }
}

async function meAttendance(req, res) {
  try {
    const emp = await prisma.employee.findFirst({
      where: { tenantId: req.tenantId, userId: req.user.id, isActive: true },
      select: { id: true },
    });
    if (!emp) return res.status(403).json({ error: 'Employee profile not linked' });
    const today = new Date();
    const open = await prisma.attendanceEntry.findFirst({
      where: { tenantId: req.tenantId, employeeId: emp.id, status: 'CLOCKED_IN', clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });
    const recent = await prisma.attendanceEntry.findMany({
      where: { tenantId: req.tenantId, employeeId: emp.id, clockInAt: { gte: dayStart(today), lte: dayEnd(today) } },
      orderBy: { clockInAt: 'desc' },
      take: 20,
    });
    const shift = await prisma.workShift.findFirst({
      where: { tenantId: req.tenantId, isActive: true, OR: [{ employeeId: emp.id }, { employeeId: null }] },
      orderBy: [{ employeeId: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ data: { openEntry: open, todayEntries: recent, currentShift: shift } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load attendance' });
  }
}

async function clockIn(req, res) {
  try {
    const emp = await prisma.employee.findFirst({
      where: { tenantId: req.tenantId, userId: req.user.id, isActive: true },
      select: { id: true },
    });
    if (!emp) return res.status(403).json({ error: 'Employee profile not linked' });
    const existingOpen = await prisma.attendanceEntry.findFirst({
      where: { tenantId: req.tenantId, employeeId: emp.id, status: 'CLOCKED_IN', clockOutAt: null },
      select: { id: true },
    });
    if (existingOpen) return res.status(400).json({ error: 'You are already clocked in' });
    const shift = await prisma.workShift.findFirst({
      where: { tenantId: req.tenantId, isActive: true, OR: [{ employeeId: emp.id }, { employeeId: null }] },
      orderBy: [{ employeeId: 'desc' }, { createdAt: 'desc' }],
      select: { id: true },
    });
    const row = await prisma.attendanceEntry.create({
      data: {
        tenantId: req.tenantId,
        employeeId: emp.id,
        workShiftId: shift?.id || null,
        clockInAt: new Date(),
        noteIn: req.body?.noteIn ? String(req.body.noteIn).trim() : null,
      },
    });
    res.status(201).json({ data: row });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clock in' });
  }
}

async function clockOut(req, res) {
  try {
    const emp = await prisma.employee.findFirst({
      where: { tenantId: req.tenantId, userId: req.user.id, isActive: true },
      select: { id: true },
    });
    if (!emp) return res.status(403).json({ error: 'Employee profile not linked' });
    const id = String(req.params.id);
    const row = await prisma.attendanceEntry.findFirst({
      where: { id, tenantId: req.tenantId, employeeId: emp.id },
    });
    if (!row) return res.status(404).json({ error: 'Attendance entry not found' });
    if (row.clockOutAt) return res.status(400).json({ error: 'Already clocked out' });
    const updated = await prisma.attendanceEntry.update({
      where: { id: row.id },
      data: {
        clockOutAt: new Date(),
        status: 'CLOCKED_OUT',
        noteOut: req.body?.noteOut ? String(req.body.noteOut).trim() : null,
      },
    });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clock out' });
  }
}

module.exports = {
  listShifts,
  createShift,
  updateShift,
  listEntries,
  meAttendance,
  clockIn,
  clockOut,
};
