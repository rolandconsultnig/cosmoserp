import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import api from '../lib/api';

function SupplierModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', tin: '', currency: 'NGN', paymentTerms: 30 });
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (d) => api.post('/suppliers', d), onSuccess: () => { qc.invalidateQueries(['suppliers']); onClose(); }, onError: (e) => setError(e.response?.data?.error || 'Failed') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Add Supplier</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Supplier Name *</label><input required value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={set('phone')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">TIN</label><input value={form.tin} onChange={set('tin')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Payment Terms (days)</label><input type="number" value={form.paymentTerms} onChange={set('paymentTerms')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input value={form.city} onChange={set('city')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">State</label><input value={form.state} onChange={set('state')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate({ ...form, paymentTerms: parseInt(form.paymentTerms) })} disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Supplier
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => api.get('/suppliers', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const suppliers = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <SupplierModal onClose={() => setShowCreate(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Suppliers</h1><p className="page-subtitle">Manage supplier relationships and purchase orders</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> Add Supplier</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search suppliers…" className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
              <th className="text-left px-5 py-3 font-semibold">Supplier</th>
              <th className="text-left px-5 py-3 font-semibold">Contact</th>
              <th className="text-left px-5 py-3 font-semibold">Location</th>
              <th className="text-left px-5 py-3 font-semibold">TIN</th>
              <th className="text-right px-5 py-3 font-semibold">Payment Terms</th>
              <th className="text-right px-5 py-3 font-semibold">POs</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [...Array(5)].map((_, i) => (<tr key={i} className="border-b border-slate-50">{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>))}
            {!isLoading && suppliers.length === 0 && (<tr><td colSpan={6} className="text-center py-12 text-slate-400">No suppliers yet.</td></tr>)}
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                <td className="px-5 py-3"><div className="text-slate-600">{s.email || '—'}</div><div className="text-xs text-slate-400">{s.phone}</div></td>
                <td className="px-5 py-3 text-slate-600">{[s.city, s.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{s.tin || '—'}</td>
                <td className="px-5 py-3 text-right text-slate-600">{s.paymentTerms} days</td>
                <td className="px-5 py-3 text-right text-slate-500">{s._count?.purchaseOrders || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
