import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

export default function QuotesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', page, status, search],
    queryFn: () => api.get('/quotes', { params: { page, limit: 20, status: status || undefined, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const quotes = data?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">Create and manage sales quotations</p>
        </div>
        <Link to="/quotes/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Quote
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search quote # or customer…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Quote #</th>
                <th className="text-left px-5 py-3 font-semibold">Customer</th>
                <th className="text-right px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Expiry</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && quotes.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">
                  No quotations yet. <Link to="/quotes/new" className="text-blue-600">Create your first quote</Link>
                </td></tr>
              )}
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-700">{q.quoteNumber}</td>
                  <td className="px-5 py-3 text-slate-700">{q.customer?.name}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatCurrency(q.totalAmount, q.currency)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(q.expiryDate)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(q.status))}>{q.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {q.status !== 'CONVERTED' && q.status !== 'CANCELLED' && (
                      <Link to={`/quotes/new?fromQuote=${q.id}`} className="text-xs text-blue-600 hover:underline font-medium">Convert →</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{data.pagination.total} quotes</span>
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
