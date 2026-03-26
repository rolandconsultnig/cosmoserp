const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { createAuditLog } = require('../middleware/audit.middleware');

const USER_ROLES = new Set([
  'OWNER',
  'ADMIN',
  'ACCOUNTANT',
  'SALES',
  'WAREHOUSE',
  'HR',
  'STAFF',
  'VIEWER',
  'FIELD_AGENT',
  'CRM_MANAGER',
]);

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * Bulk-create users with generated temporary passwords (Owner / Admin).
 * Body: { invites: [ { email, firstName, lastName, role? } ] }
 */
async function bulkInvite(req, res) {
  try {
    const raw = req.body?.invites;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: 'invites must be a non-empty array' });
    }
    if (raw.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 invites per request' });
    }

    const actorIsOwner = req.user.role === 'OWNER';

    const created = [];
    const skipped = [];

    for (const item of raw) {
      const email = String(item?.email || '')
        .trim()
        .toLowerCase();
      const firstName = String(item?.firstName || '').trim();
      const lastName = String(item?.lastName || '').trim();
      let role = String(item?.role || 'STAFF').trim().toUpperCase();

      if (!email || !firstName || !lastName) {
        skipped.push({ email: email || '(missing)', reason: 'email, firstName and lastName are required' });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped.push({ email, reason: 'invalid email' });
        continue;
      }
      if (!USER_ROLES.has(role)) {
        skipped.push({ email, reason: `invalid role: ${role}` });
        continue;
      }
      if (role === 'OWNER') {
        skipped.push({ email, reason: 'cannot invite OWNER via bulk' });
        continue;
      }
      if (role === 'ADMIN' && !actorIsOwner) {
        skipped.push({ email, reason: 'only the business OWNER can assign ADMIN' });
        continue;
      }

      const existing = await prisma.user.findFirst({
        where: { email, tenantId: req.tenantId },
        select: { id: true },
      });
      if (existing) {
        skipped.push({ email, reason: 'email already exists in this organization' });
        continue;
      }

      const plain = randomPassword();
      const passwordHash = await bcrypt.hash(plain, 12);

      const user = await prisma.user.create({
        data: {
          tenantId: req.tenantId,
          email,
          firstName,
          lastName,
          role,
          passwordHash,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
      });

      created.push({
        ...user,
        temporaryPassword: plain,
      });
    }

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      action: 'BULK_INVITE',
      resource: 'User',
      resourceId: req.tenantId,
      newValues: {
        createdCount: created.length,
        skippedCount: skipped.length,
        created: created.map(({ id, email, firstName, lastName, role }) => ({
          id,
          email,
          firstName,
          lastName,
          role,
        })),
        skipped,
      },
      req,
    });

    res.status(201).json({
      data: {
        created,
        skipped,
      },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'One or more emails already exist' });
    }
    res.status(500).json({ error: 'Bulk invite failed' });
  }
}

module.exports = {
  bulkInvite,
};
