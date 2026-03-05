import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Building2, ShoppingCart, DollarSign } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../lib/api';
import { formatCurrency, getPlanColor, cn } from '../lib/utils';

const PERIOD_OPTIONS = [
  ['7d', '7 Days'],
  ['30d', '30 Days'],
  ['90d', '90 Days'],
  ['1y', '1 Year'],
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl text-[12px] font-medium"
      style={{
        background: 'rgba(15,18,40,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || '#818cf8' }} className="font-semibold">
          {p.name}: {currency ? formatCurrency(p.value) : p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, gradient, bg, textColor }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden card-hover"
      style={{
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-1/3 translate-x-1/3 opacity-[0.07] blur-xl pointer-events-none"
        style={{ background: gradient }}
      />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-[26px] font-bold text-slate-900 tracking-tight leading-none">{value}</p>
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, loading }) {
  return (
    <div className="card p-5">
      <h2 className="text-[15px] font-bold text-slate-900 mb-5">{title}</h2>
      {loading ? (
        <div className="h-[200px] bg-slate-100 rounded-xl animate-pulse" />
      ) : children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => api.get('/admin/analytics', { params: { period } }).then((r) => r.data.data),
  });

  const d = data || {};

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Platform Analytics</h1>
          <p className="page-subtitle">Revenue, growth &amp; usage metrics across all tenants</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {PERIOD_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPeriod(val)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-150',
                period === val
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue (MRR)"
          value={formatCurrency(d.mrr || 0)}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #10b981, #059669)"
        />
        <KpiCard
          label="Active Tenants"
          value={(d.activeTenants || 0).toLocaleString()}
          icon={Building2}
          gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
        />
        <KpiCard
          label="Marketplace Orders"
          value={(d.marketplaceOrders || 0).toLocaleString()}
          icon={ShoppingCart}
          gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
        />
        <KpiCard
          label="Marketplace GMV"
          value={formatCurrency(d.gmv || 0)}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <ChartCard title="Revenue Over Time" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.revenueTimeSeries || []}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#revenueGrad)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="New Tenant Registrations" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.tenantRegistrations || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="New Tenants" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Subscription Plan Distribution" loading={isLoading}>
          {(d.planDistribution || []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No distribution data available</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={d.planDistribution || []}
                    dataKey="count"
                    nameKey="plan"
                    cx="50%" cy="50%"
                    outerRadius={72}
                    innerRadius={44}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {(d.planDistribution || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {(d.planDistribution || []).map((item, i) => (
                  <div key={item.plan} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[13px] text-slate-600 flex-1">{item.plan}</span>
                    <span className="text-[13px] font-bold text-slate-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="NRS Submission Volume" loading={isLoading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.nrsVolume || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
              <Bar dataKey="failed"   name="Failed"   fill="#f43f5e" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={28} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(val) => <span style={{ color: '#64748b' }}>{val}</span>}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Top tenants table ── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-900">Top Tenants by Revenue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="table-header-cell w-10">#</th>
                <th className="table-header-cell">Tenant</th>
                <th className="table-header-cell">Plan</th>
                <th className="table-header-cell">Invoice Revenue</th>
                <th className="table-header-cell">Marketplace GMV</th>
                <th className="table-header-cell">NRS Submissions</th>
              </tr>
            </thead>
            <tbody>
              {(d.topTenants || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No analytics data available yet
                  </td>
                </tr>
              )}
              {(d.topTenants || []).map((t, i) => (
                <tr key={t.id} className="table-row">
                  <td className="table-cell">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
                      style={{
                        background: i === 0
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : i === 1
                          ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                          : i === 2
                          ? 'linear-gradient(135deg, #cd7f32, #b45309)'
                          : '#e2e8f0',
                        color: i < 3 ? '#fff' : '#64748b',
                      }}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="font-semibold text-[13px] text-slate-900">{t.tradingName || t.businessName}</div>
                    <div className="text-[12px] text-slate-400">{t.subscriptionPlan}</div>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge text-[11px]', getPlanColor(t.subscriptionPlan))}>
                      {t.subscriptionPlan}
                    </span>
                  </td>
                  <td className="table-cell font-bold text-[13px] text-slate-900">
                    {formatCurrency(t.invoiceRevenue || 0)}
                  </td>
                  <td className="table-cell font-bold text-[13px] text-slate-900">
                    {formatCurrency(t.marketplaceGmv || 0)}
                  </td>
                  <td className="table-cell text-[13px] text-slate-600">
                    {(t.nrsCount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
