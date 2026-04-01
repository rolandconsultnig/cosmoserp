const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { authenticate, requireTenantUser } = require('../middleware/auth.middleware');
const { singlePodUpload } = require('../middleware/upload.middleware');
const { auditAction } = require('../middleware/audit.middleware');
const logistics = require('../controllers/logistics.controller');

const JWT_SECRET = process.env.JWT_SECRET || 'cosmos-secret-key';

// Middleware to authenticate logistics agents via their own JWT
function authenticateAgent(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'logistics_agent') return res.status(403).json({ error: 'Not a logistics agent token' });
    req.agentId = decoded.agentId;
    req.companyId = decoded.companyId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authenticateCompany(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.type !== 'logistics_company') return res.status(403).json({ error: 'Not a logistics company token' });
    req.companyId = decoded.companyId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Public: Registration & Auth ──
router.post('/companies/register', logistics.registerCompany);
router.post('/companies/login', logistics.loginCompany);
router.post('/agents/register', logistics.registerAgent);
router.post('/agents/login', logistics.loginAgent);

// ── Public: Tracking ──
router.get('/track/:trackingOrId', logistics.trackDelivery);

// ── Public: List approved logistics partners (for marketplace Logistics Partners page) ──
router.get('/providers', logistics.listAvailableProviders);

// ── Seller / Tenant endpoints (needs ERP auth) ──
router.get('/tenant/deliveries', authenticate, requireTenantUser, logistics.listTenantDeliveries);
router.post('/deliveries/request', authenticate, requireTenantUser, auditAction('CREATE_DELIVERY_REQUEST', 'Delivery'), logistics.requestDelivery);

// ── Agent portal (needs agent auth) ──
router.get('/agent/profile', authenticateAgent, logistics.getAgentProfile);
router.patch('/agent/profile', authenticateAgent, auditAction('UPDATE_AGENT_PROFILE', 'LogisticsAgent'), logistics.updateAgentProfile);
router.get('/agent/dashboard', authenticateAgent, logistics.getAgentDashboard);
router.get('/agent/deliveries', authenticateAgent, logistics.getAgentDeliveries);
router.post(
  '/agent/deliveries/:id/proof',
  authenticateAgent,
  logistics.verifyAgentOwnsDelivery,
  (req, res, next) => {
    singlePodUpload(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
      next();
    });
  },
  auditAction('UPLOAD_POD', 'Delivery'),
  logistics.uploadProofOfDelivery,
);
router.patch('/agent/deliveries/:id/status', authenticateAgent, auditAction('UPDATE_DELIVERY_STATUS', 'Delivery'), logistics.updateDeliveryStatus);

// ── Company portal (fleet overview — company JWT) ──
router.get('/company/dashboard', authenticateCompany, logistics.getCompanyDashboard);
router.get('/company/deliveries', authenticateCompany, logistics.getCompanyDeliveries);
router.post('/company/deliveries', authenticateCompany, auditAction('CREATE_DELIVERY', 'Delivery'), logistics.createCompanyDelivery);
router.post('/company/returns', authenticateCompany, auditAction('CREATE_RETURN', 'Delivery'), logistics.createCompanyReturn);
router.get('/company/billing', authenticateCompany, logistics.getCompanyBilling);
router.get('/company/support/tickets', authenticateCompany, logistics.listCompanySupportTickets);
router.post('/company/support/tickets', authenticateCompany, auditAction('CREATE_SUPPORT_TICKET', 'LogisticsSupportTicket'), logistics.createCompanySupportTicket);
router.get('/company/agents', authenticateCompany, logistics.getCompanyAgents);

router.get('/agent/support/tickets', authenticateAgent, logistics.listAgentSupportTickets);
router.post('/agent/support/tickets', authenticateAgent, auditAction('CREATE_SUPPORT_TICKET', 'LogisticsSupportTicket'), logistics.createAgentSupportTicket);

module.exports = router;
