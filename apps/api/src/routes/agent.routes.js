const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const ctrl = require('../controllers/agent.controller');
const kycCtrl = require('../controllers/kyc.controller');
const { singleKycUpload } = require('../middleware/upload.middleware');

// Ensure the business (tenant) was onboarded by this agent
async function requireAgentBusiness(req, res, next) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: req.params.id, onboardedByAgentId: req.user.id },
  });
  if (!tenant) {
    return res.status(404).json({ error: 'Business not found' });
  }
  req.kycTenantId = req.params.id;
  next();
}

router.get('/me', ctrl.getMe);
router.get('/dashboard', ctrl.getDashboard);
router.get('/businesses', ctrl.listBusinesses);
router.get('/businesses/:id', ctrl.getBusiness);
router.post('/businesses', ctrl.createBusiness);

router.get('/businesses/:id/kyc', requireAgentBusiness, kycCtrl.getKyc);
router.put('/businesses/:id/kyc', requireAgentBusiness, kycCtrl.updateKycForm);
router.post('/businesses/:id/kyc/documents', requireAgentBusiness, (req, res, next) => { singleKycUpload(req, res, (err) => { if (err) return res.status(400).json({ error: err.message || 'Upload failed' }); next(); }); }, kycCtrl.uploadDocument);
router.delete('/businesses/:id/kyc/documents/:docId', requireAgentBusiness, kycCtrl.deleteDocument);
router.post('/businesses/:id/kyc/submit', requireAgentBusiness, kycCtrl.submitKyc);

module.exports = router;

