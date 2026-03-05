import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Warehouse, Package } from 'lucide-react';
import api from '../lib/api';

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

export default function WarehousesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWh, setSelectedWh] = useState(null);

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/warehouses').then((r) => r.data.data),
  });

  const { data: stock } = useQuery({
    queryKey: ['warehouse-stock', selectedWh],
    queryFn: () => api.get(`/warehouses/${selectedWh}/stock`, { params: { limit: 50 } }).then((r) => r.data),
    enabled: !!selectedWh,
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <WarehouseModal onClose={() => setShowCreate(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Warehouses</h1><p className="page-subtitle">Manage multi-location inventory</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> Add Warehouse</button>
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
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Stock Levels — {warehouses?.find((w) => w.id === selectedWh)?.name}
          </div>
          <div className="overflow-x-auto">
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
          </div>
        </div>
      )}
    </div>
  );
}
