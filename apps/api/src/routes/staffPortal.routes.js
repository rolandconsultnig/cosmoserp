const router = require('express').Router();
const { authenticate, requireTenantUser, requireRole, requireEnabledModule } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/staffPortal.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads');
const STAFF_DOCS_DIR = 'staff-docs';

function getStaffDocsDir(tenantId, employeeId) {
  const dir = path.join(UPLOAD_BASE, STAFF_DOCS_DIR, tenantId, employeeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tenantId = req.tenantId;
    const employeeId = req.employeeIdForUpload;
    if (!tenantId || !employeeId) return cb(new Error('Tenant and employee context required'));
    cb(null, getStaffDocsDir(tenantId, employeeId));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Allowed: PDF, JPEG, PNG, WebP.'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate, requireTenantUser, requireEnabledModule('hrPayroll'), requireRole('STAFF', 'HR', 'ADMIN', 'OWNER'));

router.get('/me', ctrl.me);

router.get('/users', ctrl.listUsers);

router.get('/documents', ctrl.listDocuments);
router.post(
  '/documents',
  async (req, res, next) => {
    try {
      const prisma = require('../config/prisma');
      const employee = await prisma.employee.findFirst({
        where: { tenantId: req.tenantId, userId: req.user.id, isActive: true },
        select: { id: true },
      });
      if (!employee) return res.status(403).json({ error: 'Your user account is not linked to an employee profile. Ask HR to link your account.' });
      req.employeeIdForUpload = employee.id;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Failed to prepare upload' });
    }
  },
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      next();
    });
  },
  ctrl.uploadDocument
);

router.get('/payslips', ctrl.listPayslips);
router.get('/payslips/:id', ctrl.getPayslip);

router.get('/leave', ctrl.listLeave);
router.post('/leave', ctrl.applyLeave);

router.get('/resignations', ctrl.listResignations);
router.post('/resignations', ctrl.submitResignation);
router.post('/resignations/:id/withdraw', ctrl.withdrawResignation);

router.get('/messages/inbox', ctrl.inbox);
router.get('/messages/sent', ctrl.sent);
router.post('/messages', ctrl.sendMessage);
router.post('/messages/:id/read', ctrl.markRead);

module.exports = router;
