import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Download, Send, MessageCircle, Shield, RefreshCw, Eye } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, status, search],
    queryFn: () => api.get('/invoices', { params: { page, limit: 20, status: status || undefined, search: search || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const nrsMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/nrs-submit`),
    onSuccess: () => qc.invalidateQueries(['invoices']),
  });

  const whatsappMutation = useMutation({
    mutationFn: (id) => api.post(`/invoices/${id}/whatsapp`),
  });

  const invoices = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage and track all your invoices</p>
        </div>
        <Link to="/invoices/new" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search invoice # or customer…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {['DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Invoice #</th>
                <th className="text-left px-5 py-3 font-semibold">Customer</th>
                <th className="text-left px-5 py-3 font-semibold">Amount</th>
                <th className="text-left px-5 py-3 font-semibold">Due Date</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">NRS Status</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(7)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              )}
              {!isLoading && invoices.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  No invoices found. <Link to="/invoices/new" className="text-blue-600">Create your first invoice</Link>
                </td></tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-blue-700">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3 text-slate-700">{inv.customer?.name}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold">{formatCurrency(inv.totalAmount, inv.currency)}</div>
                    {parseFloat(inv.amountDue) > 0 && parseFloat(inv.amountDue) < parseFloat(inv.totalAmount) && (
                      <div className="text-xs text-orange-500">Due: {formatCurrency(inv.amountDue)}</div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(inv.status))}>{inv.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(inv.nrsStatus))}>
                      {inv.nrsStatus === 'APPROVED' ? '✓ IRN Issued' : inv.nrsStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {inv.nrsStatus !== 'APPROVED' && inv.status !== 'DRAFT' && (
                        <button onClick={() => nrsMutation.mutate(inv.id)} disabled={nrsMutation.isPending}
                          className="p-1.5 rounded-md text-slate-400 hover:text-green-700 hover:bg-green-50 transition" title="Submit to NRS">
                          <Shield className={cn('w-3.5 h-3.5', nrsMutation.isPending && 'animate-spin')} />
                        </button>
                      )}
                      {inv.customer?.whatsapp && (
                        <button onClick={() => whatsappMutation.mutate(inv.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-50 transition" title="Send via WhatsApp">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{pagination.total} total invoices</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {pagination.totalPages}</span>
              <button disabled={!pagination.hasMore} onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
