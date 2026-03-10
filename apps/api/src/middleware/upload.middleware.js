const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
const KYC_DIR = 'kyc';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function getKycDir(tenantId) {
  const dir = path.join(UPLOAD_BASE, KYC_DIR, tenantId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const kycStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.kycTenantId || req.params?.tenantId || req.params?.id;
    if (!tenantId) {
      return cb(new Error('Tenant ID required for KYC upload'));
    }
    try {
      const dir = getKycDir(tenantId);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || path.extname(file.mimetype && file.mimetype.includes('pdf') ? '.pdf' : '.jpg');
    const safe = `${uuidv4()}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, WebP.'), false);
  }
  cb(null, true);
};

const uploadKycFile = multer({
  storage: kycStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/** Single file upload. Expects: documentType in body (or field name 'documentType'), file in field 'file'. */
const singleKycUpload = uploadKycFile.single('file');

/** Set tenant id for multer destination (call before route that uses singleKycUpload). */
function setKycTenantId(tenantId) {
  return (req, res, next) => {
    req.kycTenantId = tenantId;
    next();
  };
}

function getKycFileUrl(tenantId, filename) {
  return `/uploads/${KYC_DIR}/${tenantId}/${filename}`;
}

module.exports = {
  singleKycUpload,
  setKycTenantId,
  getKycDir,
  getKycFileUrl,
  UPLOAD_BASE,
  KYC_DIR,
};
