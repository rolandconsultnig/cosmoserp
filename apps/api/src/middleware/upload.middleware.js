const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
const KYC_DIR = 'kyc';
const AVATAR_DIR = 'avatars';
const TENANT_LOGO_DIR = 'tenant-logos';
const POD_DIR = 'logistics-pod';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TENANT_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
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

function getAvatarDir() {
  const dir = path.join(UPLOAD_BASE, AVATAR_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dir = getAvatarDir();
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = `${uuidv4()}${ext}`;
    cb(null, safe);
  },
});

const uploadAvatarFile = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const singleAvatarUpload = uploadAvatarFile.single('file');

const LOGO_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const logoFileFilter = (req, file, cb) => {
  if (!LOGO_MIMES.includes(file.mimetype)) {
    return cb(new Error('Logo must be JPEG, PNG, or WebP.'), false);
  }
  cb(null, true);
};

function getTenantLogoDir(tenantId) {
  const dir = path.join(UPLOAD_BASE, TENANT_LOGO_DIR, tenantId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const tenantLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tid = req.tenantId || req.params?.tenantId;
    if (!tid) {
      return cb(new Error('Tenant ID required for logo upload'));
    }
    try {
      cb(null, getTenantLogoDir(tid));
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safe = `${uuidv4()}${ext}`;
    cb(null, safe);
  },
});

const uploadTenantLogoFile = multer({
  storage: tenantLogoStorage,
  fileFilter: logoFileFilter,
  limits: { fileSize: MAX_TENANT_LOGO_SIZE },
});

const singleTenantLogoUpload = uploadTenantLogoFile.single('file');

function getPodDir(deliveryId) {
  const dir = path.join(UPLOAD_BASE, POD_DIR, deliveryId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const podStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = req.params?.id;
    if (!id) return cb(new Error('Delivery id required'));
    try {
      cb(null, getPodDir(id));
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = `pod-${uuidv4()}${ext}`;
    cb(null, safe);
  },
});

const uploadPodFile = multer({
  storage: podStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const singlePodUpload = uploadPodFile.single('file');

function getPodFileUrl(deliveryId, filename) {
  return `/uploads/${POD_DIR}/${deliveryId}/${filename}`;
}

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
  AVATAR_DIR,
  TENANT_LOGO_DIR,
  POD_DIR,
  singleAvatarUpload,
  singleTenantLogoUpload,
  singlePodUpload,
  getPodFileUrl,
};
