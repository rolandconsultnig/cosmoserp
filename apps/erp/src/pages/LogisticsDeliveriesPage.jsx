import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Package, Search, MapPin, Clock, CheckCircle, Truck, Navigation,
  AlertTriangle, ChevronLeft, ChevronRight, X, Camera,
  Phone, RotateCcw, Loader2, ExternalLink,
} from 'lucide-react';
import {
  logisticsFetch, logisticsJson, absoluteUploadUrl, mapsSearchUrl, publicTrackingCustomerUrl,
} from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0);
}

const STATUS_CONFIG = {
  PENDING_PICKUP:   { label: 'Pending Pickup',   bg: '#FFF7E6', color: '#FF8B00', border: '#FFE0A3', icon: Clock },
  IN_TRANSIT:       { label: 'In Transit',        bg: '#EBF2FF', color: '#0052CC', border: '#A4CDFF', icon: Truck },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  bg: '#F3E8FF', color: '#5B21B6', border: '#DDD6FE', icon: Navigation },
  DELIVERED:        { label: 'Delivered',          bg: '#E3FCEF', color: '#00875A', border: '#ABF5D1', icon: CheckCircle },
  FAILED:           { label: 'Failed',             bg: '#FFEBE6', color: '#DE350B', border: '#FFC3B2', icon: AlertTriangle },
  RETURNED:         { label: 'Returned',           bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', icon: RotateCcw },
  CANCELLED:        { label: 'Cancelled',          bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1', icon: X },
};

const STATUS_FLOW = {
  PENDING_PICKUP: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
};

export default function LogisticsDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [podUploading, setPodUploading] = useState(false);
  const [listError, setListError] = useState('');
  const [actionError, setActionError] = useState('');
  const podInputRef = useRef(null);
  const limit = 20;

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await logisticsJson(`/logistics/agent/deliveries?${params}`);
      setDeliveries(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      setListError(e.message || 'Failed to load deliveries');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => { fetchDeliveries(); }, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchDeliveries, search]);

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    setUpdating(true);
    setActionError('');
    try {
      const body = { status: newStatus };
      if (newStatus === 'FAILED') body.failureReason = failReason || 'Customer unavailable';
      const data = await logisticsJson(`/logistics/agent/deliveries/${deliveryId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setDeliveries((prev) => prev.map((d) => d.id === deliveryId ? data.data : d));
      if (selected?.id === deliveryId) setSelected(data.data);
      setFailReason('');
    } catch (err) {
      setActionError(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected?.id) return;
    setPodUploading(true);
    setActionError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await logisticsFetch(`/logistics/agent/deliveries/${selected.id}/proof`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      const updated = json.data?.delivery;
      const pod = json.data?.proofOfDelivery;
      if (updated) {
        setDeliveries((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
        setSelected((s) => (s?.id === updated.id ? { ...s, ...updated } : s));
      } else if (pod) {
        setDeliveries((prev) => prev.map((d) => (d.id === selected.id ? { ...d, proofOfDelivery: pod } : d)));
        setSelected((s) => (s ? { ...s, proofOfDelivery: pod } : s));
      }
    } catch (err) {
      setActionError(err.message || 'Upload failed');
    } finally {
      setPodUploading(false);
      e.target.value = '';
    }
  };

  const totalPages = Math.ceil(total / limit);
  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'PENDING_PICKUP', label: 'Pending' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Del.' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="flex h-full">
      {/* Main list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 space-y-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {listError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 px-3 py-2 text-xs">{listError}</div>
          )}
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" /> My deliveries
            </h1>
            <span className="text-[12px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(0,82,204,0.12)', color: '#60A5FA' }}>
              {total} total
            </span>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map(({ value, label }) => {
              const active = statusFilter === value;
              const cfg = STATUS_CONFIG[value];
              return (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); setPage(1); }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={active
                    ? { background: '#0052CC', color: '#fff' }
                    : { background: cfg?.bg || 'rgba(255,255,255,0.06)', color: cfg?.color || 'rgba(255,255,255,0.45)', border: `1px solid ${cfg?.border || 'rgba(255,255,255,0.10)'}` }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking number, customer…"
              className="w-full py-2 pl-9 pr-3 rounded-xl text-[13px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
              <p className="text-[14px] font-bold" style={{ color: 'rgba(255,255,255,0.30)' }}>No deliveries found</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.20)' }}>
                {statusFilter ? 'Try a different filter' : 'Deliveries will appear once assigned to you'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {deliveries.map((del) => {
                const cfg = STATUS_CONFIG[del.status] || STATUS_CONFIG.PENDING_PICKUP;
                const Icon = cfg.icon;
                const isActive = selected?.id === del.id;
                return (
                  <button
                    key={del.id}
                    onClick={() => setSelected(del)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 transition-all hover:bg-white/[0.02]"
                    style={isActive ? { background: 'rgba(0,82,204,0.08)', borderLeft: '3px solid #0052CC' } : {}}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-white font-mono">{del.trackingNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {del.priority === 'EXPRESS' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">EXPRESS</span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        {del.customerName} · {del.deliveryAddress}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] font-bold tabular-nums" style={{ color: cfg.color }}>{formatCurrency(del.deliveryFee)}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.20)' }}>
                        {new Date(del.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-30 text-white"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold disabled:opacity-30 text-white"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-[380px] border-l overflow-y-auto flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white">Delivery details</h2>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 text-red-300 px-3 py-2 text-xs">{actionError}</div>
            )}

            {/* Tracking */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(0,82,204,0.08)', border: '1px solid rgba(0,82,204,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Tracking Number</p>
              <p className="text-lg font-black text-white font-mono">{selected.trackingNumber}</p>
              {(() => {
                const cfg = STATUS_CONFIG[selected.status] || STATUS_CONFIG.PENDING_PICKUP;
                return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold mt-2"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                    {cfg.label}
                  </span>
                );
              })()}
              {publicTrackingCustomerUrl(selected.trackingNumber) && (
                <a
                  href={publicTrackingCustomerUrl(selected.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:underline"
                >
                  Customer tracking page <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Customer info */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Customer</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}>
                    {selected.customerName?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white">{selected.customerName}</p>
                    {selected.customerPhone && (
                      <a href={`tel:${selected.customerPhone}`} className="text-[11px] text-blue-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{selected.customerPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Route</h3>
              {selected.pickupAddress && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: 'rgba(0,82,204,0.15)' }}>
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400">PICKUP</p>
                    <p className="text-[12px] text-white">{selected.pickupAddress}</p>
                    {mapsSearchUrl(selected.pickupAddress) && (
                      <a href={mapsSearchUrl(selected.pickupAddress)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-400 hover:underline mt-1 inline-flex items-center gap-0.5">
                        Open in Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0" style={{ background: 'rgba(0,135,90,0.15)' }}>
                  <MapPin className="w-3 h-3 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-400">DELIVERY</p>
                  <p className="text-[12px] text-white">{selected.deliveryAddress}</p>
                  {selected.city && <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>{selected.city}{selected.state ? `, ${selected.state}` : ''}</p>}
                  {mapsSearchUrl(selected.deliveryAddress) && (
                    <a href={mapsSearchUrl(selected.deliveryAddress)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-400 hover:underline mt-1 inline-flex items-center gap-0.5">
                      Open in Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Package info */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Package</h3>
              <div className="grid grid-cols-2 gap-2">
                {selected.packageDescription && (
                  <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Description</p>
                    <p className="text-[12px] text-white font-medium">{selected.packageDescription}</p>
                  </div>
                )}
                {selected.packageWeight && (
                  <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Weight</p>
                    <p className="text-[12px] text-white font-medium">{selected.packageWeight} kg</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financials */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between text-[12px] mb-2">
                <span style={{ color: 'rgba(255,255,255,0.40)' }}>Delivery Fee</span>
                <span className="text-white font-bold tabular-nums">{formatCurrency(selected.deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-[12px] mb-2">
                <span style={{ color: 'rgba(255,255,255,0.40)' }}>Platform Commission</span>
                <span style={{ color: 'rgba(255,255,255,0.50)' }}>-{formatCurrency(selected.platformCommission)}</span>
              </div>
              <div className="flex justify-between text-[13px] pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="font-bold text-blue-400">Your Payout</span>
                <span className="font-black text-blue-400 tabular-nums">{formatCurrency(selected.agentPayout)}</span>
              </div>
            </div>

            {/* Proof of delivery */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Proof of delivery</h3>
              <input
                ref={podInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={handleProofUpload}
              />
              {selected.proofOfDelivery ? (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
                  {/\.(jpe?g|png|gif|webp)(\?|$)/i.test(selected.proofOfDelivery) ? (
                    <a href={absoluteUploadUrl(selected.proofOfDelivery)} target="_blank" rel="noreferrer">
                      <img
                        src={absoluteUploadUrl(selected.proofOfDelivery)}
                        alt="Proof of delivery"
                        className="w-full max-h-48 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={absoluteUploadUrl(selected.proofOfDelivery)}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 text-[12px] font-bold text-blue-400 hover:underline"
                    >
                      View uploaded file (PDF)
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>No proof uploaded yet.</p>
              )}
              <button
                type="button"
                disabled={podUploading}
                onClick={() => podInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                {podUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {selected.proofOfDelivery ? 'Replace proof' : 'Upload photo / PDF'}
              </button>
            </div>

            {/* Status update actions */}
            {STATUS_FLOW[selected.status] && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Update Status</h3>
                {STATUS_FLOW[selected.status].map((nextStatus) => {
                  const cfg = STATUS_CONFIG[nextStatus];
                  const NextIcon = cfg.icon;
                  const isFail = nextStatus === 'FAILED';
                  return (
                    <div key={nextStatus}>
                      {isFail && (
                        <input
                          value={failReason}
                          onChange={(e) => setFailReason(e.target.value)}
                          placeholder="Reason for failure…"
                          className="w-full mb-2 py-2 px-3 rounded-lg text-[12px] text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      )}
                      <button
                        onClick={() => handleStatusUpdate(selected.id, nextStatus)}
                        disabled={updating}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-50"
                        style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.border}` }}
                      >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <NextIcon className="w-4 h-4" />}
                        {nextStatus === 'IN_TRANSIT' && 'Mark as In Transit'}
                        {nextStatus === 'OUT_FOR_DELIVERY' && 'Out for Delivery'}
                        {nextStatus === 'DELIVERED' && 'Mark as Delivered'}
                        {nextStatus === 'FAILED' && 'Mark as Failed'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notes */}
            {selected.notes && (
              <div className="space-y-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Notes</h3>
                <p className="text-[12px] text-white rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {selected.notes}
                </p>
              </div>
            )}

            {/* Failure reason */}
            {selected.status === 'FAILED' && selected.failureReason && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(222,53,11,0.08)', border: '1px solid rgba(222,53,11,0.15)' }}>
                <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Failure Reason</p>
                <p className="text-[12px] text-white">{selected.failureReason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
