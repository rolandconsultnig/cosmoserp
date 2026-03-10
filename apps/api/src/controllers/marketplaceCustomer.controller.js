const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { sendVerificationEmail } = require('../services/email.service');

const ROUNDS = 12;
const VERIFICATION_EXPIRY_HOURS = 24;

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function signCustomerToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
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

    if (!normalizedEmail || !password || !fullNameTrimmed) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.marketplaceCustomer.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const passwordHash = await bcrypt.hash(password, ROUNDS);
    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const customer = await prisma.marketplaceCustomer.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: fullNameTrimmed,
        phone: phoneTrimmed,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
    });

    try {
      await sendVerificationEmail(customer.email, customer.fullName, verificationToken);
    } catch (emailErr) {
      logger.error('Verification email send failed:', emailErr);
      // still succeed registration; user can request resend
    }

    res.status(201).json({
      message: 'Account created. Please check your email to verify your account before signing in.',
      email: customer.email,
      requiresVerification: true,
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
    if (!customer.emailVerified) {
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
      },
    });
  } catch (error) {
    logger.error('Marketplace customer getMe error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { fullName, phone } = req.body;
    const customer = await prisma.marketplaceCustomer.update({
      where: { id: req.customer.id },
      data: {
        ...(fullName !== undefined && { fullName: fullName.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    });
    res.json({
      data: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
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
    const { page = 1, limit = 20, status } = req.query;
    const take = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(1, Number(page)) - 1) * take;
    const where = { buyerEmail: email };
    if (status) where.status = status;

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

async function verifyEmail(req, res) {
  try {
    const token = (req.query.token || req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
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
    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);
    await prisma.marketplaceCustomer.update({
      where: { id: customer.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
      },
    });
    try {
      await sendVerificationEmail(customer.email, customer.fullName, verificationToken);
    } catch (emailErr) {
      logger.error('Marketplace resendVerification email send failed:', emailErr);
      return res.status(503).json({
        error: 'Verification email could not be sent. The server may not have email configured. Please try again later or contact support.',
        code: 'EMAIL_SEND_FAILED',
      });
    }
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    logger.error('Marketplace resendVerification error:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
}

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  updateProfile,
  listMyOrders,
  getMyOrder,
};
