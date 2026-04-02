const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { sendOtpEmail, sendMarketplaceWelcomeEmail } = require('../services/email.service');
const { createOtp, verifyAndConsumeOtp, PURPOSE_TTL_MS } = require('../services/otp.service');

const ROUNDS = 12;

function isMarketplaceEmailVerificationDisabled() {
  return (
    process.env.MARKETPLACE_DISABLE_EMAIL_VERIFICATION === 'true' ||
    process.env.DISABLE_MFA_EMAIL_CONFIRMATION === 'true'
  );
}

function signCustomerToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Send MARKETPLACE_REGISTRATION OTP if email is free (no customer yet).
 * @returns {{ ok: true }} or { error, status, retryAfterSec? }
 */
async function deliverMarketplaceRegistrationOtp(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    return { error: 'Email is required', status: 400 };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: 'Invalid email address', status: 400 };
  }

  const taken = await prisma.marketplaceCustomer.findUnique({ where: { email: normalized } });
  if (taken) {
    return { error: 'An account with this email already exists. Please sign in.', status: 409 };
  }

  let otpResult;
  try {
    otpResult = await createOtp(normalized, 'MARKETPLACE_REGISTRATION');
  } catch (e) {
    if (e.message === 'RATE_LIMITED') {
      return {
        error: 'Please wait a minute before requesting another code.',
        status: 429,
        retryAfterSec: e.retryAfterSec || 60,
      };
    }
    if (e.message === 'INVALID_EMAIL') {
      return { error: 'Invalid email address', status: 400 };
    }
    logger.error('Marketplace registration OTP createOtp failed:', e);
    const prismaCode = e && e.code;
    if (prismaCode === 'P2021') {
      return {
        error:
          'Email verification is not available yet. Ensure the API database has the latest migrations applied (EmailOtp table).',
        status: 503,
      };
    }
    if (prismaCode === 'P1001' || e.name === 'PrismaClientInitializationError') {
      return { error: 'Database is unavailable. Try again in a moment.', status: 503 };
    }
    throw e;
  }

  const ttlMinutes = Math.round((PURPOSE_TTL_MS.MARKETPLACE_REGISTRATION || 86400000) / 60000);
  try {
    await sendOtpEmail(otpResult.normalizedEmail, otpResult.code, {
      title: 'Your Cosmos Marketplace registration code',
      tagline: 'customer registration',
      ttlMinutes,
    });
  } catch (emailErr) {
    logger.error('Marketplace registration OTP email failed:', emailErr);
    const body = {
      error: 'Could not send email. Check SMTP settings or try again later.',
      status: 503,
    };
    if (process.env.NODE_ENV === 'development' && emailErr?.message) {
      body.detail = emailErr.message;
    }
    return body;
  }

  return { ok: true };
}

async function sendRegistrationOtp(req, res) {
  try {
    if (isMarketplaceEmailVerificationDisabled()) {
      return res.json({
        message: 'Email verification is disabled on this server. You can register without a code.',
        disabled: true,
      });
    }
    const result = await deliverMarketplaceRegistrationOtp(req.body?.email);
    if (!result.ok) {
      const body = { error: result.error };
      if (result.retryAfterSec != null) body.retryAfterSec = result.retryAfterSec;
      if (result.detail != null) body.detail = result.detail;
      return res.status(result.status).json(body);
    }
    res.json({ message: 'Verification code sent. Check your inbox.' });
  } catch (error) {
    logger.error('sendRegistrationOtp error:', error);
    const hint =
      process.env.NODE_ENV === 'development' && error && error.message
        ? { detail: error.message }
        : {};
    res.status(500).json({ error: 'Failed to send verification code', ...hint });
  }
}

async function resendRegistrationOtp(req, res) {
  try {
    if (isMarketplaceEmailVerificationDisabled()) {
      return res.json({ message: 'Email verification is disabled on this server.', disabled: true });
    }
    const result = await deliverMarketplaceRegistrationOtp(req.body?.email);
    if (!result.ok) {
      const body = { error: result.error };
      if (result.retryAfterSec != null) body.retryAfterSec = result.retryAfterSec;
      if (result.detail != null) body.detail = result.detail;
      return res.status(result.status).json(body);
    }
    res.json({ message: 'A new verification code has been sent. Check your inbox.' });
  } catch (error) {
    logger.error('resendRegistrationOtp error:', error);
    const hint =
      process.env.NODE_ENV === 'development' && error && error.message
        ? { detail: error.message }
        : {};
    res.status(500).json({ error: 'Failed to resend verification code', ...hint });
  }
}

async function register(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      logger.error('Marketplace register: JWT_SECRET is not set');
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName : '';
    const phone = body.phone != null ? String(body.phone) : '';

    const normalizedEmail = email.trim().toLowerCase();
    const fullNameTrimmed = fullName.trim();
    const phoneTrimmed = phone.trim() || null;

    const da = body.deliveryAddress && typeof body.deliveryAddress === 'object' ? body.deliveryAddress : {};
    const deliveryLine = String(da.address ?? '').trim();
    const deliveryCity = String(da.city ?? '').trim();
    const deliveryState = String(da.state ?? '').trim();
    const deliveryRecipient = String(da.recipientName ?? '').trim() || fullNameTrimmed;

    if (!normalizedEmail || !password || !fullNameTrimmed) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!deliveryLine || deliveryLine.length < 5) {
      return res.status(400).json({ error: 'Delivery street address is required (at least 5 characters).' });
    }
    if (!deliveryCity) {
      return res.status(400).json({ error: 'Delivery city is required.' });
    }
    if (!deliveryState) {
      return res.status(400).json({ error: 'Delivery state is required.' });
    }

    const existing = await prisma.marketplaceCustomer.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    const disableVerification = isMarketplaceEmailVerificationDisabled();

    if (!disableVerification) {
      const otpStr = String(body.otp ?? body.code ?? '').trim();
      if (!otpStr) {
        return res.status(400).json({
          error: 'Email verification code is required. Use “Email code” on the registration form first.',
        });
      }
      const verify = await verifyAndConsumeOtp(normalizedEmail, 'MARKETPLACE_REGISTRATION', otpStr);
      if (!verify.ok) {
        const msg = {
          INVALID_OR_EXPIRED: 'Invalid or expired code. Request a new code.',
          INVALID_CODE: 'Incorrect code.',
          TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Request a new code.',
        }[verify.error] || 'Verification failed';
        return res.status(400).json({ error: msg });
      }
    }

    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.marketplaceCustomer.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: fullNameTrimmed,
          phone: phoneTrimmed,
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
      await tx.marketplaceCustomerAddress.create({
        data: {
          customerId: c.id,
          label: 'Delivery',
          name: deliveryRecipient,
          phone: phoneTrimmed,
          address: deliveryLine,
          city: deliveryCity,
          state: deliveryState,
          isDefault: true,
        },
      });
      return c;
    });

    sendMarketplaceWelcomeEmail(customer.email, {
      fullName: customer.fullName,
      needsEmailVerification: false,
    }).catch((err) => logger.warn('Marketplace welcome email failed:', err.message));

    const token = signCustomerToken({
      type: 'marketplace_customer',
      customerId: customer.id,
      email: customer.email,
    });
    return res.status(201).json({
      message: 'Account created.',
      accessToken: token,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
      },
      requiresVerification: false,
    });
  } catch (error) {
    logger.error('Marketplace customer register error:', error);
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      logger.error('Marketplace login: JWT_SECRET is not set');
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await prisma.marketplaceCustomer.findUnique({
      where: { email: normalizedEmail },
    });
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!customer.emailVerified && !isMarketplaceEmailVerificationDisabled()) {
      return res.status(403).json({
        error: 'Please verify your email before signing in. Check your inbox or request a new link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: customer.email,
      });
    }

    const token = signCustomerToken({
      type: 'marketplace_customer',
      customerId: customer.id,
      email: customer.email,
    });

    res.json({
      accessToken: token,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
      },
    });
  } catch (error) {
    logger.error('Marketplace customer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function getMe(req, res) {
  try {
    const customer = req.customer;
    res.json({
      data: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Marketplace customer getMe error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName, phone, avatarUrl } = req.body;
    const data = {};
    if (fullName !== undefined) data.fullName = fullName.trim();
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
    const customer = await prisma.marketplaceCustomer.update({
      where: { id: req.customer.id },
      data,
    });
    res.json({
      data: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Marketplace customer updateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

async function listMyOrders(req, res) {
  try {
    const email = req.customer.email;
    const { page = 1, limit = 20, status, escrowStatus } = req.query;
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const where = { buyerEmail: email };
    if (status) where.status = status;
    if (escrowStatus && String(escrowStatus).trim()) {
      where.escrowStatus = String(escrowStatus).trim();
    }

    const [orders, total] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          lines: {
            take: 5,
            include: { listing: { select: { title: true, images: true } } },
          },
        },
      }),
      prisma.marketplaceOrder.count({ where }),
    ]);

    res.json({
      data: orders,
      meta: {
        page: Number(page) || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    logger.error('Marketplace customer listMyOrders error:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
}

async function getMyOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.marketplaceOrder.findFirst({
      where: { id, buyerEmail: req.customer.email },
      include: {
        lines: { include: { listing: { select: { title: true, images: true, slug: true } } } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ data: order });
  } catch (error) {
    logger.error('Marketplace customer getMyOrder error:', error);
    res.status(500).json({ error: 'Failed to load order' });
  }
}

/** Buyer-initiated dispute (mirrors seller flow; freezes escrow flag). */
async function openOrderDispute(req, res) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const order = await prisma.marketplaceOrder.findFirst({
      where: { id: req.params.id, buyerEmail: req.customer.email },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'DISPUTED') {
      return res.status(400).json({ error: 'This order is already disputed' });
    }
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot dispute this order' });
    }
    if (order.paymentStatus !== 'SUCCESS') {
      return res.status(400).json({ error: 'Disputes are available after payment is completed' });
    }

    const stamp = new Date().toISOString();
    const line = `[BUYER_DISPUTE ${stamp}] ${reason}`;
    const notes = order.notes ? `${order.notes}\n${line}` : line;

    const updated = await prisma.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        status: 'DISPUTED',
        escrowStatus: 'DISPUTED',
        notes,
      },
    });

    res.json({
      data: { id: updated.id, status: updated.status, escrowStatus: updated.escrowStatus },
      message: 'Dispute opened. Our support team will review your case.',
    });
  } catch (error) {
    logger.error('Marketplace customer openOrderDispute error:', error);
    res.status(500).json({ error: 'Failed to open dispute' });
  }
}

async function verifyEmail(req, res) {
  try {
    if (isMarketplaceEmailVerificationDisabled()) {
      return res.json({ message: 'Email verification is disabled on this server. You can sign in.', disabled: true });
    }

    const bodyEmail = (req.body?.email || '').trim().toLowerCase();
    const bodyCode = req.body?.code ?? req.body?.otp;
    if (bodyEmail && bodyCode != null && String(bodyCode).trim() !== '') {
      const v = await verifyAndConsumeOtp(bodyEmail, 'MARKETPLACE_REGISTRATION', bodyCode);
      if (!v.ok) {
        const msg = {
          INVALID_OR_EXPIRED: 'Invalid or expired code. Request a new one from the sign-in page.',
          INVALID_CODE: 'Incorrect code.',
          TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Request a new code.',
        }[v.error] || 'Verification failed';
        return res.status(400).json({ error: msg });
      }
      const customer = await prisma.marketplaceCustomer.findUnique({ where: { email: bodyEmail } });
      if (!customer) return res.status(400).json({ error: 'Account not found' });
      await prisma.marketplaceCustomer.update({
        where: { id: customer.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
      return res.json({ message: 'Email verified. You can now sign in.', email: customer.email });
    }

    const token = (req.query.token || req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Verification code or link token is required' });
    }
    const customer = await prisma.marketplaceCustomer.findFirst({
      where: { emailVerificationToken: token },
    });
    if (!customer) {
      return res.status(400).json({ error: 'Invalid or expired verification link' });
    }
    if (customer.emailVerificationExpiresAt && new Date() > customer.emailVerificationExpiresAt) {
      return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
    }
    await prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    res.json({ message: 'Email verified. You can now sign in.', email: customer.email });
  } catch (error) {
    logger.error('Marketplace verifyEmail error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
}

async function resendVerificationEmail(req, res) {
  try {
    if (isMarketplaceEmailVerificationDisabled()) {
      return res.json({ message: 'Email verification is disabled on this server.', disabled: true });
    }
    const email = (req.body?.email || req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const customer = await prisma.marketplaceCustomer.findUnique({
      where: { email },
    });
    if (!customer) {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    if (customer.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified. You can sign in.' });
    }
    try {
      const otpResult = await createOtp(email, 'MARKETPLACE_REGISTRATION');
      const ttlMinutes = Math.round((PURPOSE_TTL_MS.MARKETPLACE_REGISTRATION || 86400000) / 60000);
      await sendOtpEmail(customer.email, otpResult.code, {
        title: 'Your Cosmos Marketplace verification code',
        tagline: 'account verification',
        ttlMinutes,
      });
    } catch (err) {
      if (err.message === 'RATE_LIMITED') {
        return res.status(429).json({
          error: 'Please wait a minute before requesting another code.',
          retryAfterSec: err.retryAfterSec || 60,
        });
      }
      logger.error('Marketplace resendVerification OTP send failed:', err);
      return res.status(503).json({
        error: 'Verification email could not be sent. Please try again later or contact support.',
        code: 'EMAIL_SEND_FAILED',
      });
    }
    res.json({ message: 'Verification code sent. Please check your inbox.' });
  } catch (error) {
    logger.error('Marketplace resendVerification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}

function getMarketplaceBaseUrl() {
  return process.env.MARKETPLACE_URL || process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:5176';
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return res.status(400).json({ error: 'Email is required' });

    const customer = await prisma.marketplaceCustomer.findUnique({ where: { email: normalized } });
    if (customer) {
      const resetToken = jwt.sign(
        { customerId: customer.id, type: 'marketplace_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const baseUrl = getMarketplaceBaseUrl().replace(/\/$/, '');
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
      try {
        await sendPasswordResetEmail(customer.email, customer.fullName, resetLink, 'Marketplace');
      } catch (emailErr) {
        logger.error('Marketplace forgot-password email failed:', emailErr);
        return res.status(503).json({ error: 'Could not send reset email. Please try again later.' });
      }
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Marketplace forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password, email, code } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (email && code) {
      const normalized = String(email).trim().toLowerCase();
      const v = await verifyAndConsumeOtp(normalized, 'MARKETPLACE_PASSWORD_RESET', code);
      if (!v.ok) {
        const msg = {
          INVALID_OR_EXPIRED: 'Invalid or expired code.',
          INVALID_CODE: 'Incorrect code.',
          TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Request a new code.',
        }[v.error] || 'Verification failed';
        return res.status(400).json({ error: msg });
      }
      const customer = await prisma.marketplaceCustomer.findUnique({ where: { email: normalized } });
      if (!customer) return res.status(400).json({ error: 'Account not found' });
      const passwordHash = await bcrypt.hash(password, ROUNDS);
      await prisma.marketplaceCustomer.update({
        where: { id: customer.id },
        data: { passwordHash },
      });
      return res.json({ message: 'Password reset successful' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Enter the code from your email and your new password, or use a reset link from an older email.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'marketplace_reset' || !decoded.customerId) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    await prisma.marketplaceCustomer.update({
      where: { id: decoded.customerId },
      data: { passwordHash },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
}

async function changePassword(req, res) {
  try {
    const body = req.body || {};
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const customer = req.customer;
    if (!customer) return res.status(401).json({ error: 'Authentication required' });

    const ok = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, ROUNDS);
    await prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated' });
  } catch (error) {
    logger.error('Marketplace customer changePassword error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
}

async function listAddresses(req, res) {
  try {
    const customer = req.customer;
    const items = await prisma.marketplaceCustomerAddress.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ data: items });
  } catch (error) {
    logger.error('Marketplace customer listAddresses error:', error);
    res.status(500).json({ error: 'Failed to load addresses' });
  }
}

async function upsertAddress(req, res) {
  try {
    const customer = req.customer;
    const id = req.params.id;
    const body = req.body || {};
    const name = (body.name || '').trim();
    const address = (body.address || '').trim();
    const label = (body.label || 'Address').trim();
    const phone = (body.phone || '').trim() || null;
    const city = (body.city || '').trim() || null;
    const state = (body.state || '').trim() || null;
    const isDefault = !!body.isDefault;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const data = { label, name, phone, address, city, state, isDefault };

    const result = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.marketplaceCustomerAddress.updateMany({
          where: { customerId: customer.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      if (id) {
        const existing = await tx.marketplaceCustomerAddress.findFirst({
          where: { id, customerId: customer.id },
        });
        if (!existing) {
          throw Object.assign(new Error('Address not found'), { status: 404 });
        }
        return tx.marketplaceCustomerAddress.update({
          where: { id: existing.id },
          data,
        });
      }
      return tx.marketplaceCustomerAddress.create({
        data: {
          ...data,
          customerId: customer.id,
        },
      });
    });

    res.json({ data: result });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Address not found' });
    }
    logger.error('Marketplace customer upsertAddress error:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
}

async function deleteAddress(req, res) {
  try {
    const customer = req.customer;
    const id = req.params.id;
    const existing = await prisma.marketplaceCustomerAddress.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Address not found' });
    }
    await prisma.marketplaceCustomerAddress.delete({ where: { id: existing.id } });
    res.json({ message: 'Address removed' });
  } catch (error) {
    logger.error('Marketplace customer deleteAddress error:', error);
    res.status(500).json({ error: 'Failed to remove address' });
  }
}

async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const customer = req.customer;
    const publicUrl = `/uploads/avatars/${req.file.filename}`;
    const updated = await prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: { avatarUrl: publicUrl },
    });
    res.json({
      data: {
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    logger.error('Marketplace customer uploadAvatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
}

module.exports = {
  sendRegistrationOtp,
  resendRegistrationOtp,
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  listMyOrders,
  getMyOrder,
  openOrderDispute,
  listAddresses,
  upsertAddress,
  deleteAddress,
  uploadAvatar,
};
