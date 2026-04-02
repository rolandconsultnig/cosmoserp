import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Loader2, FileText, Users, DollarSign, AlertCircle, CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';

function VendorBillModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    supplierId: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'NGN',
    notes: '',
    lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 0.075, whtRate: 0 }],
  });
  const [error, setError] = useState('');
  
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-bill'],
    queryFn: () => api.get('/suppliers', { params: { limit: 100 } }).then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (d) => api.post('/ap/vendor-bills', d),
    onSuccess: () => {
      qc.invalidateQueries(['vendor-bills']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => {
    setForm(f => {
      const newLines = [...f.lines];
      newLines[i] = { ...newLines[i], [k]: e.target.value };
      return { ...f, lines: newLines };
    });
  };

  const subtotal = form.lines.reduce((sum, l) => sum + (parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0)), 0);
  const vat = form.lines.reduce((sum, l) => sum + (parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0) * parseFloat(l.vatRate || 0)), 0);
  const wht = form.lines.reduce((sum, l) => sum + (parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0) * parseFloat(l.whtRate || 0)), 0);
  const total = subtotal + vat - wht;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Create Vendor Bill</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplier *</label>
            <select value={form.supplierId} onChange={set('supplierId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select supplier…</option>
              {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bill Number *</label>
            <input value={form.billNumber} onChange={set('billNumber')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="INV-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bill Date *</label>
            <input type="date" value={form.billDate} onChange={set('billDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
            <input type="date" value={form.dueDate} onChange={set('dueDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 mb-3">
          <h3 className="text-xs font-semibold text-slate-700 mb-2">Bill Items</h3>
          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 text-xs">
                <input value={line.description} onChange={setLine(i, 'description')} placeholder="Description" className="border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <input type="number" value={line.quantity} onChange={setLine(i, 'quantity')} placeholder="Qty" min="1" className="border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                <input type="number" value={line.unitPrice} onChange={setLine(i, 'unitPrice')} placeholder="Price" min="0" step="0.01" className="border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                <input type="number" value={line.vatRate} onChange={setLine(i, 'vatRate')} placeholder="VAT %" min="0" max="1" step="0.01" className="border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                <input type="number" value={line.whtRate} onChange={setLine(i, 'whtRate')} placeholder="WHT %" min="0" max="1" step="0.01" className="border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
              </div>
            ))}
          </div>
          <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { description: '', quantity: 1, unitPrice: 0, vatRate: 0.075, whtRate: 0 }] }))} className="mt-2 text-xs text-blue-600 hover:underline font-medium">+ Add Line</button>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">VAT:</span><span className="font-medium text-amber-600">+{formatCurrency(vat)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">WHT:</span><span className="font-medium text-red-600">−{formatCurrency(wht)}</span></div>
          <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-semibold">Total:</span><span className="font-bold text-blue-600">{formatCurrency(total)}</span></div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.supplierId || !form.billNumber || !form.dueDate} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Bill
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPayablePage() {
  const [tab, setTab] = useState('overview'); // overview, bills, vendors
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateBill, setShowCreateBill] = useState(false);

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['vendor-bills', page, search],
    queryFn: () => api.get('/ap/vendor-bills', { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: agingData } = useQuery({
    queryKey: ['ap-aging'],
    queryFn: () => api.get('/ap/aging').then((r) => r.data),
  });

  const bills = billsData?.data || [];
  const totalPages = Math.ceil((billsData?.total || 0) / 20);

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreateBill && <VendorBillModal onClose={() => setShowCreateBill(false)} />}
      
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts Payable</h1>
          <p className="page-subtitle">Manage vendor relationships, bills, and payments</p>
        </div>
        <button onClick={() => setShowCreateBill(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Vendor Bill
        </button>
      </div>

      {/* Quick Navigation to Payment Processing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/app/ap-payment-processing" className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 hover:shadow-md transition group cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 text-sm group-hover:text-blue-700">Payment Processing</h3>
              <p className="text-xs text-blue-700 mt-1">Record and execute payments</p>
            </div>
            <CreditCard className="w-5 h-5 text-blue-600 group-hover:scale-110 transition" />
          </div>
        </Link>
        
        <Link to="/app/ap-payment-approvals" className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 hover:shadow-md transition group cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-purple-900 text-sm group-hover:text-purple-700">Payment Approvals</h3>
              <p className="text-xs text-purple-700 mt-1">Multi-level approval workflow</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-purple-600 group-hover:scale-110 transition" />
          </div>
        </Link>
        
        <Link to="/app/ap-payment-schedules" className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4 hover:shadow-md transition group cursor-pointer">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-green-900 text-sm group-hover:text-green-700">Payment Schedules</h3>
              <p className="text-xs text-green-700 mt-1">Installments & early discounts</p>
            </div>
            <Calendar className="w-5 h-5 text-green-600 group-hover:scale-110 transition" />
          </div>
        </Link>
      </div>

      {/* tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: AlertCircle },
          { id: 'bills', label: 'Vendor Bills', icon: FileText },
          { id: 'vendors', label: 'Vendor Management', icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">OUTSTANDING PAYABLES</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(agingData?.data?.totalOutstanding || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">OVERDUE AMOUNT</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(agingData?.data?.overdue30Plus || 0)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">TOTAL BILLS</p>
                <p className="text-2xl font-bold text-slate-900">{billsData?.total || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* Vendor Bills Tab */}
      {tab === 'bills' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search bills…"
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-semibold">Bill Number</th>
                  <th className="text-left px-5 py-3 font-semibold">Supplier</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-5 py-3 font-semibold">Amount</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {billsLoading && [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))}
                {!billsLoading && bills.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">No vendor bills yet.</td></tr>
                )}
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{bill.billNumber}</td>
                    <td className="px-5 py-3 text-slate-600">{bill.supplier?.name}</td>
                    <td className="px-5 py-3 text-slate-600">{formatDate(bill.billDate)}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{formatCurrency(bill.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        bill.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' :
                        bill.status === 'POSTED' ? 'bg-blue-100 text-blue-700' :
                        bill.status === 'PAID' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">← Prev</button>
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Vendor Management Tab - redirect to Suppliers */}
      {tab === 'vendors' && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Vendor Management</h3>
          <p className="text-slate-600 mb-4">Manage your vendor profiles and relationships from the Suppliers section.</p>
          <a href="/suppliers" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Go to Suppliers →
          </a>
        </div>
      )}
    </div>
  );
}
