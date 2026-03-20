const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');
const { sendPasswordResetEmail } = require('../services/email.service');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

async function login(req, res) {
  try {
    const { email, password, tenantId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isActive: true },
      include: {
        tenant: {
          select: {
            id: true, businessName: true, tradingName: true, logoUrl: true,
            kycStatus: true, subscriptionStatus: true, subscriptionPlan: true, isActive: true,
          },
        },
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.tenant.isActive) {
      return res.status(403).json({ error: 'Your business account has been suspended' });
    }

    const accessToken = signToken({ id: user.id, tenantId: user.tenantId, role: user.role, type: 'user' });
    const refreshTokenStr = signRefreshToken({ id: user.id, type: 'user' });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await createAuditLog({ tenantId: user.tenantId, userId: user.id, action: 'LOGIN', resource: 'User', resourceId: user.id, req });

    res.json({
      accessToken,
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        tenant: user.tenant,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const admin = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!admin.isActive) return res.status(403).json({ error: 'Account inactive' });

    const accessToken = signToken({ id: admin.id, role: admin.role, type: 'admin' });
    const refreshTokenStr = signRefreshToken({ id: admin.id, type: 'admin' });

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    await createAuditLog({ adminUserId: admin.id, action: 'ADMIN_LOGIN', resource: 'AdminUser', resourceId: admin.id, req });

    res.json({
      accessToken,
      refreshToken: refreshTokenStr,
      admin: { id: admin.id, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const storedToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    let accessToken;
    if (decoded.type === 'admin') {
      const admin = await prisma.adminUser.findUnique({ where: { id: decoded.id } });
      if (!admin || !admin.isActive) return res.status(401).json({ error: 'Account not found' });
      accessToken = signToken({ id: admin.id, role: admin.role, type: 'admin' });
    } else {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.isActive) return res.status(401).json({ error: 'Account not found' });
      accessToken = signToken({ id: user.id, tenantId: user.tenantId, role: user.role, type: 'user' });
    }

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
}

async function me(req, res) {
  try {
    if (req.isAdmin) {
      return res.json({ admin: req.admin, type: 'admin' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        tenantId: true,
        tenant: true,
      },
    });
    res.json({
      user,
      type: 'user',
      impersonation: req.impersonatedByAdminId
        ? { impersonatedByAdminId: req.impersonatedByAdminId }
        : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// admin-specific "me" endpoint used by the admin frontend
async function adminMe(req, res) {
  try {
    // authenticate middleware ensures req.isAdmin and req.admin exist
    res.json({ admin: req.admin, type: 'admin' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
}

function getErpBaseUrl() {
  return process.env.ERP_URL || process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:3060';
}

function getAdminBaseUrl() {
  return process.env.ADMIN_URL || process.env.API_PUBLIC_URL || process.env.API_URL || 'http://localhost:5175';
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findFirst({
      where: { email: normalized },
      include: { tenant: { select: { businessName: true } } },
    });
    if (user) {
      const resetToken = jwt.sign({ id: user.id, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const baseUrl = getErpBaseUrl().replace(/\/$/, '');
      const resetLink = `${baseUrl}/erp/reset-password?token=${encodeURIComponent(resetToken)}`;
      try {
        await sendPasswordResetEmail(user.email, `${user.firstName} ${user.lastName}`.trim(), resetLink, 'ERP');
      } catch (emailErr) {
        logger.error('ERP forgot-password email failed:', emailErr);
        return res.status(503).json({ error: 'Could not send reset email. Please try again later.' });
      }
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid token and password (min 8 chars) required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') return res.status(400).json({ error: 'Invalid reset token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: decoded.id }, data: { passwordHash } });
    await prisma.refreshToken.deleteMany({ where: { userId: decoded.id } });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
}

async function adminForgotPassword(req, res) {
  try {
    const { email } = req.body;
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return res.status(400).json({ error: 'Email is required' });

    const admin = await prisma.adminUser.findUnique({ where: { email: normalized } });
    if (admin) {
      const resetToken = jwt.sign({ id: admin.id, type: 'admin_reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const baseUrl = getAdminBaseUrl().replace(/\/$/, '');
      const resetLink = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;
      try {
        await sendPasswordResetEmail(admin.email, `${admin.firstName} ${admin.lastName}`.trim(), resetLink, 'Admin');
      } catch (emailErr) {
        logger.error('Admin forgot-password email failed:', emailErr);
        return res.status(503).json({ error: 'Could not send reset email. Please try again later.' });
      }
    }
    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Admin forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

async function adminResetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Valid token and password (min 8 chars) required' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin_reset') return res.status(400).json({ error: 'Invalid reset token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.update({ where: { id: decoded.id }, data: { passwordHash } });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Current password and new password (min 8 chars) required' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
}

module.exports = {
  login,
  adminLogin,
  refresh,
  logout,
  me,
  adminMe,
  forgotPassword,
  resetPassword,
  adminForgotPassword,
  adminResetPassword,
  changePassword,
};
