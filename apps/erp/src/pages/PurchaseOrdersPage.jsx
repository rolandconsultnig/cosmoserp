import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2, ShoppingCart, CheckCircle, Package, FileText, GitCompare } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

function CreatePOModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', currency: 'NGN', notes: '' });
  const [lines, setLines] = useState([{ description: '', productId: '', quantity: 1, unitPrice: '' }]);
  const [error, setError] = useState('');

  const { data: suppliers } = useQuery({ queryKey: ['suppliers-all'], queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then((r) => r.data.data) });
  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.get('/products', { params: { limit: 200 } }).then((r) => r.data.data) });

  const mutation = useMutation({
    mutationFn: (d) => api.post('/purchase-orders', d),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); onClose(); },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target.value } : l));
  const onProdSelect = (i, productId) => {
    const p = products?.find((p) => p.id === productId);
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, productId, description: p?.name || '', unitPrice: p?.costPrice || '' } : l));
  };

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Create Purchase Order</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplier *</label>
            <select required value={form.supplierId} onChange={set('supplierId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select supplier…</option>
              {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Expected Delivery</label>
            <input type="date" value={form.expectedDate} onChange={set('expectedDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Currency</label>
            <select value={form.currency} onChange={set('currency')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="NGN">NGN</option><option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left px-3 py-2 font-semibold">Description</th><th className="text-left px-3 py-2 font-semibold">Product</th><th className="text-right px-3 py-2 font-semibold">Qty</th><th className="text-right px-3 py-2 font-semibold">Unit Cost</th><th className="w-8" /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><input value={l.description} onChange={setLine(i, 'description')} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1.5"><select value={l.productId} onChange={(e) => onProdSelect(i, e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">— Select —</option>{(products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                  <td className="px-2 py-1.5"><input type="number" min="1" value={l.quantity} onChange={setLine(i, 'quantity')} className="w-16 border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={l.unitPrice} onChange={setLine(i, 'unitPrice')} className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1.5">{lines.length > 1 && <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-slate-100">
            <button onClick={() => setLines((ls) => [...ls, { description: '', productId: '', quantity: 1, unitPrice: '' }])} className="text-xs text-blue-600 hover:underline font-medium">+ Add Line</button>
          </div>
        </div>
        <div className="text-right text-sm font-bold text-slate-900 mb-4">Total: {formatCurrency(total, form.currency)}</div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate({ ...form, lines: lines.map((l) => ({ ...l, quantity: parseFloat(l.quantity), unitPrice: parseFloat(l.unitPrice) })) })}
            disabled={mutation.isPending || !form.supplierId} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create PO
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, status, search],
    queryFn: () => api.get('/purchase-orders', { params: { page, limit: 20, status: status || undefined, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/purchase-orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries(['purchase-orders']),
  });

  const pos = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Purchase Orders</h1><p className="page-subtitle">Manage supplier purchase orders and goods receipt</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> New PO</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search PO number or supplier…" className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['DRAFT','SENT','APPROVED','RECEIVED','CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">PO #</th>
                <th className="text-left px-5 py-3 font-semibold">Supplier</th>
                <th className="text-right px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Expected</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (<tr key={i} className="border-b border-slate-50">{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>))}
              {!isLoading && pos.length === 0 && (<tr><td colSpan={6} className="text-center py-12 text-slate-400">No purchase orders yet.</td></tr>)}
              {pos.map((po) => (
                <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-700">{po.poNumber}</td>
                  <td className="px-5 py-3 text-slate-700">{po.supplier?.name}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatCurrency(po.totalAmount, po.currency)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(po.expectedDate) || '—'}</td>
                  <td className="px-5 py-3"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(po.status))}>{po.status}</span></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/purchase-orders/${po.id}/grns`)}
                        title="Manage GRNs"
                        className="text-xs text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                      >
                        <Package className="w-3 h-3" /> GRN
                      </button>
                      <button
                        onClick={() => navigate(`/purchase-orders/${po.id}/amendments`)}
                        title="Track amendments"
                        className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Amend
                      </button>
                      <button
                        onClick={() => navigate(`/purchase-orders/${po.id}/matching`)}
                        title="View matching"
                        className="text-xs text-cyan-600 border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                      >
                        <GitCompare className="w-3 h-3" /> Match
                      </button>
                      {po.status === 'DRAFT' && (
                        <button onClick={() => approveMutation.mutate({ id: po.id, status: 'APPROVED' })} disabled={approveMutation.isPending}
                          className="text-xs text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {po.status === 'APPROVED' && (
                        <button onClick={() => approveMutation.mutate({ id: po.id, status: 'RECEIVED' })} disabled={approveMutation.isPending}
                          className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" /> Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} purchase orders</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {data.pagination.totalPages}</span>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
