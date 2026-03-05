import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, TrendingUp, Users, AlertTriangle, Clock, CheckCircle,
  Search, Loader2, Crown, Zap, Rocket, RefreshCw, Ban, PlayCircle,
  CalendarPlus, ArrowUpDown, XCircle,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

const PLAN_CFG = {
  STARTER:    { label: 'Starter',    color: '#6366F1', bg: '#EEF2FF', icon: Zap,    border: '#C7D2FE' },
  GROWTH:     { label: 'Growth',     color: '#0052CC', bg: '#EBF2FF', icon: Rocket, border: '#A4CDFF' },
  ENTERPRISE: { label: 'Enterprise', color: '#7C3AED', bg: '#F5F3FF', icon: Crown,  border: '#DDD6FE' },
};

const STATUS_CFG = {
  TRIAL:     { label: 'Trial',     color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
  ACTIVE:    { label: 'Active',    color: '#00875A', bg: '#E3FCEF', border: '#ABF5D1' },
  PAST_DUE:  { label: 'Past Due',  color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
  CANCELLED: { label: 'Cancelled', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
  SUSPENDED: { label: 'Suspended', color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
};

function fmt(v) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

export default function SubscriptionsPage() {
  const [tab, setTab] = useState('overview');
  const [actionModal, setActionModal] = useState(null);
  const [trialDays, setTrialDays] = useState(14);
  const [suspendReason, setSuspendReason] = useState('');
  const qc = useQueryClient();

  const invalidateAll = () => { qc.invalidateQueries(['admin-sub-stats']); qc.invalidateQueries(['admin-subscriptions']); };

  const { data: stats } = useQuery({
    queryKey: ['admin-sub-stats'],
    queryFn: () => api.get('/admin/subscriptions/stats').then(r => r.data.data).catch(() => ({})),
    refetchInterval: 30000,
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => api.get('/admin/subscriptions', { params: { limit: 50 } }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'subscriptions',
  });

  const updateMutation = useMutation({
    mutationFn: ({ tenantId, ...body }) => api.patch(`/admin/tenants/${tenantId}/subscription`, body),
    onSuccess: () => { invalidateAll(); setActionModal(null); },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ tenantId, reason }) => api.post(`/admin/tenants/${tenantId}/suspend`, { reason }),
    onSuccess: () => { invalidateAll(); setActionModal(null); setSuspendReason(''); },
  });

  const activateMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/admin/tenants/${tenantId}/activate`),
    onSuccess: invalidateAll,
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({ tenantId, days }) => api.post(`/admin/tenants/${tenantId}/extend-trial`, { days }),
    onSuccess: () => { invalidateAll(); setActionModal(null); setTrialDays(14); },
  });

  const s = stats || {};
  const planData = (s.planBreakdown || []);
  const statusData = (s.statusBreakdown || []);
  const totalTenants = planData.reduce((a, b) => a + b._count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Subscriptions & Billing</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage tenant plans, billing cycles, and subscription revenue</p>
        </div>
        <button onClick={invalidateAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(s.totalRevenue), sub: `${s.totalPayments || 0} payments`, icon: TrendingUp, color: '#00875A' },
          { label: 'Monthly Revenue', value: fmt(s.monthlyRevenue), sub: `${s.monthlyPayments || 0} this month`, icon: CreditCard, color: '#0052CC' },
          { label: 'Total Tenants', value: totalTenants, sub: 'Across all plans', icon: Users, color: '#6366F1' },
          { label: 'Expiring Trials', value: (s.expiringTrials || []).length, sub: 'Within 7 days', icon: AlertTriangle, color: '#FF8B00' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[24px] font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'subscriptions', label: 'Manage Subscriptions' },
          { id: 'trials', label: 'Expiring Trials' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all', tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Plan Distribution</h3>
            <div className="space-y-3">
              {planData.map((p) => {
                const cfg = PLAN_CFG[p.subscriptionPlan] || PLAN_CFG.STARTER;
                const pct = totalTenants ? Math.round((p._count / totalTenants) * 100) : 0;
                return (
                  <div key={p.subscriptionPlan} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                      <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="font-bold text-slate-700">{cfg.label}</span>
                        <span className="font-bold" style={{ color: cfg.color }}>{p._count} tenants ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Subscription Status</h3>
            <div className="space-y-2">
              {statusData.map((item) => {
                const cfg = STATUS_CFG[item.subscriptionStatus] || STATUS_CFG.TRIAL;
                return (
                  <div key={item.subscriptionStatus} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <span className="text-[13px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-[16px] font-black" style={{ color: cfg.color }}>{item._count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Recent Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Tenant', 'Plan', 'Amount', 'Status', 'Date', 'Reference'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(s.recentPayments || []).map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-[13px] font-semibold text-slate-800">{p.subscription?.tenant?.businessName || '—'}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">{p.subscription?.plan || '—'}</span></td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-900 tabular-nums">{fmt(p.amount)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', p.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>{p.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-500">{fmtDate(p.paidAt || p.createdAt)}</td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-slate-400">{p.reference?.slice(0, 16) || '—'}</td>
                    </tr>
                  ))}
                  {(s.recentPayments || []).length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-[13px]">No payments yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscriptions Tab */}
      {tab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Tenant', 'Plan', 'Status', 'Amount', 'Next Billing', 'Change Plan', 'Change Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subsLoading && [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 animate-pulse">
                    {[...Array(8)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                  </tr>
                ))}
                {(subsData?.data || []).map((sub) => {
                  const planCfg = PLAN_CFG[sub.plan] || PLAN_CFG.STARTER;
                  const statusCfg = STATUS_CFG[sub.status] || STATUS_CFG.TRIAL;
                  const tenantId = sub.tenantId;
                  return (
                    <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <div className="text-[13px] font-semibold text-slate-800">{sub.tenant?.businessName}</div>
                        <div className="text-[11px] text-slate-400">{sub.tenant?.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: planCfg.bg, color: planCfg.color }}>{planCfg.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-bold text-slate-900 tabular-nums">{fmt(sub.amount)}</td>
                      <td className="px-3 py-3 text-[12px] text-slate-500">{fmtDate(sub.nextBillingDate)}</td>
                      {/* Change Plan */}
                      <td className="px-3 py-3">
                        <select className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 text-slate-600 cursor-pointer" defaultValue=""
                          onChange={(e) => { if (e.target.value) { updateMutation.mutate({ tenantId, plan: e.target.value }); e.target.value = ''; } }}>
                          <option value="">Select…</option>
                          {Object.entries(PLAN_CFG).filter(([k]) => k !== sub.plan).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      {/* Change Status */}
                      <td className="px-3 py-3">
                        <select className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 text-slate-600 cursor-pointer" defaultValue=""
                          onChange={(e) => { if (e.target.value) { updateMutation.mutate({ tenantId, status: e.target.value }); e.target.value = ''; } }}>
                          <option value="">Select…</option>
                          {Object.entries(STATUS_CFG).filter(([k]) => k !== sub.status).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      {/* Quick actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {sub.status !== 'SUSPENDED' ? (
                            <button onClick={() => { setActionModal({ type: 'suspend', tenantId, name: sub.tenant?.businessName }); }}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Suspend tenant">
                              <Ban className="w-3 h-3" />
                            </button>
                          ) : (
                            <button onClick={() => activateMutation.mutate(tenantId)}
                              disabled={activateMutation.isPending}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Activate tenant">
                              <PlayCircle className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => { setActionModal({ type: 'extend', tenantId, name: sub.tenant?.businessName }); }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Extend trial">
                            <CalendarPlus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Trials Tab */}
      {tab === 'trials' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Trials Expiring Within 7 Days
          </h3>
          {(s.expiringTrials || []).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-[14px] text-slate-400 font-medium">No expiring trials</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(s.expiringTrials || []).map((t) => {
                const daysLeft = Math.max(0, Math.ceil((new Date(t.trialEndsAt) - Date.now()) / 86400000));
                return (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{t.businessName || t.tradingName}</p>
                      <p className="text-[11px] text-slate-500">{PLAN_CFG[t.subscriptionPlan]?.label || t.subscriptionPlan} plan · Expires {fmtDate(t.trialEndsAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-black text-amber-600">{daysLeft}d left</span>
                      <button onClick={() => setActionModal({ type: 'extend', tenantId: t.id, name: t.businessName || t.tradingName })}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                        <CalendarPlus className="w-3 h-3" /> Extend
                      </button>
                      <button onClick={() => activateMutation.mutate(t.id)}
                        disabled={activateMutation.isPending}
                        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                        <PlayCircle className="w-3 h-3" /> Activate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Modal: Suspend */}
      {actionModal?.type === 'suspend' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Ban className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Suspend Tenant</h3>
                <p className="text-[12px] text-slate-500">{actionModal.name}</p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600">This will immediately suspend the tenant's access to the platform. All users under this tenant will be locked out.</p>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension (required)…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-20" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => suspendMutation.mutate({ tenantId: actionModal.tenantId, reason: suspendReason })}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Suspend Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal: Extend Trial */}
      {actionModal?.type === 'extend' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><CalendarPlus className="w-5 h-5 text-amber-600" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Extend Trial</h3>
                <p className="text-[12px] text-slate-500">{actionModal.name}</p>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Extension Period (days)</label>
              <div className="flex gap-2">
                {[7, 14, 30, 60].map(d => (
                  <button key={d} onClick={() => setTrialDays(d)}
                    className={cn('px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all', trialDays === d ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                    {d} days
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionModal(null)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => extendTrialMutation.mutate({ tenantId: actionModal.tenantId, days: trialDays })}
                disabled={extendTrialMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {extendTrialMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                Extend by {trialDays} Days
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
