import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Building2, CheckCircle, XCircle, Loader2, ChevronRight,
  Users, Shield, Clock, AlertTriangle, Eye,
  ChevronLeft, X, FileText, Ban, ToggleLeft, ToggleRight,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, getStatusColor, getPlanColor, cn } from '../lib/utils';

const KYC_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

const SUB_COLORS = {
  TRIAL: 'bg-purple-50 text-purple-700 border-purple-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  EXPIRED: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function TenantsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState(searchParams.get('kyc') || '');
  const [planFilter, setPlanFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', page, search, kycFilter, planFilter, subFilter, sortBy],
    queryFn: () =>
      api.get('/admin/tenants', {
        params: {
          page, limit: 20,
          search: search || undefined,
          kycStatus: kycFilter || undefined,
          plan: planFilter || undefined,
          subscriptionStatus: subFilter || undefined,
          sort: sortBy || undefined,
        },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const kycMutation = useMutation({
    mutationFn: ({ tenantId, status, reason }) => api.patch(`/admin/tenants/${tenantId}/kyc`, { status, reason }),
    onSuccess: () => { qc.invalidateQueries(['admin-tenants']); setRejectModal(null); setRejectReason(''); },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ tenantId, action }) => api.post(`/admin/tenants/${tenantId}/${action}`),
    onSuccess: () => qc.invalidateQueries(['admin-tenants']),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ tenantId }) => api.post(`/admin/tenants/${tenantId}/toggle-active`),
    onSuccess: () => qc.invalidateQueries(['admin-tenants']),
  });

  const tenants = data?.data || [];
  const total = data?.pagination?.total || 0;
  const pendingCount = tenants.filter((t) => t.kycStatus === 'PENDING' || t.kycStatus === 'UNDER_REVIEW').length;
  const hasFilters = kycFilter || planFilter || subFilter || search;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Tenants &amp; KYC</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage registered businesses, verify identities, and control access</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 text-[13px] font-bold px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="w-4 h-4" />
            {total.toLocaleString()} tenants
          </div>
        </div>
      </div>

      {/* KYC Stats Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-white/70" />
          <span className="text-[13px] font-bold text-white/80">KYC Verification Overview</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Pending', value: tenants.filter(t => t.kycStatus === 'PENDING').length, icon: Clock, color: 'text-amber-300' },
            { label: 'Under Review', value: tenants.filter(t => t.kycStatus === 'UNDER_REVIEW').length, icon: Eye, color: 'text-blue-300' },
            { label: 'Approved', value: tenants.filter(t => t.kycStatus === 'APPROVED').length, icon: CheckCircle, color: 'text-emerald-300' },
            { label: 'Rejected', value: tenants.filter(t => t.kycStatus === 'REJECTED').length, icon: XCircle, color: 'text-red-300' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm cursor-pointer hover:bg-white/15 transition-colors"
              onClick={() => { setKycFilter(label === 'Under Review' ? 'UNDER_REVIEW' : label.toUpperCase()); setPage(1); }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn('w-3.5 h-3.5', color)} />
                <span className="text-[11px] font-bold text-white/60 uppercase">{label}</span>
              </div>
              <p className="text-[20px] font-black">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KYC alert */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5 bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-[13px] font-semibold text-amber-900 flex-1">
            <span className="text-amber-700 font-bold">{pendingCount}</span> tenant{pendingCount > 1 ? 's' : ''} on this page require KYC review
          </p>
          <button onClick={() => { setKycFilter('PENDING'); setPage(1); }}
            className="text-[12px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
            Show Pending
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, TIN, RC Number…"
            className="w-full py-2.5 pl-10 pr-4 rounded-xl border border-slate-200 text-[13px] font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <select value={kycFilter} onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
          className="py-2.5 px-3 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500">
          <option value="">All KYC</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="py-2.5 px-3 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500">
          <option value="">All Plans</option>
          <option value="TRIAL">Trial</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select value={subFilter} onChange={(e) => { setSubFilter(e.target.value); setPage(1); }}
          className="py-2.5 px-3 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500">
          <option value="">All Status</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="py-2.5 px-3 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name A-Z</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setKycFilter(''); setPlanFilter(''); setSubFilter(''); setSortBy('newest'); setPage(1); }}
            className="flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-red-600 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-red-200 transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Business</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">TIN / CAC</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">KYC</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Activity</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50 animate-pulse">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-3 bg-slate-100 rounded-full" /></td>
                  ))}
                </tr>
              ))}

              {!isLoading && tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No tenants found</p>
                    <p className="text-xs text-slate-300 mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              )}

              {tenants.map((t) => {
                const isSuspended = t.subscriptionStatus === 'SUSPENDED';
                const counts = t._count || {};
                return (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0"
                          style={{ background: t.isActive ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
                          {(t.tradingName || t.businessName || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 text-[13px] truncate max-w-[160px]">
                              {t.tradingName || t.businessName}
                            </span>
                            {!t.isActive && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">DISABLED</span>
                            )}
                          </div>
                          <div className="text-[12px] text-slate-400 mt-0.5">{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-[12px] text-slate-700 font-semibold">
                        {t.tin || <span className="text-slate-300 italic font-sans font-normal">No TIN</span>}
                      </div>
                      {t.rcNumber && <div className="text-[11px] text-slate-400 mt-0.5">RC: {t.rcNumber}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border', getPlanColor(t.subscriptionPlan))}>
                        {t.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border', KYC_COLORS[t.kycStatus] || 'bg-slate-100 text-slate-500')}>
                        {t.kycStatus?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border', SUB_COLORS[t.subscriptionStatus] || 'bg-slate-100 text-slate-500')}>
                        {t.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span title="Users"><Users className="w-3 h-3 inline" /> {counts.users || 0}</span>
                        <span title="Products"><FileText className="w-3 h-3 inline" /> {counts.products || 0}</span>
                        <span title="Invoices"><FileText className="w-3 h-3 inline" /> {counts.invoices || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-slate-500 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* KYC Approve */}
                        {(t.kycStatus === 'PENDING' || t.kycStatus === 'UNDER_REVIEW') && (
                          <>
                            <button onClick={() => kycMutation.mutate({ tenantId: t.id, status: 'APPROVED' })}
                              disabled={kycMutation.isPending}
                              title="Approve KYC"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setRejectModal(t.id); setRejectReason(''); }}
                              disabled={kycMutation.isPending}
                              title="Reject KYC"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {t.kycStatus === 'APPROVED' && (
                          <button onClick={() => kycMutation.mutate({ tenantId: t.id, status: 'UNDER_REVIEW' })}
                            disabled={kycMutation.isPending}
                            title="Re-review KYC"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {t.kycStatus === 'REJECTED' && (
                          <button onClick={() => kycMutation.mutate({ tenantId: t.id, status: 'PENDING' })}
                            disabled={kycMutation.isPending}
                            title="Reset to Pending"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50">
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Suspend / Activate */}
                        {isSuspended ? (
                          <button onClick={() => suspendMutation.mutate({ tenantId: t.id, action: 'activate' })}
                            disabled={suspendMutation.isPending}
                            title="Activate"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50">
                            <ToggleRight className="w-3.5 h-3.5" />
                          </button>
                        ) : t.subscriptionStatus !== 'CANCELLED' && (
                          <button onClick={() => suspendMutation.mutate({ tenantId: t.id, action: 'suspend' })}
                            disabled={suspendMutation.isPending}
                            title="Suspend"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors disabled:opacity-50">
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Detail link */}
                        <Link to={`/tenants/${t.id}`} title="View details"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination?.totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500 bg-slate-50/50">
            <span>
              Page <strong className="text-slate-700">{page}</strong> of{' '}
              <strong className="text-slate-700">{data.pagination.totalPages}</strong>
              {' '}· {data.pagination.total?.toLocaleString()} tenants
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition-colors">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject KYC Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-slate-900">Reject KYC Verification</h3>
              <button onClick={() => setRejectModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">Provide a reason for rejection. This will be visible to the tenant.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g., TIN number does not match business registration, missing CAC certificate…"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-28" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => kycMutation.mutate({ tenantId: rejectModal, status: 'REJECTED', reason: rejectReason })}
                disabled={!rejectReason.trim() || kycMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {kycMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
