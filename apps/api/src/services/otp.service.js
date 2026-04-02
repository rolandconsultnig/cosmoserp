const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const OTP_ROUNDS = 10;

const PURPOSE_TTL_MS = {
  TENANT_REGISTRATION: 15 * 60 * 1000,
  ERP_PASSWORD_RESET: 15 * 60 * 1000,
  ADMIN_PASSWORD_RESET: 15 * 60 * 1000,
  MARKETPLACE_REGISTRATION: 24 * 60 * 60 * 1000,
  MARKETPLACE_PASSWORD_RESET: 15 * 60 * 1000,
};

function generateSixDigitCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Create a new OTP and return the plaintext code (for emailing only — do not log).
 * @throws Error with message RATE_LIMITED or INVALID_EMAIL
 */
async function createOtp(email, purpose) {
  const normalized = normalizeEmail(email);
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    const err = new Error('INVALID_EMAIL');
    throw err;
  }
  const ttl = PURPOSE_TTL_MS[purpose];
  if (!ttl) {
    throw new Error('INVALID_PURPOSE');
  }

  const recent = await prisma.emailOtp.findFirst({
    where: {
      email: normalized,
      purpose,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    const err = new Error('RATE_LIMITED');
    err.retryAfterSec = Math.ceil(RESEND_COOLDOWN_MS / 1000);
    throw err;
  }

  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, OTP_ROUNDS);
  const expiresAt = new Date(Date.now() + ttl);

  await prisma.emailOtp.create({
    data: {
      email: normalized,
      purpose,
      codeHash,
      expiresAt,
    },
  });

  return { code, normalizedEmail: normalized };
}

/**
 * Verify OTP for email+purpose and mark consumed. Increments attempts on wrong code.
 */
async function verifyAndConsumeOtp(email, purpose, rawCode) {
  const normalized = normalizeEmail(email);
  const code = String(rawCode || '').replace(/\s/g, '');
  if (!normalized || !/^\d{6}$/.test(code)) {
    return { ok: false, error: 'INVALID_OR_EXPIRED' };
  }

  const row = await prisma.emailOtp.findFirst({
    where: {
      email: normalized,
      purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!row) return { ok: false, error: 'INVALID_OR_EXPIRED' };
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: 'TOO_MANY_ATTEMPTS' };
  }

  const match = await bcrypt.compare(code, row.codeHash);
  if (!match) {
    await prisma.emailOtp.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: 'INVALID_CODE' };
  }

  await prisma.emailOtp.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}

/** Best-effort cleanup of expired rows (optional periodic call). */
async function deleteExpiredOtps() {
  const deleted = await prisma.emailOtp.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  if (deleted.count) logger.debug(`EmailOtp: removed ${deleted.count} expired rows`);
  return deleted.count;
}

module.exports = {
  createOtp,
  verifyAndConsumeOtp,
  deleteExpiredOtps,
  normalizeEmail,
  PURPOSE_TTL_MS,
};
