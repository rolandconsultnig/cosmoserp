import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, WalletCards } from 'lucide-react';
import api from '../lib/api';
import { cn, formatCurrency, formatDateTime, getStatusColor } from '../lib/utils';

const KINDS = ['ALL', 'JOURNAL', 'INVOICE', 'PAYMENT', 'PAYROLL', 'PURCHASE_ORDER'];

export default function TransactionsHubPage() {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('ALL');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions-hub', q, kind, from, to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (kind !== 'ALL') params.set('kind', kind);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '500');
      return api.get(`/accounts/transactions-hub?${params.toString()}`).then((r) => r.data.data);
    },
  });

  const rows = data?.rows || [];
  const totals = data?.totalsByKind || {};

  const totalAmount = useMemo(
    () =>
      Object.values(totals).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [totals]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <WalletCards className="w-7 h-7 text-emerald-600" />
            Transactions hub
          </h1>
          <p className="page-subtitle">Unified ledger view across invoices, payments, journals, payroll, and purchase orders.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Reference, description, status..."
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {KINDS.map((k) => <option key={k} value={k}>{k === 'ALL' ? 'All' : k.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 flex items-center justify-between">
            <span>Total amount</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          {Object.entries(totals).slice(0, 4).map(([k, v]) => (
            <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <div className="text-[10px] text-slate-500">{k.replace('_', ' ')}</div>
              <div className="text-xs font-semibold text-slate-800">{formatCurrency(v)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading transactions...
          </div>
        ) : error ? (
          <div className="p-6 text-red-700">{error.response?.data?.error || error.message || 'Failed to load'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Reference</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">No transactions match filters.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(r.date)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{r.kind.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.reference}</td>
                    <td className="px-4 py-3 text-slate-600">{r.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(r.status))}>{r.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {r.amount === null ? '—' : formatCurrency(r.amount, r.currency || 'NGN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
