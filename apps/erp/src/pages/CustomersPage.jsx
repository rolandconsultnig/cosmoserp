import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';

function CustomerModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', phone: '', whatsapp: '', address: '', city: '', state: '', tin: '', creditLimit: 0, currency: 'NGN' });
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (d) => api.post('/customers', d), onSuccess: () => { qc.invalidateQueries(['customers']); onClose(); }, onError: (e) => setError(e.response?.data?.error || 'Failed') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Add Customer</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Full Name / Business Name *</label><input required value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={set('phone')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="080XXXXXXXX" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">WhatsApp Number</label><input value={form.whatsapp} onChange={set('whatsapp')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="234XXXXXXXXXX" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">TIN</label><input value={form.tin} onChange={set('tin')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">City</label><input value={form.city} onChange={set('city')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">State</label><input value={form.state} onChange={set('state')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Credit Limit (₦)</label><input type="number" value={form.creditLimit} onChange={set('creditLimit')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate({ ...form, creditLimit: parseFloat(form.creditLimit) })} disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Customer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => api.get('/customers', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const customers = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreate && <CustomerModal onClose={() => setShowCreate(false)} />}
      <div className="page-header">
        <div><h1 className="page-title">Customers</h1><p className="page-subtitle">Manage customer accounts and credit limits</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> Add Customer</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, email, phone…" className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-5 py-3 font-semibold">Email / Phone</th>
                <th className="text-left px-5 py-3 font-semibold">Location</th>
                <th className="text-left px-5 py-3 font-semibold">TIN</th>
                <th className="text-right px-5 py-3 font-semibold">Credit Limit</th>
                <th className="text-right px-5 py-3 font-semibold">Invoices</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (<tr key={i} className="border-b border-slate-50">{[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>))}
              {!isLoading && customers.length === 0 && (<tr><td colSpan={6} className="text-center py-12 text-slate-400">No customers found. <button onClick={() => setShowCreate(true)} className="text-blue-600">Add your first customer</button></td></tr>)}
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3"><div className="font-medium text-slate-900">{c.name}</div>{c.whatsapp && <div className="text-xs text-green-600">💬 WhatsApp</div>}</td>
                  <td className="px-5 py-3"><div className="text-slate-600">{c.email || '—'}</div><div className="text-slate-500 text-xs">{c.phone}</div></td>
                  <td className="px-5 py-3 text-slate-600">{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.tin || '—'}</td>
                  <td className="px-5 py-3 text-right font-medium">{c.creditLimit > 0 ? formatCurrency(c.creditLimit) : '—'}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{c._count?.invoices || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} customers</span>
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
