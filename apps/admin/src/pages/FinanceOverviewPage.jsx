import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, FileText, AlertTriangle, Receipt,
  Building2, ChevronLeft, ChevronRight, RefreshCw, CreditCard,
  Shield, CheckCircle, Clock, XCircle, Flag, Loader2, X,
  MessageSquare,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

function fmt(v) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

const INV_STATUS = {
  DRAFT: { color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
  SENT: { color: '#0052CC', bg: '#EBF2FF', border: '#A4CDFF' },
  PARTIAL: { color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
  PAID: { color: '#00875A', bg: '#E3FCEF', border: '#ABF5D1' },
  OVERDUE: { color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
  CANCELLED: { color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  CREDITED: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

export default function FinanceOverviewPage() {
  const [period, setPeriod] = useState('30d');
  const [tab, setTab] = useState('overview');
  const [invPage, setInvPage] = useState(1);
  const [invStatusFilter, setInvStatusFilter] = useState('');
  const [flagModal, setFlagModal] = useState(null);
  const [flagNotes, setFlagNotes] = useState('');
  const qc = useQueryClient();

  const invalidateAll = () => { qc.invalidateQueries(['admin-finance']); qc.invalidateQueries(['admin-invoices']); };

  const { data: overview } = useQuery({
    queryKey: ['admin-finance', period],
    queryFn: () => api.get('/admin/finance/overview', { params: { period } }).then(r => r.data.data).catch(() => ({})),
  });

  const { data: invoicesData, isLoading: invLoading } = useQuery({
    queryKey: ['admin-invoices', invPage, invStatusFilter],
    queryFn: () => api.get('/admin/finance/invoices', { params: { page: invPage, limit: 20, status: invStatusFilter || undefined } }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'invoices',
    keepPreviousData: true,
  });

  const flagMutation = useMutation({
    mutationFn: ({ invoiceId, flag, notes }) => api.patch(`/admin/finance/invoices/${invoiceId}/flag`, { flag, notes }),
    onSuccess: () => { invalidateAll(); setFlagModal(null); setFlagNotes(''); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ invoiceId, status }) => api.patch(`/admin/finance/invoices/${invoiceId}/status`, { status }),
    onSuccess: invalidateAll,
  });

  const d = overview || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Finance Management</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Cross-tenant invoicing, payments, and tax compliance</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d', '30d', '90d', '365d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all',
                period === p ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700')}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoiced', value: fmt(d.totalInvoiced), icon: FileText, color: '#0052CC' },
          { label: 'Total Paid', value: fmt(d.totalPaid), icon: CheckCircle, color: '#00875A' },
          { label: 'Outstanding', value: fmt(d.totalDue), icon: Clock, color: '#FF8B00' },
          { label: 'VAT Collected', value: fmt(d.totalVAT), icon: Shield, color: '#7C3AED' },
          { label: 'WHT Deducted', value: fmt(d.totalWHT), icon: Receipt, color: '#6366F1' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[20px] font-black text-slate-900 tracking-tight">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'invoices', label: 'Manage Invoices' },
          { id: 'overdue', label: 'Overdue' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice status — clickable to filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Invoice Status Breakdown</h3>
            <div className="space-y-2">
              {(d.invoicesByStatus || []).map(s => {
                const cfg = INV_STATUS[s.status] || INV_STATUS.DRAFT;
                return (
                  <div key={s.status} className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: cfg.bg }}
                    onClick={() => { setTab('invoices'); setInvStatusFilter(s.status); setInvPage(1); }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-[13px] font-bold" style={{ color: cfg.color }}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-slate-500">{s._count} invoices</span>
                      <span className="text-[13px] font-black" style={{ color: cfg.color }}>{fmt(s._sum?.totalAmount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax filing compliance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Tax Filing Status</h3>
            <div className="space-y-2">
              {(d.taxFilingStats || []).map(s => (
                <div key={`${s.type}-${s.status}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[13px] font-semibold text-slate-700">{s.status}</span>
                    {s.type && <span className="text-[10px] text-slate-400 ml-2">{s.type}</span>}
                  </div>
                  <span className="text-[16px] font-black text-slate-900">{s._count}</span>
                </div>
              ))}
              {(d.taxFilingStats || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No tax filings yet</p>}
            </div>
          </div>

          {/* Top tenants */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Top Tenants by Revenue</h3>
            <div className="space-y-2">
              {(d.topTenantsByRevenue || []).map((t, i) => (
                <div key={t.tenantId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-black">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{t.tenant?.businessName || 'Unknown'}</p>
                    <p className="text-[11px] text-slate-400">{t._count} paid invoices</p>
                  </div>
                  <span className="text-[14px] font-black text-emerald-600 tabular-nums">{fmt(t.total)}</span>
                </div>
              ))}
              {(d.topTenantsByRevenue || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No data yet</p>}
            </div>
          </div>

          {/* Recent payments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Recent Payments</h3>
            <div className="space-y-2">
              {(d.recentPayments || []).slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{p.invoice?.tenant?.businessName || '—'}</p>
                    <p className="text-[11px] text-slate-400">{p.invoice?.customer?.name} · {p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-emerald-600 tabular-nums">{fmt(p.amount)}</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(p.paidAt)}</p>
                  </div>
                </div>
              ))}
              {(d.recentPayments || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No payments yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Manage Invoices Tab */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={invStatusFilter} onChange={e => { setInvStatusFilter(e.target.value); setInvPage(1); }}
              className="text-[13px] border border-slate-200 rounded-xl px-3 py-2">
              <option value="">All Statuses</option>
              {Object.keys(INV_STATUS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {invStatusFilter && (
              <button onClick={() => { setInvStatusFilter(''); setInvPage(1); }}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Invoice #', 'Tenant', 'Customer', 'Amount', 'Paid', 'Due', 'Status', 'NRS', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invLoading && [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      {[...Array(10)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                    </tr>
                  ))}
                  {(invoicesData?.data || []).map(inv => {
                    const cfg = INV_STATUS[inv.status] || INV_STATUS.DRAFT;
                    return (
                      <tr key={inv.id} className={cn('border-b border-slate-50 hover:bg-slate-50/50', inv.adminFlagged && 'bg-amber-50/30')}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {inv.adminFlagged && <Flag className="w-3 h-3 text-amber-500" />}
                            <span className="text-[12px] font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-indigo-600 font-semibold">{inv.tenant?.businessName}</td>
                        <td className="px-3 py-3 text-[12px] text-slate-600">{inv.customer?.name}</td>
                        <td className="px-3 py-3 text-[13px] font-bold text-slate-900 tabular-nums">{fmt(inv.totalAmount)}</td>
                        <td className="px-3 py-3 text-[12px] text-emerald-600 tabular-nums">{fmt(inv.amountPaid)}</td>
                        <td className="px-3 py-3 text-[12px] text-amber-600 tabular-nums">{fmt(inv.amountDue)}</td>
                        <td className="px-3 py-3">
                          <select className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border-0 cursor-pointer"
                            value={inv.status}
                            style={{ background: cfg.bg, color: cfg.color }}
                            onChange={e => statusMutation.mutate({ invoiceId: inv.id, status: e.target.value })}>
                            {Object.entries(INV_STATUS).map(([k, v]) => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold',
                            inv.nrsStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                            inv.nrsStatus === 'SUBMITTED' ? 'bg-blue-50 text-blue-600' :
                            inv.nrsStatus === 'REJECTED' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500')}>
                            {inv.nrsStatus || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap">{fmtDate(inv.issueDate)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setFlagModal({ id: inv.id, number: inv.invoiceNumber, flagged: inv.adminFlagged, tenant: inv.tenant?.businessName })}
                              className={cn('p-1.5 rounded-lg transition-colors', inv.adminFlagged ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500')}
                              title={inv.adminFlagged ? 'Manage flag' : 'Flag for review'}>
                              <Flag className="w-3 h-3" />
                            </button>
                            {inv.status === 'OVERDUE' && (
                              <button onClick={() => statusMutation.mutate({ invoiceId: inv.id, status: 'CANCELLED' })}
                                disabled={statusMutation.isPending}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Cancel invoice">
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!invLoading && (invoicesData?.data || []).length === 0 && (
                    <tr><td colSpan={10} className="text-center py-16">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">No invoices found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(invoicesData?.pagination?.totalPages || invoicesData?.totalPages || 0) > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[12px] text-slate-400">Page {invPage} of {invoicesData.pagination?.totalPages || invoicesData.totalPages}</span>
                <div className="flex gap-1.5">
                  <button disabled={invPage === 1} onClick={() => setInvPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button disabled={invPage >= (invoicesData.pagination?.totalPages || invoicesData.totalPages)} onClick={() => setInvPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overdue Tab with actions */}
      {tab === 'overdue' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Overdue Invoices — Requires Action
          </h3>
          {(d.overdueInvoices || []).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-[14px] text-slate-400 font-medium">No overdue invoices</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(d.overdueInvoices || []).map(inv => {
                const daysOverdue = Math.ceil((Date.now() - new Date(inv.dueDate)) / 86400000);
                return (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                    <div>
                      <p className="text-[13px] font-bold text-slate-800">{inv.invoiceNumber} — {inv.tenant?.businessName}</p>
                      <p className="text-[11px] text-slate-500">{inv.customer?.name} · Due {fmtDate(inv.dueDate)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[14px] font-black text-red-600 tabular-nums">{fmt(inv.amountDue)}</p>
                        <p className="text-[10px] text-red-400">{daysOverdue} days overdue</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => setFlagModal({ id: inv.id, number: inv.invoiceNumber, flagged: false, tenant: inv.tenant?.businessName })}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                          <Flag className="w-3 h-3" /> Flag
                        </button>
                        <button onClick={() => statusMutation.mutate({ invoiceId: inv.id, status: 'CANCELLED' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                          <XCircle className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Flag Invoice Modal */}
      {flagModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setFlagModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Flag className="w-5 h-5 text-amber-600" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">{flagModal.flagged ? 'Update Flag' : 'Flag Invoice'}</h3>
                <p className="text-[12px] text-slate-500">{flagModal.number} · {flagModal.tenant}</p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600">Flagged invoices are marked for admin review. Add notes to explain the issue.</p>
            <textarea value={flagNotes} onChange={e => setFlagNotes(e.target.value)} placeholder="Notes about the issue (e.g., suspicious amount, duplicate, compliance issue)…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none h-20" />
            <div className="flex justify-between">
              {flagModal.flagged && (
                <button onClick={() => flagMutation.mutate({ invoiceId: flagModal.id, flag: false, notes: '' })}
                  disabled={flagMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100">
                  <CheckCircle className="w-4 h-4" /> Remove Flag
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setFlagModal(null)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</button>
                <button onClick={() => flagMutation.mutate({ invoiceId: flagModal.id, flag: true, notes: flagNotes })}
                  disabled={flagMutation.isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition-colors">
                  {flagMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                  {flagModal.flagged ? 'Update Flag' : 'Flag Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
