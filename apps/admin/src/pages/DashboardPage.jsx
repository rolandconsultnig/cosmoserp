import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, Shield, TrendingUp,
  AlertTriangle, CheckCircle, Clock, XCircle, ArrowUpRight, ArrowRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getPlanColor, cn } from '../lib/utils';

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ title, value, sub, icon: Icon, gradient, trend, trendUp = true }) {
  return (
    <div
      className="bg-white rounded-2xl p-5 relative overflow-hidden card-hover"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.07)' }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.08] blur-2xl pointer-events-none"
        style={{ background: gradient }}
      />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-2">
            {title}
          </p>
          <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">{value}</p>
          {sub && (
            <p className="text-[12px] text-slate-500 mt-2 leading-snug">{sub}</p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: gradient }}
        >
          <Icon className="w-[22px] h-[22px] text-white" strokeWidth={2} />
        </div>
      </div>

      {trend && (
        <div
          className={cn(
            'mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-[12px] font-semibold',
            trendUp ? 'text-emerald-600' : 'text-red-500',
          )}
        >
          <ArrowUpRight className={cn('w-3.5 h-3.5', !trendUp && 'rotate-90')} />
          {trend}
        </div>
      )}
    </div>
  );
}

/* ── Custom tooltip for charts ─────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl text-[12px] font-medium"
      style={{
        background: 'rgba(15,18,40,0.90)',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.dataKey === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── Loading skeleton ─────────────────────────────────── */
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-slate-200 rounded-xl w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[120px] bg-slate-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="h-56 bg-slate-200 rounded-2xl" />
        <div className="h-56 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-72 bg-slate-200 rounded-2xl" />
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────── */
export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data.data),
  });

  if (isLoading) return <Skeleton />;

  const d = data || {};

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Platform Dashboard</h1>
          <p className="page-subtitle">Mixtio ERP · Roland Consult Super Admin</p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 text-[12px] font-semibold px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(99,102,241,0.08)',
            color: '#6366f1',
            border: '1px solid rgba(99,102,241,0.18)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#6366f1', boxShadow: '0 0 6px rgba(99,102,241,0.60)', animation: 'pulse 2s infinite' }}
          />
          Live
        </div>
      </div>

      {/* ── KYC alert ── */}
      {(d.kycPending || 0) > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #fde68a',
            boxShadow: '0 2px 8px rgba(245,158,11,0.10)',
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-900">
              {d.kycPending} tenant{d.kycPending > 1 ? 's' : ''} awaiting KYC review
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Review TIN &amp; CAC documents to activate their accounts
            </p>
          </div>
          <a
            href="/tenants?kyc=pending"
            className="flex items-center gap-1 text-[12px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            Review <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tenants"
          value={(d.tenants?.total || 0).toLocaleString()}
          sub={`${d.tenants?.active || 0} active · ${d.tenants?.trial || 0} on trial`}
          icon={Building2}
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
          trend={`${d.tenants?.active || 0} active now`}
        />
        <StatCard
          title="Platform MRR"
          value={formatCurrency(d.revenue?.mrr || 0)}
          sub={`Monthly recurring revenue`}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          trend={`${d.revenue?.growth || 0}% growth this month`}
        />
        <StatCard
          title="NRS Submissions"
          value={(d.nrs?.approved || 0).toLocaleString()}
          sub={`${d.nrs?.failed || 0} failed · ${d.nrs?.pending || 0} pending`}
          icon={Shield}
          gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
          trend={`${d.nrs?.approved || 0} IRNs issued`}
        />
        <StatCard
          title="Total Users"
          value={(d.users || 0).toLocaleString()}
          sub="Across all tenant accounts"
          icon={Users}
          gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
        />
      </div>

      {/* ── 2-col section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Subscription Plans */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-slate-900">Subscription Plans</h2>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Breakdown</span>
          </div>
          {(d.subscriptionBreakdown || []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No subscription data yet</p>
          ) : (
            <div className="space-y-3">
              {(d.subscriptionBreakdown || []).map((plan) => {
                const gradients = {
                  ENTERPRISE: ['#8b5cf6', '#7c3aed'],
                  PROFESSIONAL: ['#6366f1', '#4f46e5'],
                  STARTER: ['#10b981', '#059669'],
                  TRIAL: ['#0ea5e9', '#0284c7'],
                };
                const [c1, c2] = gradients[plan.plan] || ['#94a3b8', '#64748b'];
                const total = (d.subscriptionBreakdown || []).reduce((s, p) => s + p._count, 0);
                const pct   = total ? Math.round((plan._count / total) * 100) : 0;
                return (
                  <div key={plan.plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
                        <span className="text-[13px] font-semibold text-slate-700">{plan.plan}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[13px]">
                        <span className="text-slate-400">{plan._count} tenants</span>
                        <span className="font-bold text-slate-900">{formatCurrency(plan.mrr)}/mo</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NRS Health */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-slate-900">NRS Bridge Health</h2>
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="status-dot-green w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Operational
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                label: 'Approved — IRN Issued',
                value: d.nrs?.approved || 0,
                icon: CheckCircle,
                gradient: 'linear-gradient(135deg, #10b981, #059669)',
                bg: '#f0fdf4',
                text: '#065f46',
              },
              {
                label: 'Pending Submission',
                value: d.nrs?.pending || 0,
                icon: Clock,
                gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
                bg: '#fffbeb',
                text: '#78350f',
              },
              {
                label: 'Failed — Retry Required',
                value: d.nrs?.failed || 0,
                icon: XCircle,
                gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                bg: '#fff1f2',
                text: '#881337',
              },
            ].map(({ label, value, icon: Icon, gradient, bg, text }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: bg }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: gradient }}
                >
                  <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="flex-1 text-[13px] font-medium" style={{ color: text }}>{label}</span>
                <span className="text-[18px] font-bold" style={{ color: text }}>
                  {(value || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Revenue chart (if data available) ── */}
      {(d.revenueChart || []).length > 0 && (
        <div className="card p-5">
          <h2 className="text-[15px] font-bold text-slate-900 mb-5">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.revenueChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent Tenants table ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-900">Recent Tenant Registrations</h2>
          <a
            href="/tenants"
            className="flex items-center gap-1 text-[13px] font-semibold text-cosmos-600 hover:text-cosmos-700 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="table-header-cell">Business</th>
                <th className="table-header-cell">Plan</th>
                <th className="table-header-cell">KYC</th>
                <th className="table-header-cell">Subscription</th>
                <th className="table-header-cell">Registered</th>
              </tr>
            </thead>
            <tbody>
              {(d.recentTenants || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    No tenants registered yet
                  </td>
                </tr>
              )}
              {(d.recentTenants || []).map((t) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell">
                    <div className="font-semibold text-slate-900 text-[13px]">
                      {t.tradingName || t.businessName}
                    </div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{t.email}</div>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge text-[11px]', getPlanColor(t.subscriptionPlan))}>
                      {t.subscriptionPlan}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge text-[11px]', getStatusColor(t.kycStatus))}>
                      {t.kycStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge text-[11px]', getStatusColor(t.subscriptionStatus))}>
                      {t.subscriptionStatus}
                    </span>
                  </td>
                  <td className="table-cell text-[12px] text-slate-500">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
