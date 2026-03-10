const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'marketplace_customer') {
      const customer = await prisma.marketplaceCustomer.findUnique({
        where: { id: decoded.customerId },
      });
      if (!customer) return res.status(401).json({ error: 'Account not found' });
      req.customer = customer;
      return next();
    }

    if (decoded.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
      if (!admin || !admin.isActive) {
        return res.status(401).json({ error: 'Account not found or inactive' });
      }
      req.admin = admin;
      req.isAdmin = true;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { tenant: { select: { id: true, businessName: true, kycStatus: true, subscriptionStatus: true, isActive: true } } },
      });
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Account not found or inactive' });
      }
      if (!user.tenant.isActive) {
        return res.status(403).json({ error: 'Your business account has been suspended' });
      }
      req.user = user;
      req.tenantId = user.tenantId;
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.isAdmin) return next();
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function requireKYC(req, res, next) {
  if (req.isAdmin) return next();
  if (req.user?.tenant?.kycStatus !== 'APPROVED') {
    return res.status(403).json({
      error: 'KYC verification required to perform this action',
      code: 'KYC_REQUIRED',
      kycStatus: req.user?.tenant?.kycStatus,
    });
  }
  next();
}

function authenticateMarketplace(req, res, next) {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    if (!req.customer) return res.status(403).json({ error: 'Customer account required' });
    next();
  });
}

module.exports = { authenticate, authenticateMarketplace, requireAdmin, requireRole, requireKYC };
