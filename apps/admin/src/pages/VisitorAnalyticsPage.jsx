import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Globe, Monitor, Smartphone, MapPin, Eye, Users, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import api from '../lib/api';
import { formatDateTime, cn } from '../lib/utils';

const PERIOD_OPTIONS = [
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['1y', '1 year'],
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6'];

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl text-[12px] font-medium px-3 py-2"
      style={{
        background: 'rgba(15,18,40,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || '#818cf8' }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, children, loading, className }) {
  return (
    <div className={cn('card p-5', className)}>
      <h2 className="text-[15px] font-bold text-slate-900 mb-4">{title}</h2>
      {loading ? <div className="h-[220px] bg-slate-100 rounded-xl animate-pulse" /> : children}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: color || 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        <Icon className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function VisitorAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['site-visits-stats', period],
    queryFn: () => api.get('/admin/site-visits/stats', { params: { period } }).then((r) => r.data.data),
  });

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ['site-visits-list', page, search],
    queryFn: () =>
      api.get('/admin/site-visits', { params: { page, limit: 25, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const visits = listRes?.data || [];
  const pagination = listRes?.pagination;

  const s = statsRes || {};
  const visitsByDay = s.visitsByDay || [];

  const applySearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Site visitor analytics</h1>
          <p className="page-subtitle">
            Page views from the public marketplace: IP, device, browser, OS, and location (when available).
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0 flex-wrap">
          {PERIOD_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                period === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[12px] text-slate-500 -mt-2">
        Location uses Cloudflare <code className="text-[11px] bg-slate-100 px-1 rounded">CF-IPCountry</code> when
        deployed behind Cloudflare, or enable optional <code className="text-[11px] bg-slate-100 px-1 rounded">ENABLE_VISIT_GEO_LOOKUP=true</code> on
        the API (see docs).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={Eye}
          label="Total page views"
          value={(s.totalVisits ?? 0).toLocaleString()}
          sub={`Selected period (${period})`}
          color="linear-gradient(135deg, #6366f1, #8b5cf6)"
        />
        <Kpi
          icon={Users}
          label="Unique sessions"
          value={(s.uniqueSessions ?? 0).toLocaleString()}
          sub="Distinct session IDs"
          color="linear-gradient(135deg, #10b981, #059669)"
        />
        <Kpi
          icon={Monitor}
          label="Top device type"
          value={(s.byDevice?.[0]?.name) || '—'}
          sub={s.byDevice?.[0] ? `${(s.byDevice[0].count || 0).toLocaleString()} views` : undefined}
          color="linear-gradient(135deg, #f59e0b, #d97706)"
        />
        <Kpi
          icon={Globe}
          label="Top country"
          value={(s.byCountry?.[0]?.name) || '—'}
          sub={s.byCountry?.[0] ? `${(s.byCountry[0].count || 0).toLocaleString()} views` : undefined}
          color="linear-gradient(135deg, #0ea5e9, #0284c7)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Visits over time" loading={statsLoading}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={visitsByDay}>
              <defs>
                <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="visits" name="Views" stroke="#6366f1" fill="url(#visitsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Device type" loading={statsLoading}>
          {(s.byDevice || []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No data in this period</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={220} className="max-w-[240px] mx-auto sm:mx-0">
                <PieChart>
                  <Pie
                    data={s.byDevice}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={78}
                    innerRadius={48}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {(s.byDevice || []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v.toLocaleString(), 'Views']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 w-full">
                {(s.byDevice || []).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-[13px]">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 flex-1 capitalize">{item.name}</span>
                    <span className="font-bold text-slate-900">{item.count?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Browser" loading={statsLoading}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.byBrowser || []} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Views" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Operating system" loading={statsLoading}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.byOs || []} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Views" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Country / region (best effort)" loading={statsLoading} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={s.byCountry || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Views" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top pages" loading={statsLoading} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={Math.min(420, 40 + (s.topPaths?.length || 8) * 28)}>
            <BarChart data={[...(s.topPaths || [])].reverse()} layout="vertical" margin={{ left: 4, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="path"
                width={320}
                tick={{ fontSize: 9, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="count" name="Views" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Visit log */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <h2 className="text-[15px] font-bold text-slate-900">Visit log</h2>
            <span className="text-[12px] text-slate-400">
              {(pagination?.total ?? 0).toLocaleString()} records
            </span>
          </div>
          <form onSubmit={applySearch} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Path, IP, city…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              Search
            </button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="table-header-cell whitespace-nowrap">Time</th>
                <th className="table-header-cell">Path</th>
                <th className="table-header-cell">IP</th>
                <th className="table-header-cell">Location</th>
                <th className="table-header-cell">Browser</th>
                <th className="table-header-cell">OS</th>
                <th className="table-header-cell">Device</th>
              </tr>
            </thead>
            <tbody>
              {listLoading && visits.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">Loading…</td>
                </tr>
              )}
              {!listLoading && visits.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    No visits recorded yet. Open the marketplace with the API reachable; events POST to{' '}
                    <code className="text-[11px] bg-slate-100 px-1 rounded">/api/public/visits</code>.
                  </td>
                </tr>
              )}
              {visits.map((v) => (
                <tr key={v.id} className="table-row">
                  <td className="table-cell whitespace-nowrap text-[12px] text-slate-500">
                    {formatDateTime(v.createdAt)}
                  </td>
                  <td className="table-cell">
                    <div className="font-mono text-[12px] text-slate-800 max-w-[280px] truncate" title={v.path}>
                      {v.path}
                    </div>
                    {v.pageTitle && (
                      <div className="text-[11px] text-slate-400 truncate max-w-[280px]" title={v.pageTitle}>
                        {v.pageTitle}
                      </div>
                    )}
                  </td>
                  <td className="table-cell font-mono text-[12px]">{v.ip}</td>
                  <td
                    className="table-cell text-[12px] text-slate-600"
                    title={
                      v.latitude != null && v.longitude != null
                        ? `Approx. ${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}`
                        : undefined
                    }
                  >
                    {[v.city, v.region, v.countryName || v.countryCode].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="table-cell text-[12px]">
                    {[v.browserName, v.browserVersion].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="table-cell text-[12px]">
                    {[v.osName, v.osVersion].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="table-cell text-[12px] capitalize">
                    <span className="inline-flex items-center gap-1">
                      {v.deviceType === 'mobile' && <Smartphone className="w-3.5 h-3.5 text-slate-400" />}
                      {v.deviceType === 'desktop' && <Monitor className="w-3.5 h-3.5 text-slate-400" />}
                      {v.deviceType || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[12px] text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!pagination.hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
