import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Loader2, Download } from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LogisticsCompanyBillingPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ deliveryFees: 0, agentPayouts: 0, platformCommission: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());
      const res = await logisticsJson(`/logistics/company/billing?${params}`);
      setRows(res.data || []);
      setTotal(res.total || 0);
      setSummary(res.summary || { deliveryFees: 0, agentPayouts: 0, platformCommission: 0 });
    } catch (e) {
      setError(e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const downloadCsv = () => {
    const headers = ['trackingNumber', 'customerName', 'deliveredAt', 'deliveryFee', 'agentPayout', 'platformCommission', 'kind', 'driver'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      const driver = r.agent ? `${r.agent.firstName} ${r.agent.lastName}`.replace(/,/g, ' ') : '';
      lines.push([
        r.trackingNumber,
        `"${(r.customerName || '').replace(/"/g, '""')}"`,
        r.deliveredAt || '',
        r.deliveryFee,
        r.agentPayout,
        r.platformCommission,
        r.deliveryKind || 'STANDARD',
        `"${driver}"`,
      ].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics-billing-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 space-y-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Billing
          </h1>
          <Link to="/logistics/company" className="text-[12px] font-bold text-blue-400 hover:underline">
            Overview
          </Link>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Totals and line items for completed deliveries (fees, driver payouts, and platform commission). Filter by delivered date, then export the current page as CSV.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="mt-1 py-2 px-2 rounded-lg text-[12px] text-white" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="mt-1 py-2 px-2 rounded-lg text-[12px] text-white" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!rows.length}
            className="py-2 px-3 rounded-lg text-[12px] font-bold text-white flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <Download className="w-3.5 h-3.5" /> CSV (this page)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Delivery fees (filtered)', value: summary.deliveryFees },
            { label: 'Driver payouts', value: summary.agentPayouts },
            { label: 'Platform commission', value: summary.platformCommission },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border p-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
              <p className="text-lg font-black text-white tabular-nums mt-1">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}
        {loading ? (
          <div className="flex gap-2 justify-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No completed deliveries in this range.
          </p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b text-slate-500 uppercase text-[10px] font-bold" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                  <th className="px-3 py-2">Tracking</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Delivered</th>
                  <th className="px-3 py-2 text-right">Fee</th>
                  <th className="px-3 py-2 text-right">Payout</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-200">
                    <td className="px-3 py-2 font-mono text-white">{r.trackingNumber}</td>
                    <td className="px-3 py-2">{r.customerName}</td>
                    <td className="px-3 py-2 text-slate-400">{formatDate(r.deliveredAt)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{formatCurrency(r.deliveryFee)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.agentPayout)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatCurrency(r.platformCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span>Page {page} / {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.06)' }}>Prev</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.06)' }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
