import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Warehouse, Package, ArrowLeftRight, History } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate } from '../lib/utils';

function WarehouseModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', isDefault: false });
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (d) => api.post('/warehouses', d), onSuccess: () => { qc.invalidateQueries(['warehouses']); onClose(); }, onError: (e) => setError(e.response?.data?.error || 'Failed') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Add Warehouse</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input required value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Lagos Main" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Code *</label><input required value={form.code} onChange={set('code')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="LGS-MAIN" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input value={form.city} onChange={set('city')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">State</label><input value={form.state} onChange={set('state')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Address</label><input value={form.address} onChange={set('address')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700"><input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="rounded" /> Set as default warehouse</label>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Warehouse
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ warehouses, products, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '' });
  const [lines, setLines] = useState([{ productId: '', quantity: 1 }]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/warehouses/transfers', payload),
    onSuccess: () => {
      qc.invalidateQueries(['warehouses']);
      qc.invalidateQueries(['warehouse-stock']);
      qc.invalidateQueries(['stock-movements']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: k === 'quantity' ? e.target.value : e.target.value } : l)));

  const payload = useMemo(() => ({
    ...form,
    lines: (lines || []).map((l) => ({ productId: l.productId, quantity: parseInt(l.quantity, 10) || 0 })),
  }), [form, lines]);

  const canSubmit = payload.fromWarehouseId && payload.toWarehouseId && payload.fromWarehouseId !== payload.toWarehouseId
    && payload.lines.some((l) => l.productId && l.quantity > 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Stock Transfer</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From Warehouse *</label>
            <select value={form.fromWarehouseId} onChange={set('fromWarehouseId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select —</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To Warehouse *</label>
            <select value={form.toWarehouseId} onChange={set('toWarehouseId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select —</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={set('notes')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left px-3 py-2 font-semibold">Product</th><th className="text-right px-3 py-2 font-semibold">Qty</th><th className="w-8" /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <select value={l.productId} onChange={setLine(i, 'productId')} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Select product…</option>
                      {(products || []).map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" min="1" step="1" value={l.quantity} onChange={setLine(i, 'quantity')} className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </td>
                  <td className="px-2 py-1.5">
                    {lines.length > 1 && (
                      <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => setLines((ls) => [...ls, { productId: '', quantity: 1 }])} className="text-xs text-blue-600 hover:underline font-medium">+ Add Line</button>
            <div className="text-xs text-slate-400">Transfers update both warehouses and create ledger entries</div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate(payload)}
            disabled={mutation.isPending || !canSubmit}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Transfer Stock
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WarehousesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedWh, setSelectedWh] = useState(null);
  const [tab, setTab] = useState('stock');

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ['products', 1, '', false],
    queryFn: () => api.get('/products', { params: { page: 1, limit: 500 } }).then((r) => r.data.data),
  });

  const { data: stock } = useQuery({
    queryKey: ['warehouse-stock', selectedWh],
    queryFn: () => api.get(`/warehouses/${selectedWh}/stock`, { params: { limit: 50 } }).then((r) => r.data),
    enabled: !!selectedWh,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['stock-movements', selectedWh],
    queryFn: () => api.get('/warehouses/stock-movements', { params: { warehouseId: selectedWh || undefined, limit: 50 } }).then((r) => r.data),
    enabled: tab === 'ledger',
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <WarehouseModal onClose={() => setShowCreate(false)} />}
      {showTransfer && <TransferModal warehouses={warehouses} products={products} onClose={() => setShowTransfer(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Warehouses</h1><p className="page-subtitle">Manage multi-location inventory</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(true)} className="border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Transfer</button>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> Add Warehouse</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
        {(warehouses || []).map((wh) => (
          <button key={wh.id} onClick={() => setSelectedWh(wh.id === selectedWh ? null : wh.id)}
            className={`text-left bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${selectedWh === wh.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-blue-600" />
              </div>
              {wh.isDefault && <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Default</span>}
            </div>
            <div className="mt-3">
              <div className="font-semibold text-slate-900">{wh.name}</div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">{wh.code}</div>
              <div className="text-xs text-slate-500 mt-1">{[wh.city, wh.state].filter(Boolean).join(', ')}</div>
              <div className="text-xs text-blue-600 mt-2 font-medium">{wh._count?.stockLevels || 0} product lines</div>
            </div>
          </button>
        ))}
      </div>

      {selectedWh && stock && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              {tab === 'stock' ? <Package className="w-4 h-4 text-blue-600" /> : <History className="w-4 h-4 text-blue-600" />}
              {tab === 'stock' ? 'Stock Levels' : 'Stock Ledger'} — {warehouses?.find((w) => w.id === selectedWh)?.name}
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {['stock', 'ledger'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
                  {t === 'stock' ? 'Stock' : 'Ledger'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {tab === 'stock' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                    <th className="text-left px-5 py-2 font-semibold">SKU</th>
                    <th className="text-left px-5 py-2 font-semibold">Product</th>
                    <th className="text-right px-5 py-2 font-semibold">Quantity</th>
                    <th className="text-right px-5 py-2 font-semibold">Reorder Point</th>
                    <th className="text-left px-5 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(stock.data || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No stock in this warehouse</td></tr>}
                  {(stock.data || []).map((sl) => {
                    const isLow = sl.quantity <= (sl.product?.reorderPoint || 0);
                    return (
                      <tr key={sl.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{sl.product?.sku}</td>
                        <td className="px-5 py-2.5 font-medium text-slate-900">{sl.product?.name}</td>
                        <td className="px-5 py-2.5 text-right font-semibold">{sl.quantity} {sl.product?.unit}</td>
                        <td className="px-5 py-2.5 text-right text-slate-500">{sl.product?.reorderPoint}</td>
                        <td className="px-5 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sl.quantity === 0 ? 'bg-red-100 text-red-700' : isLow ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {sl.quantity === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                    <th className="text-left px-5 py-2 font-semibold">Date</th>
                    <th className="text-left px-5 py-2 font-semibold">Product</th>
                    <th className="text-left px-5 py-2 font-semibold">Type</th>
                    <th className="text-left px-5 py-2 font-semibold">Ref</th>
                    <th className="text-right px-5 py-2 font-semibold">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLoading && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading…</td></tr>}
                  {!ledgerLoading && (ledger?.data || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No stock movements yet</td></tr>}
                  {!ledgerLoading && (ledger?.data || []).map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-2.5 text-slate-500">{formatDate(m.createdAt)}</td>
                      <td className="px-5 py-2.5 font-medium text-slate-900">{m.product?.sku} — {m.product?.name}</td>
                      <td className="px-5 py-2.5 text-slate-500">{m.type}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{m.reference || '—'}</td>
                      <td className={cn('px-5 py-2.5 text-right font-semibold', m.quantity < 0 ? 'text-red-600' : 'text-green-700')}>{m.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
