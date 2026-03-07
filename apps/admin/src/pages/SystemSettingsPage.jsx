import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Save, Loader2, CheckCircle, Globe, Percent,
  Building2, Users, Package, Shield, Database, Server,
  RefreshCw, ToggleLeft, ToggleRight, AlertTriangle,
  Mail, Wrench, Flag, Zap, Lock,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function SystemSettingsPage() {
  const [tab, setTab] = useState('general');
  const [name, setName] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [currency, setCurrency] = useState('');
  const [success, setSuccess] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Feature flags state
  const [featureFlags, setFeatureFlags] = useState({
    marketplace: true, nrsIntegration: true, whatsappNotifications: true,
    posModule: true, payrollModule: true, multiWarehouse: true,
    newUserRegistration: true, tenantSelfSignup: true,
  });
  const [flagsInitialized, setFlagsInitialized] = useState(false);

  // Maintenance mode state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data.data).catch(() => ({})),
  });

  // Initialize form values when settings load
  if (settings && !initialized) {
    setName(settings.name || '');
    setCommissionRate(settings.commissionRate != null ? String(parseFloat(settings.commissionRate) * 100) : '5');
    setVatRate(settings.vatRate != null ? String(parseFloat(settings.vatRate) * 100) : '7.5');
    setCurrency(settings.currency || 'NGN');
    setInitialized(true);
  }
  if (settings?.featureFlags && !flagsInitialized) {
    setFeatureFlags(prev => ({ ...prev, ...settings.featureFlags }));
    setMaintenanceMode(!!settings.maintenanceMode);
    setMaintenanceMessage(settings.maintenanceMessage || '');
    setFlagsInitialized(true);
  }

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/admin/settings', data),
    onSuccess: () => { qc.invalidateQueries(['admin-platform-settings']); showSuccess('Platform settings saved!'); },
  });

  const featureFlagMutation = useMutation({
    mutationFn: (flags) => api.patch('/admin/settings/feature-flags', { featureFlags: flags }),
    onSuccess: () => { qc.invalidateQueries(['admin-platform-settings']); showSuccess('Feature flags updated!'); },
  });

  const maintenanceMutation = useMutation({
    mutationFn: (data) => api.patch('/admin/settings/maintenance', data),
    onSuccess: () => { qc.invalidateQueries(['admin-platform-settings']); showSuccess('Maintenance mode updated!'); },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name, commissionRate: parseFloat(commissionRate) / 100,
      vatRate: parseFloat(vatRate) / 100, currency,
    });
  };

  const toggleFlag = (key) => {
    const updated = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlags(updated);
    featureFlagMutation.mutate(updated);
  };

  const toggleMaintenance = () => {
    const newMode = !maintenanceMode;
    setMaintenanceMode(newMode);
    maintenanceMutation.mutate({ maintenanceMode: newMode, maintenanceMessage });
  };

  const s = settings || {};
  const stats = s.stats || {};

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const FEATURE_FLAG_DEFS = [
    { key: 'marketplace', label: 'Marketplace', desc: 'Enable marketplace and seller features', icon: Package },
    { key: 'nrsIntegration', label: 'NRS E-Invoicing', desc: 'Nigeria Revenue Service integration', icon: Shield },
    { key: 'whatsappNotifications', label: 'WhatsApp Notifications', desc: 'WhatsApp Business API messaging', icon: Mail },
    { key: 'posModule', label: 'POS Module', desc: 'Point-of-sale for tenants', icon: Zap },
    { key: 'payrollModule', label: 'Payroll Module', desc: 'HR & payroll processing', icon: Users },
    { key: 'multiWarehouse', label: 'Multi-Warehouse', desc: 'Multiple warehouse support', icon: Building2 },
    { key: 'newUserRegistration', label: 'New User Registration', desc: 'Allow new user signups', icon: Users },
    { key: 'tenantSelfSignup', label: 'Tenant Self-Signup', desc: 'Tenants can register without admin', icon: Globe },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Platform configuration, feature flags, maintenance mode, and system overview</p>
      </div>

      {/* System health banner */}
      <div className={cn('rounded-2xl p-6 text-white', maintenanceMode ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600')}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-black">{s.name || 'Cosmos ERP'}</h2>
            <p className="text-white/60 text-[13px] mt-0.5">Super Admin Platform by Roland Consult</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm">
            {maintenanceMode ? (
              <><Wrench className="w-3.5 h-3.5 text-white animate-pulse" /><span className="text-[12px] font-bold">Maintenance Mode Active</span></>
            ) : (
              <><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[12px] font-bold">All Systems Operational</span></>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'Tenants', value: stats.tenantCount || 0, icon: Building2 },
            { label: 'Users', value: stats.userCount || 0, icon: Users },
            { label: 'Products', value: stats.productCount || 0, icon: Package },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-white/70" />
                <span className="text-[11px] font-bold text-white/60 uppercase">{label}</span>
              </div>
              <p className="text-[24px] font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'general', label: 'General Config' },
          { id: 'features', label: 'Feature Flags' },
          { id: 'maintenance', label: 'Maintenance' },
          { id: 'system', label: 'System Info' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* General Config Tab */}
      {tab === 'general' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-500" />
            <h3 className="text-[14px] font-bold text-slate-800">Platform Configuration</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Platform Name</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Marketplace Commission (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="number" step="0.1" min="0" max="100" value={commissionRate}
                    onChange={e => setCommissionRate(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Applied to marketplace transactions</p>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">VAT Rate (%)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="number" step="0.1" min="0" max="100" value={vatRate}
                    onChange={e => setVatRate(e.target.value)}
                    className="w-full py-3 pl-10 pr-4 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Nigerian VAT (standard: 7.5%)</p>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Base Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border border-slate-200 text-[14px] font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Default platform currency</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400">
                Last updated: {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </p>
              <button onClick={handleSave} disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Flags Tab */}
      {tab === 'features' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[14px] font-bold text-slate-800">Feature Flags</h3>
            </div>
            <p className="text-[11px] text-slate-400">Toggle features on/off across the platform instantly</p>
          </div>
          <div className="divide-y divide-slate-100">
            {FEATURE_FLAG_DEFS.map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', featureFlags[key] ? 'bg-indigo-50' : 'bg-slate-100')}>
                    <Icon className="w-4 h-4" style={{ color: featureFlags[key] ? '#6366F1' : '#94A3B8' }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                </div>
                <button onClick={() => toggleFlag(key)}
                  disabled={featureFlagMutation.isPending}
                  className="flex-shrink-0">
                  {featureFlags[key] ? (
                    <ToggleRight className="w-10 h-10 text-indigo-600" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-slate-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {tab === 'maintenance' && (
        <div className="space-y-4">
          <div className={cn('rounded-2xl border p-6', maintenanceMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200')} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', maintenanceMode ? 'bg-amber-100' : 'bg-slate-100')}>
                  <Wrench className={cn('w-5 h-5', maintenanceMode ? 'text-amber-600' : 'text-slate-400')} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Maintenance Mode</h3>
                  <p className="text-[12px] text-slate-500">When enabled, all tenant-facing apps show maintenance page</p>
                </div>
              </div>
              <button onClick={toggleMaintenance} disabled={maintenanceMutation.isPending}>
                {maintenanceMode ? (
                  <ToggleRight className="w-12 h-12 text-amber-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-slate-300" />
                )}
              </button>
            </div>

            {maintenanceMode && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-[13px] font-semibold mb-4">
                <AlertTriangle className="w-4 h-4" /> Platform is currently in maintenance mode. Users cannot access the system.
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Maintenance Message</label>
              <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)}
                placeholder="We're performing scheduled maintenance. Please check back later…"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-24" />
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => maintenanceMutation.mutate({ maintenanceMode, maintenanceMessage })}
                disabled={maintenanceMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {maintenanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Maintenance Settings
              </button>
            </div>
          </div>

          {/* Security settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[14px] font-bold text-slate-800">Security & Access</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Force HTTPS', value: true, desc: 'All connections must use HTTPS' },
                { label: 'Two-Factor Auth (Admin)', value: true, desc: 'Require 2FA for admin logins' },
                { label: 'Session Timeout', value: '30 min', desc: 'Auto-logout after inactivity' },
                { label: 'IP Whitelist', value: 'Disabled', desc: 'Restrict admin access by IP' },
              ].map(({ label, value, desc }) => (
                <div key={label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                  </div>
                  {typeof value === 'boolean' ? (
                    value ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />
                  ) : (
                    <span className="text-[13px] font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Info Tab */}
      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[14px] font-bold text-slate-800">Database</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Provider', value: 'PostgreSQL' },
                { label: 'ORM', value: 'Prisma Client' },
                { label: 'Multi-Tenancy', value: 'Row-Level Isolation' },
                { label: 'Data Residency', value: 'Nigeria / South Africa' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[13px]">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[14px] font-bold text-slate-800">Integrations</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'NRS E-Invoicing', value: 'Connected', active: true },
                { label: 'Cosmos Escrow', value: 'Active', active: true },
                { label: 'NIBSS Payments', value: 'Configured', active: true },
                { label: 'WhatsApp Business', value: 'Available', active: true },
              ].map(({ label, value, active }) => (
                <div key={label} className="flex justify-between items-center text-[13px]">
                  <span className="text-slate-500">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className={cn('font-semibold', active ? 'text-emerald-600' : 'text-slate-400')}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 md:col-span-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[14px] font-bold text-slate-800">Application Stack</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Runtime', value: 'Node.js' },
                { label: 'Framework', value: 'Express.js' },
                { label: 'Frontend', value: 'React + Vite' },
                { label: 'Styling', value: 'TailwindCSS' },
                { label: 'Auth', value: 'JWT + bcrypt' },
                { label: 'Cache', value: 'In-Memory' },
                { label: 'File Storage', value: 'Local / S3' },
                { label: 'Compliance', value: 'NRS / FIRS' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
                  <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
