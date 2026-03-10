const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

const ROUNDS = 12;

function signCustomerToken(payload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  try {
    const { email, password, fullName, phone } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password || !fullName) {
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
    const customer = await prisma.marketplaceCustomer.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: (fullName || '').trim(),
        phone: (phone || '').trim() || null,
      },
    });

    const token = signCustomerToken({
      type: 'marketplace_customer',
      customerId: customer.id,
      email: customer.email,
    });

    res.status(201).json({
      accessToken: token,
      customer: {
        id: customer.id,
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
      },
    });
  } catch (error) {
    logger.error('Marketplace customer register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await prisma.marketplaceCustomer.findUnique({
      where: { email: normalizedEmail },
    });
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
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

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  listMyOrders,
  getMyOrder,
};
