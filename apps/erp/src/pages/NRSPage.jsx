import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, RefreshCw, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import api from '../lib/api';
import { formatDateTime, getStatusColor, cn } from '../lib/utils';

export default function NRSPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['nrs-logs', page, status],
    queryFn: () => api.get('/nrs/logs', { params: { page, limit: 20, status: status || undefined } }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['nrs-stats'],
    queryFn: () => api.get('/nrs/stats').then((r) => r.data.data),
  });

  const b2cMutation = useMutation({
    mutationFn: () => api.post('/nrs/b2c-report', { date: new Date(Date.now() - 86400000).toISOString() }),
    onSuccess: () => qc.invalidateQueries(['nrs-logs']),
  });

  const items = logs?.data || [];
  const statsMap = {};
  (stats?.stats || []).forEach((s) => { statsMap[s.status] = s._count; });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">NRS / Tax Compliance</h1>
          <p className="page-subtitle">Monitor NRS e-invoicing submissions and tax filings</p>
        </div>
        <button onClick={() => b2cMutation.mutate()} disabled={b2cMutation.isPending}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          {b2cMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Submit B2C T+1 Report
        </button>
      </div>

      {/* NRS stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Approved', key: 'SUCCESS', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', key: 'FAILED', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Pending', key: 'PENDING', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Pending Invoices', key: null, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(({ label, key, icon: Icon, color, bg }) => (
          <div key={label} className={cn('rounded-xl border p-4', bg, 'border-transparent')}>
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5', color)} />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
            <div className={cn('text-2xl font-bold mt-2', color)}>
              {key ? (statsMap[key] || 0) : (stats?.pendingSubmissions || 0)}
            </div>
          </div>
        ))}
      </div>

      {/* NRS info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">🛡️ How Mixtio ERP NRS Integration Works</div>
        <ul className="space-y-1 text-blue-700">
          <li>• <strong>B2B/B2G:</strong> Every invoice is submitted in real-time to obtain an IRN (Invoice Reference Number) and Cryptographic Stamp</li>
          <li>• <strong>B2C:</strong> Retail sales over ₦50,000 are reported automatically within 24 hours (T+1 rule)</li>
          <li>• <strong>UBL/XML:</strong> All invoices are formatted to PEPPOL/UBL 2.1 standards before submission</li>
          <li>• <strong>QR Code:</strong> Every approved invoice contains an NRS-issued QR code for instant verification</li>
        </ul>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Submissions</option>
          <option value="SUCCESS">Approved</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Invoice #</th>
                <th className="text-left px-5 py-3 font-semibold">Action</th>
                <th className="text-left px-5 py-3 font-semibold">IRN</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-right px-5 py-3 font-semibold">Duration</th>
                <th className="text-left px-5 py-3 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(6)].map((_, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No NRS submissions yet</td></tr>
              )}
              {items.map((log) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-blue-700">
                    {log.invoice?.invoiceNumber || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{log.action}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-700">{log.irn || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(log.status === 'SUCCESS' ? 'APPROVED' : log.status))}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 text-xs">
                    {log.durationMs ? `${log.durationMs}ms` : '—'}
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs?.pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-slate-600">
            <span>{logs.pagination.total} total submissions</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="px-3 py-1">Page {page} of {logs.pagination.totalPages}</span>
              <button disabled={!logs.pagination.hasMore} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
