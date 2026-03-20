const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenant.controller');
const kycCtrl = require('../controllers/kyc.controller');
const { authenticate, requireAdmin, requireTenantUser } = require('../middleware/auth.middleware');
const { singleKycUpload, singleTenantLogoUpload } = require('../middleware/upload.middleware');

router.post('/register', ctrl.register);
router.get('/me', authenticate, requireTenantUser, ctrl.getMyTenant);
router.put('/me', authenticate, requireTenantUser, ctrl.updateMyTenant);
router.post(
  '/me/logo',
  authenticate,
  requireTenantUser,
  (req, res, next) => {
    singleTenantLogoUpload(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      next();
    });
  },
  ctrl.uploadTenantLogo
);
router.get('/me/kyc', authenticate, requireTenantUser, kycCtrl.getKyc);
router.put('/me/kyc', authenticate, requireTenantUser, kycCtrl.updateKycForm);
router.post('/me/kyc/documents', authenticate, requireTenantUser, (req, res, next) => { req.kycTenantId = req.tenantId; next(); }, (req, res, next) => { singleKycUpload(req, res, (err) => { if (err) return res.status(400).json({ error: err.message || 'Upload failed' }); next(); }); }, kycCtrl.uploadDocument);
router.delete('/me/kyc/documents/:docId', authenticate, requireTenantUser, kycCtrl.deleteDocument);
router.post('/me/kyc/submit', authenticate, requireTenantUser, kycCtrl.submitKyc);
router.post('/me/kyc', authenticate, requireTenantUser, ctrl.submitKYC);

router.get('/', authenticate, requireAdmin, ctrl.list);
router.get('/:id', authenticate, requireAdmin, ctrl.getOne);
router.put('/:id/kyc', authenticate, requireAdmin, ctrl.updateKYCStatus);
router.put('/:id/subscription', authenticate, requireAdmin, ctrl.updateSubscription);
router.put('/:id/toggle', authenticate, requireAdmin, ctrl.toggleActive);

module.exports = router;
