const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');

async function createAuditLog({ tenantId, userId, adminUserId, action, resource, resourceId, oldValues, newValues, metadata, req }) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        adminUserId,
        action,
        resource,
        resourceId,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
        userAgent: req?.headers?.['user-agent'],
      },
    });
  } catch (error) {
    logger.error('Audit log creation failed:', error.message);
  }
}

function auditAction(action, resource) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400 && (req.user || req.admin)) {
        const impersonationMeta = req.impersonatedByAdminId
          ? { impersonatedByAdminId: req.impersonatedByAdminId }
          : undefined;
        await createAuditLog({
          tenantId: req.tenantId,
          userId: req.user?.id,
          adminUserId: req.admin?.id,
          action,
          resource,
          resourceId: req.params?.id || body?.data?.id,
          newValues: req.body,
          metadata: impersonationMeta,
          req,
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { createAuditLog, auditAction };
