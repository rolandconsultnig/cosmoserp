import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart, TrendingUp, CreditCard, Banknote, Building2,
  Wallet, Clock, Receipt, Smartphone, Search, Ban, Loader2,
  Eye, X, ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

function fmt(v) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }

const PAY_METHOD_ICON = { CASH: Banknote, CARD: CreditCard, TRANSFER: Wallet, MOBILE: Smartphone, SPLIT: CreditCard };
const PAY_METHOD_COLOR = { CASH: '#00875A', CARD: '#0052CC', TRANSFER: '#7C3AED', MOBILE: '#FF8B00', SPLIT: '#6366F1' };

const STATUS_CFG = {
  COMPLETED: { color: '#00875A', bg: '#E3FCEF', border: '#ABF5D1' },
  VOIDED:    { color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
  REFUNDED:  { color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
  PENDING:   { color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
};

export default function POSOverviewPage() {
  const [tab, setTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [expandedSale, setExpandedSale] = useState(null);
  const [voidModal, setVoidModal] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const qc = useQueryClient();

  const invalidateAll = () => { qc.invalidateQueries(['admin-pos-overview']); qc.invalidateQueries(['admin-pos-sales']); };

  const { data: overview } = useQuery({
    queryKey: ['admin-pos-overview'],
    queryFn: () => api.get('/admin/pos/overview').then(r => r.data.data).catch(() => ({})),
    refetchInterval: 30000,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['admin-pos-sales', page, statusFilter],
    queryFn: () => api.get('/admin/pos/sales', { params: { page, limit: 20, status: statusFilter || undefined } }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'transactions',
    keepPreviousData: true,
  });

  const voidMutation = useMutation({
    mutationFn: ({ saleId, reason }) => api.post(`/admin/pos/sales/${saleId}/void`, { reason }),
    onSuccess: () => { invalidateAll(); setVoidModal(null); setVoidReason(''); },
  });

  const d = overview || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">POS Management</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Monitor and manage point-of-sale transactions across all tenants</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(d.totalRevenue), sub: `${d.totalSaleCount || 0} transactions`, icon: TrendingUp, color: '#00875A' },
          { label: "Today's Revenue", value: fmt(d.todayRevenue), sub: `${d.todayCount || 0} sales today`, icon: ShoppingCart, color: '#0052CC' },
          { label: 'Monthly Revenue', value: fmt(d.monthRevenue), sub: `${d.monthCount || 0} this month`, icon: Receipt, color: '#7C3AED' },
          { label: 'VAT Collected', value: fmt(d.totalVAT), sub: 'Total POS VAT', icon: CreditCard, color: '#FF8B00' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[22px] font-black text-slate-900 tracking-tight">{value}</p>
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
          { id: 'transactions', label: 'All Transactions' },
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
          {/* Payment method breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Payment Methods</h3>
            <div className="space-y-3">
              {(d.salesByPayment || []).map(p => {
                const color = PAY_METHOD_COLOR[p.paymentMethod] || '#64748B';
                const Icon = PAY_METHOD_ICON[p.paymentMethod] || CreditCard;
                const total = (d.salesByPayment || []).reduce((a, b) => a + b._count, 0);
                const pct = total ? Math.round((p._count / total) * 100) : 0;
                return (
                  <div key={p.paymentMethod} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="font-bold text-slate-700">{p.paymentMethod}</span>
                        <span className="font-bold" style={{ color }}>{p._count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">{fmt(p._sum?.totalAmount)}</p>
                    </div>
                  </div>
                );
              })}
              {(d.salesByPayment || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No POS sales data</p>}
            </div>
          </div>

          {/* Sales status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Sales Status</h3>
            <div className="space-y-2">
              {(d.salesByStatus || []).map(s => {
                const cfg = STATUS_CFG[s.status] || STATUS_CFG.PENDING;
                return (
                  <div key={s.status} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: cfg.bg }}
                    onClick={() => { setTab('transactions'); setStatusFilter(s.status); setPage(1); }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-[13px] font-bold" style={{ color: cfg.color }}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] font-bold text-slate-500">{s._count} sales</span>
                      <span className="text-[14px] font-black tabular-nums" style={{ color: cfg.color }}>{fmt(s._sum?.totalAmount)}</span>
                    </div>
                  </div>
                );
              })}
              {(d.salesByStatus || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No data</p>}
            </div>
          </div>

          {/* Top tenants */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Top Tenants by POS Revenue</h3>
            <div className="space-y-2">
              {(d.topTenantsByPOS || []).map((t, i) => (
                <div key={t.tenantId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-black">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{t.tenant?.businessName || 'Unknown'}</p>
                    <p className="text-[11px] text-slate-400">{t._count} sales</p>
                  </div>
                  <span className="text-[14px] font-black text-emerald-600 tabular-nums">{fmt(t.total)}</span>
                </div>
              ))}
              {(d.topTenantsByPOS || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No data</p>}
            </div>
          </div>

          {/* Recent sales with quick void */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Recent POS Sales</h3>
            <div className="space-y-2">
              {(d.recentSales || []).slice(0, 10).map(sale => {
                const cfg = STATUS_CFG[sale.status] || STATUS_CFG.PENDING;
                return (
                  <div key={sale.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-bold text-slate-800">{sale.receiptNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{sale.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {sale.tenant?.businessName} · {sale.cashier?.firstName} {sale.cashier?.lastName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold text-slate-900 tabular-nums">{fmt(sale.totalAmount)}</p>
                        <p className="text-[10px] text-slate-400">{fmtDate(sale.createdAt)}</p>
                      </div>
                      {sale.status === 'COMPLETED' && (
                        <button onClick={() => setVoidModal({ id: sale.id, receipt: sale.receiptNumber, amount: sale.totalAmount, tenant: sale.tenant?.businessName })}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all" title="Void sale">
                          <Ban className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(d.recentSales || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No recent sales</p>}
            </div>
          </div>
        </div>
      )}

      {/* Transactions Tab — full table with actions */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="select-field text-[13px] border border-slate-200 rounded-xl px-3 py-2">
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="VOIDED">Voided</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            {statusFilter && (
              <button onClick={() => { setStatusFilter(''); setPage(1); }}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <X className="w-3 h-3" /> Clear filter
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['', 'Receipt #', 'Tenant', 'Cashier', 'Payment', 'Amount', 'VAT', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salesLoading && [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      {[...Array(10)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                    </tr>
                  ))}
                  {(salesData?.data || []).map(sale => {
                    const cfg = STATUS_CFG[sale.status] || STATUS_CFG.PENDING;
                    const isExpanded = expandedSale === sale.id;
                    const PayIcon = PAY_METHOD_ICON[sale.paymentMethod] || CreditCard;
                    return (
                      <>
                        <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-3 py-2.5">
                            <button onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                              className="p-1 rounded hover:bg-slate-100">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[12px] font-bold text-slate-800">{sale.receiptNumber}</td>
                          <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-700">{sale.tenant?.businessName}</td>
                          <td className="px-3 py-2.5 text-[12px] text-slate-600">{sale.cashier?.firstName} {sale.cashier?.lastName}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <PayIcon className="w-3.5 h-3.5" style={{ color: PAY_METHOD_COLOR[sale.paymentMethod] || '#64748B' }} />
                              <span className="text-[11px] font-bold text-slate-600">{sale.paymentMethod}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[13px] font-black text-slate-900 tabular-nums">{fmt(sale.totalAmount)}</td>
                          <td className="px-3 py-2.5 text-[12px] text-slate-500 tabular-nums">{fmt(sale.vatAmount)}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              {sale.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(sale.createdAt)}</td>
                          <td className="px-3 py-2.5">
                            {sale.status === 'COMPLETED' && (
                              <button onClick={() => setVoidModal({ id: sale.id, receipt: sale.receiptNumber, amount: sale.totalAmount, tenant: sale.tenant?.businessName })}
                                className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                <Ban className="w-3 h-3" /> Void
                              </button>
                            )}
                            {sale.status === 'VOIDED' && sale.voidReason && (
                              <span className="text-[10px] text-red-400 italic" title={sale.voidReason}>Voided</span>
                            )}
                          </td>
                        </tr>
                        {/* Expanded row — line items */}
                        {isExpanded && (
                          <tr key={`${sale.id}-detail`} className="bg-slate-50/50">
                            <td colSpan={10} className="px-8 py-3">
                              <div className="flex gap-8">
                                <div className="flex-1">
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Line Items</p>
                                  {(sale.lines || []).length > 0 ? (
                                    <div className="space-y-1">
                                      {sale.lines.map((line, li) => (
                                        <div key={li} className="flex justify-between text-[12px]">
                                          <span className="text-slate-700">{line.productName} × {parseFloat(line.quantity)}</span>
                                          <span className="font-bold text-slate-800 tabular-nums">{fmt(line.lineTotal)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : <p className="text-[11px] text-slate-400">No line items</p>}
                                </div>
                                <div className="w-48">
                                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Details</p>
                                  <div className="space-y-1 text-[12px]">
                                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="text-slate-800 font-semibold">{fmt(sale.subtotal)}</span></div>
                                    {parseFloat(sale.discountAmount || 0) > 0 && (
                                      <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-red-600 font-semibold">-{fmt(sale.discountAmount)}</span></div>
                                    )}
                                    <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="text-slate-800 font-semibold">{fmt(sale.vatAmount)}</span></div>
                                    <div className="flex justify-between border-t border-slate-200 pt-1 mt-1"><span className="text-slate-700 font-bold">Total</span><span className="text-slate-900 font-black">{fmt(sale.totalAmount)}</span></div>
                                    {sale.customerName && <div className="flex justify-between mt-2"><span className="text-slate-500">Customer</span><span className="text-slate-800">{sale.customerName}</span></div>}
                                    {sale.notes && <div className="mt-2 text-[11px] text-slate-500 italic">Note: {sale.notes}</div>}
                                    {sale.voidReason && <div className="mt-2 text-[11px] text-red-500 italic">Void reason: {sale.voidReason}</div>}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                  {!salesLoading && (salesData?.data || []).length === 0 && (
                    <tr><td colSpan={10} className="text-center py-16">
                      <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">No transactions found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {salesData?.pagination?.totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-500 bg-slate-50/50">
                <span>Page <strong className="text-slate-700">{page}</strong> of <strong className="text-slate-700">{salesData.pagination.totalPages}</strong> · {salesData.pagination.total} sales</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="page-btn">← Prev</button>
                  <button disabled={!salesData.pagination.hasMore} onClick={() => setPage(p => p + 1)} className="page-btn">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Void Sale Modal */}
      {voidModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setVoidModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Ban className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Void POS Sale</h3>
                <p className="text-[12px] text-slate-500">Receipt: {voidModal.receipt}</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-100">
              <p className="text-[13px] text-red-800"><strong>Amount:</strong> {fmt(voidModal.amount)}</p>
              <p className="text-[12px] text-red-600 mt-0.5">Tenant: {voidModal.tenant}</p>
            </div>
            <p className="text-[13px] text-slate-600">This will void the transaction. The sale amount will be reversed from reporting. This action cannot be undone.</p>
            <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Reason for voiding (required)…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none h-20" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setVoidModal(null)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => voidMutation.mutate({ saleId: voidModal.id, reason: voidReason })}
                disabled={!voidReason.trim() || voidMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                {voidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Void Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
