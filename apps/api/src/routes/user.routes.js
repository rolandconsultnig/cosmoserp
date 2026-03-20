const express = require('express');
const router = express.Router();
const { authenticate, requireRole, requireTenantUser } = require('../middleware/auth.middleware');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { paginate, paginatedResponse } = require('../utils/helpers');

router.use(authenticate, requireTenantUser);

router.put('/me', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body || {};
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
      select: { id: true, tenantId: true, email: true, firstName: true, lastName: true, phone: true, role: true, permissions: true, isActive: true },
    });
    if (updated.tenantId && updated.tenantId !== req.tenantId) return res.status(403).json({ error: 'Forbidden' });
    res.json({ data: updated });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/', requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: users });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.post('/', requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, permissions } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !firstName || !lastName || !password) {
      return res.status(422).json({ error: 'Email, first name, last name, and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(422).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await prisma.user.findFirst({ where: { email: normalizedEmail, tenantId: req.tenantId } });
    if (existing) return res.status(409).json({ error: 'User with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { tenantId: req.tenantId, email: normalizedEmail, passwordHash, firstName, lastName, role: role || 'STAFF', permissions },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ data: user });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'User with this email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', requireRole('OWNER','ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.tenantId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { firstName, lastName, role, permissions, isActive } = req.body;
    if (user.role === 'OWNER' && req.user.role !== 'OWNER') return res.status(403).json({ error: 'Cannot modify owner account' });
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { firstName, lastName, role, permissions, isActive },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: 'Failed to update user' }); }
});

module.exports = router;
