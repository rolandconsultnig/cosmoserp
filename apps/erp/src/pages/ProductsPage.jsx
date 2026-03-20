import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, Store, ToggleLeft, ToggleRight, Package } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, getStatusColor, cn } from '../lib/utils';

function CreateProductModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ sku: '', name: '', costPrice: '', sellingPrice: '', unit: 'piece', reorderPoint: 10, reorderQty: 50, barcode: '' });
  const [error, setError] = useState('');
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then((r) => r.data.data) });
  const [warehouseId, setWarehouseId] = useState('');
  const [initialStock, setInitialStock] = useState(0);

  const mutation = useMutation({
    mutationFn: (d) => api.post('/products', d),
    onSuccess: () => { qc.invalidateQueries(['products']); onClose(); },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Add New Product</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">SKU *</label><input required value={form.sku} onChange={set('sku')} className="input" placeholder="PRD-001" /></div>
          <div><label className="label">Unit</label>
            <select value={form.unit} onChange={set('unit')} className="input">
              {['piece','kg','litre','metre','box','carton','set'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Product Name *</label><input required value={form.name} onChange={set('name')} className="input" placeholder="e.g. Honda Generator 6.5KVA" /></div>
          <div><label className="label">Cost Price (₦) *</label><input type="number" required value={form.costPrice} onChange={set('costPrice')} className="input" placeholder="0.00" /></div>
          <div><label className="label">Selling Price (₦) *</label><input type="number" required value={form.sellingPrice} onChange={set('sellingPrice')} className="input" placeholder="0.00" /></div>
          <div><label className="label">Reorder Point</label><input type="number" value={form.reorderPoint} onChange={set('reorderPoint')} className="input" /></div>
          <div><label className="label">Reorder Qty</label><input type="number" value={form.reorderQty} onChange={set('reorderQty')} className="input" /></div>
          <div><label className="label">Barcode</label><input value={form.barcode} onChange={set('barcode')} className="input" placeholder="Scan or enter" /></div>
          <div>
            <label className="label">Initial Stock</label>
            <input type="number" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} className="input" min={0} />
          </div>
          <div className="col-span-2">
            <label className="label">Warehouse (for initial stock)</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="input">
              <option value="">— Select warehouse —</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate({ ...form, costPrice: parseFloat(form.costPrice), sellingPrice: parseFloat(form.sellingPrice), initialStock: parseInt(initialStock) || 0, warehouseId })}
            disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending ? 'Saving…' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustStockModal({ product, onClose }) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data),
  });

  const [form, setForm] = useState({ warehouseId: '', quantity: 0, type: 'ADJUSTMENT', notes: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload) => api.post(`/products/${product.id}/stock-adjust`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['products']);
      qc.invalidateQueries(['warehouses']);
      qc.invalidateQueries(['warehouse-stock']);
      qc.invalidateQueries(['stock-movements']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const canSubmit = form.warehouseId && Number.isFinite(parseInt(form.quantity, 10));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Adjust Stock</h2>
            <div className="text-xs text-slate-500 mt-0.5">{product.sku} — {product.name}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Warehouse *</label>
            <select value={form.warehouseId} onChange={set('warehouseId')} className="input">
              <option value="">— Select warehouse —</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={set('type')} className="input">
              {['ADJUSTMENT', 'IN', 'OUT', 'DAMAGE', 'RETURN'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Quantity *</label>
            <input type="number" value={form.quantity} onChange={set('quantity')} className="input" />
          </div>

          <div className="col-span-2">
            <label className="label">Notes</label>
            <input value={form.notes} onChange={set('notes')} className="input" placeholder="Reason / reference…" />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate({ ...form, quantity: parseInt(form.quantity, 10) })}
            disabled={mutation.isPending || !canSubmit}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving…' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, lowStock],
    queryFn: () => api.get('/products', { params: { page, limit: 20, search: search || undefined, lowStock: lowStock || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const marketplaceMutation = useMutation({
    mutationFn: ({ id, isMarketplace }) => api.post(`/products/${id}/marketplace`, { isMarketplace }),
    onSuccess: () => qc.invalidateQueries(['products']),
  });

  const products = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} />}
      {adjustProduct && <AdjustStockModal product={adjustProduct} onClose={() => setAdjustProduct(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Inventory</h1>
          <p className="page-subtitle">Track stock levels across all warehouses</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, SKU, barcode…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="rounded" />
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Low Stock Only
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Product</th>
                <th className="text-left px-5 py-3 font-semibold">SKU</th>
                <th className="text-right px-5 py-3 font-semibold">Cost Price</th>
                <th className="text-right px-5 py-3 font-semibold">Selling Price</th>
                <th className="text-right px-5 py-3 font-semibold">Total Stock</th>
                <th className="text-left px-5 py-3 font-semibold">Reorder Point</th>
                <th className="text-center px-5 py-3 font-semibold">Marketplace</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(8)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && products.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  No products found. <button onClick={() => setShowCreate(true)} className="text-blue-600">Add your first product</button>
                </td></tr>
              )}
              {products.map((p) => {
                const totalStock = (p.stockLevels || []).reduce((s, sl) => s + sl.quantity, 0);
                const isLow = totalStock <= p.reorderPoint;
                return (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.category && <div className="text-xs text-slate-400">{p.category.name}</div>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 text-right">{formatCurrency(p.costPrice)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn('font-semibold', isLow ? 'text-red-600' : 'text-slate-900')}>
                        {totalStock} {p.unit}
                      </span>
                      {isLow && <div className="text-xs text-red-500">⚠ Low stock</div>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{p.reorderPoint} {p.unit}</td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => marketplaceMutation.mutate({ id: p.id, isMarketplace: !p.isMarketplace })}
                        disabled={marketplaceMutation.isPending}
                        title={p.isMarketplace ? 'Remove from Cosmos Market' : 'Publish to Cosmos Market'}
                        className="transition"
                      >
                        {p.isMarketplace
                          ? <ToggleRight className="w-6 h-6 text-green-500 mx-auto" />
                          : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setAdjustProduct(p)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        title="Adjust stock"
                      >
                        <Package className="w-4 h-4" /> Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} products</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {data.pagination.totalPages}</span>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      <style>{`.label{display:block;font-size:.75rem;font-weight:500;color:#374151;margin-bottom:4px}.input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:.875rem;outline:none}.input:focus{box-shadow:0 0 0 2px #3b82f6;border-color:transparent}`}</style>
    </div>
  );
}
