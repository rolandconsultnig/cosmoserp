import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, RefreshCw, CheckCircle, XCircle, Clock,
  Search, Loader2, AlertTriangle, Activity,
} from 'lucide-react';
import api from '../lib/api';
import { formatDateTime, getStatusColor, cn } from '../lib/utils';

function StatusIcon({ status }) {
  if (status === 'APPROVED') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
  if (status === 'FAILED')   return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

export default function NRSMonitorPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-nrs-logs', page, search, statusFilter],
    queryFn: () =>
      api.get('/admin/nrs-logs', {
        params: { page, limit: 25, search: search || undefined, status: statusFilter || undefined },
      }).then((r) => r.data),
    keepPreviousData: true,
    refetchInterval: 30000,
  });

  const retryMutation = useMutation({
    mutationFn: (logId) => api.post(`/admin/nrs-logs/${logId}/retry`),
    onSuccess: () => qc.invalidateQueries(['admin-nrs-logs']),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-nrs-stats'],
    queryFn: () => api.get('/admin/nrs-stats').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const logs = data?.data || [];

  const statCards = [
    {
      label: 'Total Submissions',
      value: stats?.total || 0,
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      bg: 'rgba(99,102,241,0.06)',
      border: 'rgba(99,102,241,0.15)',
      text: '#4f46e5',
    },
    {
      label: 'Approved — IRN Issued',
      value: stats?.approved || 0,
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      bg: 'rgba(16,185,129,0.06)',
      border: 'rgba(16,185,129,0.18)',
      text: '#065f46',
    },
    {
      label: 'Pending Submission',
      value: stats?.pending || 0,
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      bg: 'rgba(245,158,11,0.07)',
      border: 'rgba(245,158,11,0.20)',
      text: '#78350f',
    },
    {
      label: 'Failed — Retry Required',
      value: stats?.failed || 0,
      gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
      bg: 'rgba(244,63,94,0.06)',
      border: 'rgba(244,63,94,0.18)',
      text: '#881337',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">NRS Bridge Monitor</h1>
          <p className="page-subtitle">FIRS e-invoicing submissions across all tenants · Auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
          <Activity className="w-3.5 h-3.5" />
          NRS API: Operational
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, gradient, bg, border, text }) => (
          <div
            key={label}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: bg,
              border: `1px solid ${border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div className="text-[26px] font-bold leading-none tracking-tight" style={{ color: text }}>
              {(value || 0).toLocaleString()}
            </div>
            <div className="text-[12px] font-semibold mt-2" style={{ color: text, opacity: 0.65 }}>
              {label}
            </div>
            <div
              className="absolute bottom-0 right-0 w-16 h-16 rounded-tl-[32px] opacity-10"
              style={{ background: gradient }}
            />
          </div>
        ))}
      </div>

      {/* ── Failed alert ── */}
      {(stats?.failed || 0) > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}
        >
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold text-red-900">
              {stats.failed} invoice submission{stats.failed > 1 ? 's' : ''} failed
            </p>
            <p className="text-[12px] text-red-700 mt-0.5">
              These invoices are not registered with FIRS. Use the Retry button on each row to resubmit.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by IRN, tenant, invoice number…"
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* ── Logs table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Tenant</th>
                <th className="table-header-cell">Invoice Ref</th>
                <th className="table-header-cell">IRN</th>
                <th className="table-header-cell">Type</th>
                <th className="table-header-cell">Submitted</th>
                <th className="table-header-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50 animate-pulse">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded-full" />
                    </td>
                  ))}
                </tr>
              ))}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No NRS submissions found</p>
                  </td>
                </tr>
              )}

              {logs.map((log) => (
                <tr key={log.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={log.status} />
                      <span className={cn('badge text-[11px]', getStatusColor(log.status))}>
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-[13px] font-semibold text-slate-900 truncate max-w-[140px]">
                      {log.tenant?.tradingName || log.tenant?.businessName}
                    </div>
                    {log.tenant?.tin && (
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{log.tenant.tin}</div>
                    )}
                  </td>
                  <td className="table-cell font-mono text-[12px] text-slate-700">
                    {log.invoiceRef || log.invoiceId || '—'}
                  </td>
                  <td className="table-cell">
                    {log.irn ? (
                      <span
                        className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: '#f0fdf4', color: '#065f46', border: '1px solid #bbf7d0' }}
                      >
                        {log.irn}
                      </span>
                    ) : (
                      <span className="text-[12px] text-slate-300 italic">Not issued</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className="badge text-[11px] bg-slate-100 text-slate-600 border border-slate-200/80">
                      {log.submissionType || 'B2B'}
                    </span>
                  </td>
                  <td className="table-cell text-[12px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="table-cell">
                    {log.status === 'FAILED' && (
                      <button
                        onClick={() => retryMutation.mutate(log.id)}
                        disabled={retryMutation.isPending}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-cosmos-600 bg-cosmos-50 hover:bg-cosmos-100 border border-cosmos-200/70 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {retryMutation.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <RefreshCw className="w-3 h-3" />}
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.pagination?.totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500 bg-slate-50/50">
            <span>
              Page <strong className="text-slate-700">{page}</strong> of{' '}
              <strong className="text-slate-700">{data.pagination.totalPages}</strong>
              {' '}· {data.pagination.total?.toLocaleString()} submissions
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="page-btn">← Prev</button>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)} className="page-btn">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
