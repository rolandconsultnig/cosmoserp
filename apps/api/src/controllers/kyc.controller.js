const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { logger } = require('../utils/logger');
const { createAuditLog } = require('../middleware/audit.middleware');
const { getKycFileUrl, UPLOAD_BASE, KYC_DIR } = require('../middleware/upload.middleware');

/** Resolve tenant ID: from req.tenantId (tenant me) or req.params.id (agent) after ownership check */
function getTenantId(req) {
  return req.tenantId || (req.params && req.params.id);
}

/** Get full KYC data for a tenant: form fields + documents list */
async function getKyc(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        tradingName: true,
        tin: true,
        rcNumber: true,
        kycStatus: true,
        kycFormData: true,
        kycRejectionReason: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        bankSortCode: true,
        address: true,
        city: true,
        state: true,
        email: true,
        phone: true,
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const documents = await prisma.kycDocument.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        filePath: true,
        mimeType: true,
        fileSize: true,
        notes: true,
        uploadedAt: true,
      },
    });

    const baseUrl = process.env.API_PUBLIC_URL || '';
    const docsWithUrl = documents.map((d) => {
      const filename = d.filePath.includes('/') ? d.filePath.split('/').pop() : path.basename(d.filePath);
      return { ...d, fileUrl: baseUrl + getKycFileUrl(tenantId, filename) };
    });

    res.json({
      data: {
        ...tenant,
        documents: docsWithUrl,
      },
    });
  } catch (error) {
    logger.error('KYC get error:', error);
    res.status(500).json({ error: 'Failed to load KYC data' });
  }
}

/** Update KYC form data (and optional tin, rcNumber, bank fields) */
async function updateKycForm(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { tin, rcNumber, bankName, bankAccountNumber, bankAccountName, bankSortCode, kycFormData } = req.body;
    const updateData = {};
    if (tin !== undefined) updateData.tin = tin;
    if (rcNumber !== undefined) updateData.rcNumber = rcNumber;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;
    if (bankSortCode !== undefined) updateData.bankSortCode = bankSortCode;
    if (kycFormData !== undefined) updateData.kycFormData = kycFormData;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: 'KYC_FORM_UPDATE',
      resource: 'Tenant',
      resourceId: tenantId,
      newValues: updateData,
      req,
    });

    res.json({ data: tenant, message: 'KYC form updated' });
  } catch (error) {
    logger.error('KYC form update error:', error);
    res.status(500).json({ error: 'Failed to update KYC form' });
  }
}

/** Upload a single KYC document. Expects multer to have set req.file and body: documentType, optional notes */
async function uploadDocument(req, res) {
  try {
    const tenantId = req.kycTenantId || getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }
    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentType = req.body.documentType;
    const allowed = [
      'CAC_CERTIFICATE', 'CAC_PARTICULARS', 'CAC_FORM', 'DIRECTOR_ID', 'DIRECTOR_PHOTO',
      'PROOF_OF_ADDRESS', 'UTILITY_BILL', 'BANK_STATEMENT', 'TAX_CLEARANCE', 'OTHER',
    ];
    if (!documentType || !allowed.includes(documentType)) {
      return res.status(400).json({ error: 'Valid documentType required: ' + allowed.join(', ') });
    }

    const relativePath = path.relative(UPLOAD_BASE, req.file.path).replace(/\\/g, '/');
    const doc = await prisma.kycDocument.create({
      data: {
        tenantId,
        documentType,
        filePath: relativePath,
        fileName: req.file.originalname || path.basename(req.file.path),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        notes: req.body.notes || null,
        uploadedById: req.user?.id || null,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: 'KYC_DOCUMENT_UPLOAD',
      resource: 'KycDocument',
      resourceId: doc.id,
      newValues: { documentType, fileName: doc.fileName },
      req,
    });

    const baseUrl = process.env.API_PUBLIC_URL || '';
    const filename = doc.filePath.includes('/') ? doc.filePath.split('/').pop() : path.basename(doc.filePath);
    res.status(201).json({
      message: 'Document uploaded',
      data: {
        ...doc,
        fileUrl: baseUrl + getKycFileUrl(tenantId, filename),
      },
    });
  } catch (error) {
    logger.error('KYC upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}

/** Delete a KYC document (and file from disk) */
async function deleteDocument(req, res) {
  try {
    const tenantId = getTenantId(req);
    const docId = req.params.docId;
    if (!tenantId || !docId) {
      return res.status(400).json({ error: 'Tenant and document id required' });
    }

    const doc = await prisma.kycDocument.findFirst({
      where: { id: docId, tenantId },
    });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullPath = path.isAbsolute(doc.filePath) ? doc.filePath : path.join(UPLOAD_BASE, doc.filePath.replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch (e) {
        logger.warn('Could not delete KYC file:', fullPath, e.message);
      }
    }

    await prisma.kycDocument.delete({ where: { id: docId } });
    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: 'KYC_DOCUMENT_DELETE',
      resource: 'KycDocument',
      resourceId: docId,
      req,
    });

    res.json({ message: 'Document deleted' });
  } catch (error) {
    logger.error('KYC delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

/** Submit KYC for review (set status to UNDER_REVIEW). Optionally accept tin, rcNumber, kycFormData in body. */
async function submitKyc(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { tin, rcNumber, kycFormData } = req.body || {};
    const updateData = { kycStatus: 'UNDER_REVIEW' };
    if (tin !== undefined) updateData.tin = tin;
    if (rcNumber !== undefined) updateData.rcNumber = rcNumber;
    if (kycFormData !== undefined) updateData.kycFormData = kycFormData;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    await createAuditLog({
      tenantId,
      userId: req.user?.id,
      action: 'KYC_SUBMIT',
      resource: 'Tenant',
      resourceId: tenantId,
      newValues: { kycStatus: 'UNDER_REVIEW' },
      req,
    });

    res.json({
      message: 'KYC submitted for review. Review typically takes 1–3 business days.',
      data: { kycStatus: tenant.kycStatus },
    });
  } catch (error) {
    logger.error('KYC submit error:', error);
    res.status(500).json({ error: 'Failed to submit KYC' });
  }
}

module.exports = {
  getKyc,
  updateKycForm,
  uploadDocument,
  deleteDocument,
  submitKyc,
};
