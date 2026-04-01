import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
  Loader2,
  ShoppingCart,
  Send,
  FileText,
  PanelRightOpen,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

function lineTotals(po) {
  const lines = po?.lines || [];
  const ordered = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const received = lines.reduce((s, l) => s + (Number(l.receivedQty) || 0), 0);
  return { ordered, received };
}

function ReceiveGoodsModal({ po, onClose, onDone }) {
  const qc = useQueryClient();
  const [warehouseId, setWarehouseId] = useState('');
  const [qtyByLine, setQtyByLine] = useState({});
  const [error, setError] = useState('');

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => api.get('/warehouses', { params: { limit: 100 } }).then((r) => r.data.data || r.data),
  });

  const initQty = useMemo(() => {
    const m = {};
    (po.lines || []).forEach((l) => {
      const rem = Math.max(0, (l.quantity || 0) - (l.receivedQty || 0));
      m[l.id] = rem > 0 ? rem : 0;
    });
    return m;
  }, [po.lines]);

  useEffect(() => {
    setQtyByLine(initQty);
    setError('');
  }, [po.id, initQty]);

  useEffect(() => {
    setWarehouseId('');
  }, [po.id]);

  useEffect(() => {
    const list = warehouses || [];
    if (list.length === 1) setWarehouseId(list[0].id);
  }, [warehouses, po.id]);

  const mutation = useMutation({
    mutationFn: (body) => api.post(`/purchase-orders/${po.id}/receive`, body),
    onSuccess: () => {
      qc.invalidateQueries(['purchase-orders']);
      qc.invalidateQueries({ queryKey: ['ap-po-matching-candidates'] });
      onDone?.();
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Receipt failed'),
  });

  const setQty = (lineId, v) => {
    const line = (po.lines || []).find((l) => l.id === lineId);
    if (!line) return;
    const rem = Math.max(0, line.quantity - line.receivedQty);
    let n = parseInt(v, 10);
    if (Number.isNaN(n) || n < 0) n = 0;
    if (n > rem) n = rem;
    setQtyByLine((prev) => ({ ...prev, [lineId]: n }));
  };

  const submit = () => {
    setError('');
    if (!warehouseId) return setError('Select a warehouse');
    const receivedLines = (po.lines || [])
      .map((l) => ({ lineId: l.id, quantity: qtyByLine[l.id] ?? 0 }))
      .filter((r) => r.quantity > 0);
    if (!receivedLines.length) return setError('Enter quantity to receive on at least one line');
    mutation.mutate({ warehouseId, receivedLines });
  };

  const wh = warehouses || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Receive goods (GRN)</h2>
            <p className="text-xs text-slate-500 mt-1">
              {po.poNumber} — posts stock movements (PURCHASE_RECEIPT) and updates received quantities for AP matching.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Warehouse *</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select warehouse…</option>
            {wh.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-3 py-2 font-semibold">Item</th>
                <th className="text-right px-3 py-2 font-semibold">Ordered</th>
                <th className="text-right px-3 py-2 font-semibold">Already rec.</th>
                <th className="text-right px-3 py-2 font-semibold">Receive now</th>
              </tr>
            </thead>
            <tbody>
              {(po.lines || []).map((l) => {
                const rem = Math.max(0, l.quantity - l.receivedQty);
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{l.product?.name || l.description || '—'}</div>
                      {l.product?.sku && <div className="text-[11px] text-slate-400">{l.product.sku}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2 text-right">{l.receivedQty}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={rem}
                        disabled={rem === 0}
                        value={qtyByLine[l.id] ?? 0}
                        onChange={(e) => setQty(l.id, e.target.value)}
                        className="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right disabled:bg-slate-50"
                      />
                      <span className="text-[11px] text-slate-400 ml-1">max {rem}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm receipt
          </button>
        </div>
      </div>
    </div>
  );
}

function PoDetailModal({ poSummary, onClose }) {
  const { data: poResp } = useQuery({
    queryKey: ['purchase-order', poSummary.id],
    queryFn: () => api.get(`/purchase-orders/${poSummary.id}`).then((r) => r.data.data),
  });
  const { data: matchLines } = useQuery({
    queryKey: ['ap-po-matching-candidates', 'po', poSummary.id],
    queryFn: () => api.get('/ap/matching/po-lines', { params: { poId: poSummary.id } }).then((r) => r.data.data || []),
  });

  const po = poResp || poSummary;
  const byLineId = useMemo(() => {
    const m = {};
    (matchLines || []).forEach((c) => { m[c.poLineId] = c; });
    return m;
  }, [matchLines]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{po.poNumber}</h2>
            <p className="text-sm text-slate-600">{po.supplier?.name}</p>
            <p className="text-xs text-slate-500 mt-2">
              Receipts update inventory and <span className="font-medium">received quantities</span>; vendor bills in Finance (AP) use three-way matching against PO lines with received qty.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-3 py-2 font-semibold">Item</th>
                <th className="text-right px-3 py-2 font-semibold">Ordered</th>
                <th className="text-right px-3 py-2 font-semibold">Received</th>
                <th className="text-right px-3 py-2 font-semibold">Billed qty</th>
                <th className="text-right px-3 py-2 font-semibold">Available to invoice</th>
              </tr>
            </thead>
            <tbody>
              {(po.lines || []).map((l) => {
                const m = byLineId[l.id];
                return (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.product?.name || l.description}</div>
                    </td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2 text-right">{l.receivedQty}</td>
                    <td className="px-3 py-2 text-right">{m ? m.billedQty : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{m ? m.maxInvoiceableQty : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

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
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: e.target.value } : l)));
  const onProdSelect = (i, productId) => {
    const p = products?.find((pr) => pr.id === productId);
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, productId, description: p?.name || '', unitPrice: p?.costPrice || '' } : l)));
  };

  const total = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Create Purchase Order</h2><button type="button" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
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
                  <td className="px-2 py-1.5">{lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-slate-100">
            <button type="button" onClick={() => setLines((ls) => [...ls, { description: '', productId: '', quantity: 1, unitPrice: '' }])} className="text-xs text-blue-600 hover:underline font-medium">+ Add Line</button>
          </div>
        </div>
        <div className="text-right text-sm font-bold text-slate-900 mb-4">Total: {formatCurrency(total, form.currency)}</div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            onClick={() => mutation.mutate({ ...form, lines: lines.map((l) => ({ ...l, quantity: parseFloat(l.quantity), unitPrice: parseFloat(l.unitPrice) })) })}
            disabled={mutation.isPending || !form.supplierId}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
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
  const [receivePo, setReceivePo] = useState(null);
  const [detailPo, setDetailPo] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, status, search],
    queryFn: () => api.get('/purchase-orders', { params: { page, limit: 20, status: status || undefined, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status: next }) => api.put(`/purchase-orders/${id}/status`, { status: next }),
    onSuccess: () => qc.invalidateQueries(['purchase-orders']),
  });

  const pos = data?.data || [];

  const openApMatching = (po) => {
    const sid = po.supplier?.id || po.supplierId;
    navigate(`/finance?tab=ap&openMatched=1&poId=${encodeURIComponent(po.id)}&supplierId=${encodeURIComponent(sid || '')}`);
  };

  const canReceive = (po) => ['SENT', 'PARTIAL'].includes(po.status) && lineTotals(po).received < lineTotals(po).ordered;
  const hasReceiptForMatching = (po) => lineTotals(po).received > 0 && ['SENT', 'PARTIAL', 'RECEIVED'].includes(po.status);

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
      {receivePo && (
        <ReceiveGoodsModal
          po={receivePo}
          onClose={() => setReceivePo(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ['ap-po-matching-candidates'] })}
        />
      )}
      {detailPo && <PoDetailModal poSummary={detailPo} onClose={() => setDetailPo(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Send POs, record goods receipt (GRN), then match vendor bills in Finance → Accounts Payable</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> New PO</button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
        <strong className="text-slate-800">Workflow:</strong>{' '}
        Draft → Send to supplier → Receive goods into a warehouse (partial allowed) → Create matched vendor bill under Finance (3-way: PO, receipt, invoice).
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search PO number or supplier…" className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
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
                <th className="text-left px-5 py-3 font-semibold">Received</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (<tr key={i} className="border-b border-slate-50">{[...Array(7)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>))}
              {!isLoading && pos.length === 0 && (<tr><td colSpan={7} className="text-center py-12 text-slate-400">No purchase orders yet.</td></tr>)}
              {pos.map((po) => {
                const { ordered, received } = lineTotals(po);
                return (
                  <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setDetailPo(po)}
                        className="font-semibold text-blue-700 hover:underline text-left flex items-center gap-1"
                      >
                        {po.poNumber}
                        <PanelRightOpen className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{po.supplier?.name}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(po.totalAmount, po.currency)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(po.expectedDate) || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">
                      <span className="font-medium">{received}</span>
                      <span className="text-slate-400"> / {ordered}</span>
                      {ordered > 0 && (
                        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (received / ordered) * 100)}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3"><span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(po.status))}>{po.status}</span></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {po.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: po.id, status: 'SENT' })}
                            disabled={statusMutation.isPending}
                            className="text-xs text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Send
                          </button>
                        )}
                        {canReceive(po) && (
                          <button
                            type="button"
                            onClick={() => setReceivePo(po)}
                            className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" /> Receive
                          </button>
                        )}
                        {hasReceiptForMatching(po) && (
                          <button
                            type="button"
                            onClick={() => openApMatching(po)}
                            className="text-xs text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> AP match
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} purchase orders</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {data.pagination.totalPages}</span>
              <button type="button" disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
