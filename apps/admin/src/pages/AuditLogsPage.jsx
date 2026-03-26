import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ClipboardList, Building2, X } from 'lucide-react';
import api from '../lib/api';
import { formatDateTime, cn } from '../lib/utils';

const ACTION_STYLES = {
  CREATE: { bg: 'rgba(16,185,129,0.08)',  text: '#065f46', border: 'rgba(16,185,129,0.20)' },
  UPDATE: { bg: 'rgba(99,102,241,0.08)',  text: '#3730a3', border: 'rgba(99,102,241,0.20)' },
  DELETE: { bg: 'rgba(244,63,94,0.08)',   text: '#881337', border: 'rgba(244,63,94,0.20)' },
  LOGIN:  { bg: 'rgba(148,163,184,0.12)', text: '#475569', border: 'rgba(148,163,184,0.25)' },
  APPROVE:{ bg: 'rgba(139,92,246,0.08)',  text: '#4c1d95', border: 'rgba(139,92,246,0.20)' },
  REJECT: { bg: 'rgba(244,63,94,0.08)',   text: '#881337', border: 'rgba(244,63,94,0.20)' },
  SUBMIT: { bg: 'rgba(245,158,11,0.08)',  text: '#78350f', border: 'rgba(245,158,11,0.22)' },
  SEND:   { bg: 'rgba(14,165,233,0.08)',  text: '#0c4a6e', border: 'rgba(14,165,233,0.20)' },
};

function ActionBadge({ action }) {
  const style = ACTION_STYLES[action] || { bg: 'rgba(148,163,184,0.12)', text: '#475569', border: 'rgba(148,163,184,0.25)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {action}
    </span>
  );
}

const ACTIONS  = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT', 'SUBMIT', 'SEND'];
const ENTITIES = ['invoice', 'quote', 'product', 'customer', 'supplier', 'employee', 'payroll', 'purchase_order', 'journal_entry', 'user', 'tenant'];

export default function AuditLogsPage() {
  const [search, setSearch]           = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [selected, setSelected] = useState(null);

  const hasFilters = search || tenantSearch || actionFilter || entityFilter;
  const clearFilters = () => {
    setSearch(''); setTenantSearch('');
    setActionFilter(''); setEntityFilter('');
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, search, tenantSearch, actionFilter, entityFilter],
    queryFn: () =>
      api.get('/admin/audit-logs', {
        params: {
          page, limit: 30,
          search: search || undefined,
          tenantSearch: tenantSearch || undefined,
          action: actionFilter || undefined,
          resource: entityFilter || undefined,
        },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const logs = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Complete cross-tenant action trail — every event, every user</p>
        </div>
        <div
          className="hidden sm:flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          <ClipboardList className="w-4 h-4" />
          {(data?.pagination?.total || 0).toLocaleString()} entries
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by user, description…"
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={tenantSearch}
            onChange={(e) => { setTenantSearch(e.target.value); setPage(1); }}
            placeholder="Filter by tenant…"
            className="input-field pl-10"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="select-field"
        >
          <option value="">All Entities</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* ── Filter chips / clear ── */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] text-slate-500 font-medium">Active filters:</span>
          {[
            search        && { label: `"${search}"`,      clear: () => setSearch('') },
            tenantSearch  && { label: `Tenant: ${tenantSearch}`, clear: () => setTenantSearch('') },
            actionFilter  && { label: `Action: ${actionFilter}`, clear: () => setActionFilter('') },
            entityFilter  && { label: `Entity: ${entityFilter}`, clear: () => setEntityFilter('') },
          ].filter(Boolean).map((chip, i) => (
            <button
              key={i}
              onClick={chip.clear}
              className="flex items-center gap-1 text-[11px] font-semibold text-cosmos-700 bg-cosmos-50 border border-cosmos-200/70 px-2.5 py-1 rounded-full hover:bg-cosmos-100 transition-colors"
            >
              {chip.label} <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={clearFilters} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium hover:underline ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="table-header-cell whitespace-nowrap">Timestamp</th>
                <th className="table-header-cell">Tenant</th>
                <th className="table-header-cell">User</th>
                <th className="table-header-cell">Action</th>
                <th className="table-header-cell">Entity</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(12)].map((_, i) => (
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
                    <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No audit logs found</p>
                    {hasFilters && (
                      <button onClick={clearFilters} className="mt-2 text-cosmos-600 text-sm font-semibold hover:underline">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {logs.map((log) => (
                <tr key={log.id} className="table-row cursor-pointer" onClick={() => setSelected(log)}>
                  <td className="table-cell text-[11px] text-slate-500 whitespace-nowrap font-mono">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="table-cell">
                    <span className="text-[12px] font-semibold text-slate-700 max-w-[130px] truncate block">
                      {log.tenant?.tradingName || log.tenant?.businessName || (
                        <span className="text-slate-300 italic font-normal">Platform</span>
                      )}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        {log.user
                          ? `${log.user.firstName?.[0] || ''}${log.user.lastName?.[0] || ''}`
                          : 'S'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-800 truncate max-w-[100px]">
                          {log.user
                            ? `${log.user.firstName} ${log.user.lastName}`
                            : <span className="text-slate-300 italic font-normal">System</span>}
                        </div>
                        {log.user?.role && (
                          <div className="text-[10px] text-slate-400">{log.user.role}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="table-cell">
                    <span
                      className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                      style={{ background: '#f1f5f9', color: '#475569' }}
                    >
                      {log.entity}
                    </span>
                  </td>
                  <td className="table-cell text-[12px] text-slate-600 max-w-xs">
                    <div className="truncate" title={log.description}>{log.description || '—'}</div>
                    {log.entityId && (
                      <div className="text-[10px] text-slate-300 font-mono mt-0.5 truncate">{log.entityId}</div>
                    )}
                  </td>
                  <td className="table-cell text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {log.ipAddress || '—'}
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
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="page-btn">← Prev</button>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)} className="page-btn">Next →</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[14px] font-black text-slate-900">Audit log details</h3>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">When</div>
                <div className="text-[13px] font-semibold text-slate-900 font-mono">{formatDateTime(selected.createdAt)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">IP / User Agent</div>
                <div className="text-[13px] text-slate-700 font-mono">{selected.ipAddress || '—'}</div>
                <div className="text-[12px] text-slate-500 break-words">{selected.userAgent || '—'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenant</div>
                <div className="text-[13px] font-semibold text-slate-900">{selected.tenant?.tradingName || selected.tenant?.businessName || 'Platform'}</div>
                {selected.tenant?.id && <div className="text-[11px] text-slate-400 font-mono">{selected.tenant.id}</div>}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actor</div>
                <div className="text-[13px] font-semibold text-slate-900">
                  {selected.user
                    ? `${selected.user.firstName || ''} ${selected.user.lastName || ''}`.trim() || selected.user.email
                    : selected.adminUser
                      ? `${selected.adminUser.firstName || ''} ${selected.adminUser.lastName || ''}`.trim() || selected.adminUser.email
                      : 'System'}
                </div>
                <div className="text-[12px] text-slate-500 font-mono">{selected.user?.email || selected.adminUser?.email || '—'}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</div>
                <div className="text-[13px] font-black text-slate-900">{selected.action}</div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resource</div>
                <div className="text-[13px] font-semibold text-slate-900">{selected.resource}</div>
                <div className="text-[11px] text-slate-400 font-mono break-all">{selected.resourceId || '—'}</div>
              </div>
            </div>

            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Old values</div>
                <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words font-mono max-h-48 overflow-auto">{selected.oldValues ? JSON.stringify(selected.oldValues, null, 2) : '—'}</pre>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">New values</div>
                <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words font-mono max-h-48 overflow-auto">{selected.newValues ? JSON.stringify(selected.newValues, null, 2) : '—'}</pre>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Metadata</div>
                <pre className="text-[11px] text-slate-700 whitespace-pre-wrap break-words font-mono max-h-48 overflow-auto">{selected.metadata ? JSON.stringify(selected.metadata, null, 2) : '—'}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
