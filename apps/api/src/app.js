const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { logger } = require('./utils/logger');
const { UPLOAD_BASE } = require('./middleware/upload.middleware');

const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const userRoutes = require('./routes/user.routes');
const auditRoutes = require('./routes/audit.routes');
const accountRoutes = require('./routes/account.routes');
const customerRoutes = require('./routes/customer.routes');
const supplierRoutes = require('./routes/supplier.routes');
const productRoutes = require('./routes/product.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const quoteRoutes = require('./routes/quote.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const payrollRoutes = require('./routes/payroll.routes');
const employeeRoutes = require('./routes/employee.routes');
const taxRoutes = require('./routes/tax.routes');
const nrsRoutes = require('./routes/nrs.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const marketplaceSellerRoutes = require('./routes/marketplaceSeller.routes');
const adminRoutes = require('./routes/admin.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const currencyRoutes = require('./routes/currency.routes');
const supportRoutes = require('./routes/support.routes');
const posRoutes = require('./routes/pos.routes');
const departmentRoutes = require('./routes/department.routes');
const announcementRoutes = require('./routes/announcement.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const leaveRequestRoutes = require('./routes/leaveRequest.routes');
const resignationRoutes = require('./routes/resignation.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const staffPortalRoutes = require('./routes/staffPortal.routes');
const logisticsRoutes = require('./routes/logistics.routes');
const agentRoutes = require('./routes/agent.routes');
const crmRoutes = require('./routes/crm.routes');
const employeePortalRoutes = require('./routes/employeePortal.routes');
const paystackWebhookRoutes = require('./routes/paystackWebhook.routes');
const publicRoutes = require('./routes/public.routes');
const mailboxRoutes = require('./routes/mailbox.routes');
const knowledgeBaseRoutes = require('./routes/knowledgeBase.routes');
const pricingRoutes = require('./routes/pricing.routes');
const apRoutes = require('./routes/ap.routes');
const arRoutes = require('./routes/ar.routes');
const budgetsRoutes = require('./routes/budgets.routes');
const fixedAssetsRoutes = require('./routes/fixedAssets.routes');

const { authenticate, requireRole, requireTenantUser } = require('./middleware/auth.middleware');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
// CORS: allow web frontends and Android app (Capacitor sends Origin: null or API host)
const corsOrigins = [
  process.env.ERP_URL || 'http://localhost:5173',
  process.env.MARKETPLACE_URL || process.env.MARKET_URL || 'http://localhost:5174',
  process.env.ADMIN_URL || 'http://localhost:5175',
].filter(Boolean);
if (process.env.API_PUBLIC_URL) corsOrigins.push(process.env.API_PUBLIC_URL);
app.use(cors({
  origin: (orig, cb) => {
    if (!orig) return cb(null, true); // Android/native app often sends no Origin
    if (corsOrigins.some(o => orig === o || orig.startsWith(o))) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
// Paystack webhooks need raw body for HMAC (must be before express.json)
app.use(
  '/api/webhooks/paystack',
  express.raw({
    type: (req) => /^application\/json(;|$)/i.test(String(req.headers['content-type'] || '')),
  }),
  paystackWebhookRoutes,
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const visitCollectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many visit events.' },
});
app.use('/api/public', visitCollectLimiter, publicRoutes);

app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => {
    const url = String(req.originalUrl || req.url || '');
    if (url.includes('/webhooks/paystack')) return true;
    if (url.startsWith('/api/public')) return true;
    return false;
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cosmos ERP API', timestamp: new Date().toISOString() });
});
/** Same payload as /health — reachable via Vite proxy `/api` (ERP/marketplace dev). */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Cosmos ERP API', timestamp: new Date().toISOString() });
});

const uploadsPath = path.isAbsolute(UPLOAD_BASE) ? UPLOAD_BASE : path.join(process.cwd(), UPLOAD_BASE);
app.use('/uploads', express.static(uploadsPath));

app.use('/api/auth', authRoutes);
app.use('/api/employee-portal', employeePortalRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/nrs', nrsRoutes);
app.use('/api/seller/marketplace', marketplaceSellerRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/resignations', resignationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/staff-portal', staffPortalRoutes);
app.use('/api/mailbox', mailboxRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/ap', apRoutes);
app.use('/api/ar', arRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/fixed-assets', fixedAssetsRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/agents', authenticate, requireTenantUser, requireRole('FIELD_AGENT'), agentRoutes);
app.use('/api/crm', authenticate, requireTenantUser, requireRole('CRM_MANAGER'), crmRoutes);

app.use((err, req, res, next) => {
  logger.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
