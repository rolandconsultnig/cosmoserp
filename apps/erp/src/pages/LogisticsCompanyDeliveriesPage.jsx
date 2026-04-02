import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, MapPin, Truck, Loader2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { logisticsJson, mapsSearchUrl } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_PICKUP', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for del.' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

const STATUS_STYLES = {
  PENDING_PICKUP: { bg: '#FFF7E6', color: '#FF8B00' },
  IN_TRANSIT: { bg: '#EBF2FF', color: '#0052CC' },
  OUT_FOR_DELIVERY: { bg: '#F3E8FF', color: '#5B21B6' },
  DELIVERED: { bg: '#E3FCEF', color: '#00875A' },
  FAILED: { bg: '#FFEBE6', color: '#DE350B' },
  RETURNED: { bg: '#F1F5F9', color: '#475569' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B' },
};

export default function LogisticsCompanyDeliveriesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      if (kindFilter) params.set('kind', kindFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await logisticsJson(`/logistics/company/deliveries?${params}`);
      setRows(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e.message || 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, kindFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 space-y-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Shipment management
          </h1>
          <div className="flex flex-wrap gap-3">
            <Link to="/logistics/company/schedule" className="text-[12px] font-bold text-blue-400 hover:underline">
              + Schedule
            </Link>
            <Link to="/logistics/company" className="text-[12px] font-bold text-blue-400 hover:underline">
              ← Overview
            </Link>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Track live status (in transit, delivered, delayed vs ETA), tracking numbers, and carrier updates. Read-only for companies — drivers update from the agent portal.
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={statusFilter === value
                ? { background: '#0052CC', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-slate-600 px-1">|</span>
          {[
            { value: '', label: 'All kinds' },
            { value: 'STANDARD', label: 'Forward' },
            { value: 'RETURN', label: 'Returns' },
          ].map(({ value, label }) => (
            <button
              key={value || 'kind-all'}
              type="button"
              onClick={() => { setKindFilter(value); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
              style={kindFilter === value
                ? { background: '#6366F1', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tracking, customer, order ref…"
            className="w-full py-2 pl-9 pr-3 rounded-xl text-[13px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>
        )}
        {loading ? (
          <div className="p-8 flex justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
            <p className="text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.30)' }}>No deliveries match</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {rows.map((del) => {
              const st = STATUS_STYLES[del.status] || STATUS_STYLES.PENDING_PICKUP;
              const agentLabel = del.agent ? `${del.agent.firstName} ${del.agent.lastName}` : '—';
              const maps = mapsSearchUrl(del.deliveryAddress);
              return (
                <li key={del.id} className="px-5 py-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span className="text-[12px] font-mono font-bold text-white">{del.trackingNumber}</span>
                      {del.deliveryKind === 'RETURN' && (
                        <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                          Return
                        </span>
                      )}
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>
                        {del.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-emerald-400 tabular-nums">{formatCurrency(del.deliveryFee)}</span>
                  </div>
                  <p className="text-[12px] text-white font-medium">{del.customerName}</p>
                  {del.customerPhone && (
                    <a href={`tel:${del.customerPhone}`} className="text-[11px] text-blue-400 flex items-center gap-1 w-fit">
                      <Phone className="w-3 h-3" /> {del.customerPhone}
                    </a>
                  )}
                  <p className="text-[11px] flex items-start gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {del.deliveryAddress}
                  </p>
                  {maps && (
                    <a
                      href={maps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] font-bold text-blue-400 hover:underline"
                    >
                      Open in Maps
                    </a>
                  )}
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Driver: {agentLabel}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg text-white disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-white disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
