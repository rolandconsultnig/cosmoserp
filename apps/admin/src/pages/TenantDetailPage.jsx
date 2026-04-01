import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Shield, Users, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, Loader2, FileText,
  Eye, Ban, MessageSquare, X, Calendar, Globe, Phone,
  Mail, CreditCard, History, AlertTriangle, LogIn,
} from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { formatDate, formatCurrency, getStatusColor, getPlanColor, cn } from '../lib/utils';
import { ACCOUNTING_SUBFEATURES } from '../../../shared/accountingSubfeatures';
import { AccountingSubFeatureCatalog } from '../../../shared/accountingSubfeatureComponents';
import { FINANCE_FEATURE_CATALOG } from '../../../shared/financeFeatureCatalog';

function tenantLogoSrc(logoUrl) {
  if (!logoUrl) return null;
  if (String(logoUrl).startsWith('http')) return logoUrl;
  return logoUrl;
}

function buildErpImpersonateUrl(accessToken) {
  const raw = import.meta.env.VITE_ERP_URL || 'http://localhost:3060';
  const trimmed = String(raw).replace(/\/$/, '');
  const base = trimmed.endsWith('/erp') ? trimmed : `${trimmed}/erp`;
  return `${base}/impersonate#token=${encodeURIComponent(accessToken)}`;
}

const KYC_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const DEFAULT_TENANT_MODULES = {
  sales: true,
  inventory: true,
  operations: true,
  hrPayroll: true,
  finance: true,
  customerCare: true,
  pos: true,
};

const TENANT_MODULE_DEFS = [
  { key: 'sales', label: 'Sales' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'operations', label: 'Operations' },
  { key: 'hrPayroll', label: 'HR & Payroll' },
  { key: 'finance', label: 'Finance' },
  { key: 'customerCare', label: 'Customer Care' },
  { key: 'pos', label: 'POS Terminal' },
];

function normalizeTenantModules(enabledModules) {
  const normalized = { ...DEFAULT_TENANT_MODULES };
  if (!enabledModules || typeof enabledModules !== 'object' || Array.isArray(enabledModules)) {
    return normalized;
  }
  TENANT_MODULE_DEFS.forEach(({ key }) => {
    if (Object.prototype.hasOwnProperty.call(enabledModules, key)) {
      normalized[key] = enabledModules[key] !== false;
    }
  });
  return normalized;
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </dt>
      <dd className="text-[13px] font-semibold text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function TenantDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const admin = useAuthStore((s) => s.admin);
  const [tab, setTab] = useState('info');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [impersonateModal, setImpersonateModal] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState('');
  const [impersonateUserId, setImpersonateUserId] = useState('');
  const [moduleDraft, setModuleDraft] = useState(DEFAULT_TENANT_MODULES);

  const invalidateAll = () => {
    qc.invalidateQueries(['admin-tenant', id]);
    qc.invalidateQueries(['admin-tenant-audit', id]);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => api.get(`/admin/tenants/${id}`).then((r) => r.data.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['admin-tenant-audit', id],
    queryFn: () => api.get(`/admin/tenants/${id}/audit-logs`, { params: { limit: 20 } }).then(r => r.data.data || []).catch(() => []),
    enabled: tab === 'audit',
  });

  const kycMutation = useMutation({
    mutationFn: ({ status, reason }) => api.patch(`/admin/tenants/${id}/kyc`, { status, reason }),
    onSuccess: () => { invalidateAll(); setRejectModal(false); setRejectReason(''); },
  });

  const suspendMutation = useMutation({
    mutationFn: (action) => api.post(`/admin/tenants/${id}/${action}`),
    onSuccess: invalidateAll,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => api.post(`/admin/tenants/${id}/toggle-active`),
    onSuccess: invalidateAll,
  });

  const noteMutation = useMutation({
    mutationFn: (note) => api.post(`/admin/tenants/${id}/notes`, { note }),
    onSuccess: () => { invalidateAll(); setNoteModal(false); setNoteText(''); },
  });

  const toggleUserMutation = useMutation({
    mutationFn: (userId) => api.post(`/admin/tenants/${id}/users/${userId}/toggle`),
    onSuccess: invalidateAll,
  });

  const modulesMutation = useMutation({
    mutationFn: (enabledModules) => api.patch(`/admin/tenants/${id}/modules`, { enabledModules }),
    onSuccess: invalidateAll,
  });

  const logoMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/admin/tenants/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => invalidateAll(),
  });

  const clearLogoMutation = useMutation({
    mutationFn: () => api.delete(`/admin/tenants/${id}/logo`),
    onSuccess: () => invalidateAll(),
  });

  const impersonateMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      const body = {};
      if (reason?.trim()) body.reason = reason.trim();
      if (userId) body.userId = userId;
      const { data } = await api.post(`/admin/tenants/${id}/impersonate`, body);
      return data.data;
    },
    onSuccess: (payload) => {
      window.open(buildErpImpersonateUrl(payload.accessToken), '_blank', 'noopener,noreferrer');
      setImpersonateModal(false);
      setImpersonateReason('');
    },
  });

  const openImpersonateModal = (tenantUsers) => {
    const users = tenantUsers || [];
    const owner = users.find((u) => u.role === 'OWNER' && u.isActive);
    const first = users.find((u) => u.isActive);
    setImpersonateUserId((owner || first)?.id || '');
    setImpersonateReason('');
    setImpersonateModal(true);
  };

  useEffect(() => {
    if (!data?.id) return;
    setModuleDraft(normalizeTenantModules(data.enabledModules));
  }, [data?.id, data?.enabledModules]);

  const toggleTenantModule = (key) => {
    if (modulesMutation.isPending) return;
    const updated = {
      ...moduleDraft,
      [key]: !moduleDraft[key],
    };
    setModuleDraft(updated);
    modulesMutation.mutate(updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-7 bg-slate-200 rounded-xl w-64" />
        <div className="h-[200px] bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-5">
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const t = data;
  if (!t) {
    return (
      <div className="text-center py-24">
        <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-400 font-medium">Tenant not found</p>
        <Link to="/tenants" className="mt-4 inline-flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Tenants
        </Link>
      </div>
    );
  }

  const isSuspended = t.subscriptionStatus === 'SUSPENDED';
  const counts = t._count || {};

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link to="/tenants"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {t.logoUrl && (
              <img
                src={tenantLogoSrc(t.logoUrl)}
                alt=""
                className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200"
              />
            )}
            <h1 className="text-[22px] font-black text-slate-900 tracking-tight truncate">{t.tradingName || t.businessName}</h1>
            {!t.isActive && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-md">DISABLED</span>}
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5">{t.email}{t.phone && ` · ${t.phone}`}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border', KYC_COLORS[t.kycStatus] || 'bg-slate-100')}>
            {t.kycStatus?.replace('_', ' ')}
          </span>
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border', getStatusColor(t.subscriptionStatus))}>
            {t.subscriptionStatus}
          </span>
          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border', getPlanColor(t.subscriptionPlan))}>
            {t.subscriptionPlan}
          </span>
        </div>
      </div>

      {/* Rejection notice */}
      {t.kycRejectionReason && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3 bg-red-50 border border-red-200">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-red-800">KYC Rejection Reason</p>
            <p className="text-[13px] text-red-700 mt-0.5">{t.kycRejectionReason}</p>
          </div>
        </div>
      )}

      {/* Suspended warning */}
      {isSuspended && (
        <div className="rounded-2xl px-5 py-4 flex items-start gap-3 bg-orange-50 border border-orange-200">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-bold text-orange-800">Account Suspended</p>
            <p className="text-[13px] text-orange-700 mt-0.5">This tenant's subscription is suspended. They cannot access the platform.</p>
          </div>
          <button onClick={() => suspendMutation.mutate('activate')} disabled={suspendMutation.isPending}
            className="text-[12px] font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            Reactivate
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'info', label: 'Business Info' },
          { id: 'users', label: `Users (${(t.users || []).length})` },
          { id: 'audit', label: 'Audit Trail' },
        ].map(({ id: tabId, label }) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === tabId ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Business Info Tab */}
          {tab === 'info' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-[15px] font-bold text-slate-900">Business Information</h2>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoRow label="Business Name" value={t.businessName} icon={Building2} />
                  <InfoRow label="Trading Name" value={t.tradingName} icon={Building2} />
                  <InfoRow label="TIN" value={t.tin || 'Not provided'} icon={FileText} />
                  <InfoRow label="RC Number" value={t.rcNumber || 'Not provided'} icon={FileText} />
                  <InfoRow label="Business Type" value={t.businessType} />
                  <InfoRow label="Industry" value={t.industry} />
                  <InfoRow label="Address" value={t.address} icon={Globe} />
                  <InfoRow label="City / State" value={[t.city, t.state].filter(Boolean).join(', ')} />
                  <InfoRow label="Phone" value={t.phone} icon={Phone} />
                  <InfoRow label="Email" value={t.email} icon={Mail} />
                  <InfoRow label="Country" value={t.country} icon={Globe} />
                  <InfoRow label="Registered" value={formatDate(t.createdAt)} icon={Calendar} />
                </dl>
              </div>

              {/* Bank Info */}
              {(t.bankName || t.bankAccountNumber) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-[14px] font-bold text-slate-800">Bank Details</h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow label="Bank Name" value={t.bankName} />
                    <InfoRow label="Account Number" value={t.bankAccountNumber} />
                    <InfoRow label="Account Name" value={t.bankAccountName} />
                    <InfoRow label="Sort Code" value={t.bankSortCode} />
                  </dl>
                </div>
              )}

              {/* KYC Documents */}
              {t.kycDocuments && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-[14px] font-bold text-slate-800">KYC Documents</h2>
                  </div>
                  <div className="text-[13px] text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <pre className="whitespace-pre-wrap font-mono text-[12px]">{typeof t.kycDocuments === 'string' ? t.kycDocuments : JSON.stringify(t.kycDocuments, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Subscription History */}
              {(t.subscriptions || []).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-[14px] font-bold text-slate-800">Subscription History</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {t.subscriptions.map((sub, i) => (
                      <div key={sub.id || i} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <span className="text-[13px] font-semibold text-slate-800">{sub.plan || sub.subscriptionPlan}</span>
                          <span className="text-[12px] text-slate-400 ml-2">{formatDate(sub.createdAt)}</span>
                        </div>
                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border', getStatusColor(sub.status || sub.subscriptionStatus))}>
                          {sub.status || sub.subscriptionStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <Users className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[14px] font-bold text-slate-900">
                  Tenant Users <span className="text-slate-400 font-normal">({(t.users || []).length})</span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(t.users || []).length === 0 && (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No users on this account</td></tr>
                    )}
                    {(t.users || []).map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                              style={{ background: u.isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
                              {u.firstName?.[0]}{u.lastName?.[0]}
                            </div>
                            <span className="font-semibold text-slate-900 text-[13px]">{u.firstName} {u.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-slate-500">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border',
                            u.role === 'OWNER' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-400">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border',
                            u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => toggleUserMutation.mutate(u.id)}
                            disabled={toggleUserMutation.isPending}
                            title={u.isActive ? 'Disable user' : 'Enable user'}
                            className={cn('w-7 h-7 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50',
                              u.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200')}>
                            {u.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {tab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                <h2 className="text-[14px] font-bold text-slate-800">Audit Trail</h2>
              </div>
              {(!auditData || auditData.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-[13px]">No audit logs found for this tenant</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {auditData.map((log, i) => (
                    <div key={log.id || i} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800">{log.action?.replace(/_/g, ' ')}</p>
                        {log.newValues && (
                          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                            {typeof log.newValues === 'object' ? JSON.stringify(log.newValues) : log.newValues}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 className="text-[14px] font-bold text-slate-900 mb-2">Tenant branding</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {t.logoUrl ? (
                  <img src={tenantLogoSrc(t.logoUrl)} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
                  {logoMutation.isPending ? 'Uploading…' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={logoMutation.isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) logoMutation.mutate(f);
                    }}
                  />
                </label>
                {t.logoUrl && (
                  <button
                    type="button"
                    onClick={() => clearLogoMutation.mutate()}
                    disabled={clearLogoMutation.isPending}
                    className="ml-2 inline-flex items-center justify-center px-3 py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {clearLogoMutation.isPending ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KYC Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-[14px] font-bold text-slate-900">KYC Actions</h2>
            </div>
            <div className="space-y-2">
              <button onClick={() => kycMutation.mutate({ status: 'UNDER_REVIEW' })}
                disabled={kycMutation.isPending || t.kycStatus === 'UNDER_REVIEW'}
                className="w-full py-2.5 border-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> Mark Under Review
              </button>
              <button onClick={() => kycMutation.mutate({ status: 'APPROVED' })}
                disabled={kycMutation.isPending || t.kycStatus === 'APPROVED'}
                className="w-full py-2.5 text-white rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                {kycMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve KYC
              </button>
              <button onClick={() => { setRejectModal(true); setRejectReason(''); }}
                disabled={kycMutation.isPending || t.kycStatus === 'REJECTED'}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject KYC
              </button>
              {t.kycVerifiedAt && (
                <p className="text-[11px] text-slate-400 text-center mt-1">
                  Verified: {formatDate(t.kycVerifiedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Account Control */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 className="text-[14px] font-bold text-slate-900 mb-3">Account Control</h2>
            <div className="space-y-2">
              {isSuspended ? (
                <button onClick={() => suspendMutation.mutate('activate')} disabled={suspendMutation.isPending}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight className="w-4 h-4" />}
                  Reactivate Subscription
                </button>
              ) : (
                <button onClick={() => suspendMutation.mutate('suspend')} disabled={suspendMutation.isPending}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200">
                  {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Suspend Subscription
                </button>
              )}
              <button onClick={() => toggleActiveMutation.mutate()} disabled={toggleActiveMutation.isPending}
                className={cn('w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2',
                  t.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200')}>
                {toggleActiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                {t.isActive ? 'Disable Account' : 'Enable Account'}
              </button>
              <button onClick={() => { setNoteModal(true); setNoteText(''); }}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200">
                <MessageSquare className="w-4 h-4" /> Add Admin Note
              </button>
            </div>
          </div>

          {admin?.role === 'SUPER_ADMIN' && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 className="text-[14px] font-bold text-slate-900 mb-1">ERP access</h2>
              <p className="text-[11px] text-slate-500 mb-3">Open the tenant ERP in a new tab as a user. Session is short-lived and audited.</p>
              <button
                type="button"
                onClick={() => openImpersonateModal(t.users)}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center justify-center gap-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              >
                <LogIn className="w-4 h-4" /> Impersonate tenant (ERP)
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-slate-900">ERP Modules</h2>
              {modulesMutation.isPending && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-3">Enable or disable tenant access to ERP modules.</p>
            <div className="space-y-1.5">
              {TENANT_MODULE_DEFS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTenantModule(key)}
                  disabled={modulesMutation.isPending}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="text-[12px] font-semibold text-slate-700">{label}</span>
                  {moduleDraft[key] ? (
                    <ToggleRight className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AccountingSubFeatureCatalog catalog={ACCOUNTING_SUBFEATURES} />

          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 className="text-[14px] font-bold text-slate-900 mb-1">Finance Capability Rollout</h2>
            <p className="text-[11px] text-slate-500 mb-3">Standard accounting and finance feature scope applied for tenant and admin modules.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FINANCE_FEATURE_CATALOG.map((group) => (
                <div key={group.title} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1">{group.title}</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(group.items || []).map((item) => (
                      <li key={item} className="text-[11px] text-slate-600">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Stats */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h2 className="text-[14px] font-bold text-slate-900 mb-2">Activity Stats</h2>
            <div className="space-y-0.5">
              {[
                { label: 'Users', value: counts.users, gradient: 'linear-gradient(180deg, #0ea5e9, #0284c7)' },
                { label: 'Invoices', value: counts.invoices, gradient: 'linear-gradient(180deg, #6366f1, #8b5cf6)' },
                { label: 'Products', value: counts.products, gradient: 'linear-gradient(180deg, #10b981, #059669)' },
                { label: 'Customers', value: counts.customers, gradient: 'linear-gradient(180deg, #f59e0b, #d97706)' },
                { label: 'Employees', value: counts.employees, gradient: 'linear-gradient(180deg, #ec4899, #db2777)' },
                { label: 'NRS Submissions', value: counts.nrsLogs, gradient: 'linear-gradient(180deg, #8b5cf6, #7c3aed)' },
                { label: 'POS Sales', value: counts.posSales, gradient: 'linear-gradient(180deg, #14b8a6, #0d9488)' },
                { label: 'Payroll Runs', value: counts.payrollRuns, gradient: 'linear-gradient(180deg, #f97316, #ea580c)' },
                { label: 'Support Tickets', value: counts.supportTickets, gradient: 'linear-gradient(180deg, #64748b, #475569)' },
              ].map(({ label, value, gradient }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 rounded-full flex-shrink-0" style={{ background: gradient }} />
                    <span className="text-[13px] text-slate-600">{label}</span>
                  </div>
                  <span className="text-[15px] font-bold text-slate-900 tabular-nums">{(value || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NRS Info */}
          {t.nrsTaxpayerId && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 className="text-[14px] font-bold text-slate-900 mb-2">NRS Integration</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500">Taxpayer ID</span>
                  <span className="font-mono font-semibold text-slate-800">{t.nrsTaxpayerId}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate-500">Registered</span>
                  <span className="font-semibold text-slate-800">{formatDate(t.nrsRegisteredAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject KYC Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setRejectModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">Reject KYC Verification</h3>
              <button onClick={() => setRejectModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">Provide a reason for rejection. This will be visible to the tenant.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g., TIN does not match business registration, missing CAC certificate…"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-28" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectModal(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => kycMutation.mutate({ status: 'REJECTED', reason: rejectReason })}
                disabled={!rejectReason.trim() || kycMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {kycMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impersonate ERP Modal */}
      {impersonateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setImpersonateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">Impersonate tenant</h3>
              <button type="button" onClick={() => setImpersonateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">
              Opens Cosmos ERP in a new browser tab. Choose the user to act as (defaults to owner). Optional reason is stored in the audit log.
            </p>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">User</label>
            {(t.users || []).filter((u) => u.isActive).length === 0 ? (
              <p className="text-[13px] text-red-600 mb-3">No active users — enable a user first.</p>
            ) : (
              <select
                value={impersonateUserId}
                onChange={(e) => setImpersonateUserId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] mb-3"
              >
                {(t.users || []).filter((u) => u.isActive).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
            )}
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Reason (optional)</label>
            <textarea
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              placeholder="e.g. Support ticket #1234"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-20 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setImpersonateModal(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => impersonateMutation.mutate({ userId: impersonateUserId, reason: impersonateReason })}
                disabled={!impersonateUserId || impersonateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {impersonateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Open ERP
              </button>
            </div>
            {impersonateMutation.isError && (
              <p className="text-[12px] text-red-600 mt-3">{impersonateMutation.error?.response?.data?.error || impersonateMutation.error?.message || 'Request failed'}</p>
            )}
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setNoteModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">Add Admin Note</h3>
              <button onClick={() => setNoteModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">Add an internal note about this tenant. This is only visible to admin users.</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Internal note about this tenant…"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none h-28" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNoteModal(false)} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={() => noteMutation.mutate(noteText)}
                disabled={!noteText.trim() || noteMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {noteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
