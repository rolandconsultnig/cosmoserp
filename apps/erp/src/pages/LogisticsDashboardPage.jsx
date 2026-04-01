import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Truck, CheckCircle, Clock, MapPin, Banknote, Navigation, Loader2, RefreshCw, ExternalLink,
} from 'lucide-react';
import { logisticsJson, mapsSearchUrl, publicTrackingCustomerUrl } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0);
}

const STATUS_CONFIG = {
  PENDING_PICKUP:   { label: 'Pending Pickup',   bg: '#FFF7E6', color: '#FF8B00', border: '#FFE0A3' },
  IN_TRANSIT:       { label: 'In Transit',        bg: '#EBF2FF', color: '#0052CC', border: '#A4CDFF' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  bg: '#F3E8FF', color: '#5B21B6', border: '#DDD6FE' },
  DELIVERED:        { label: 'Delivered',          bg: '#E3FCEF', color: '#00875A', border: '#ABF5D1' },
  FAILED:           { label: 'Failed',             bg: '#FFEBE6', color: '#DE350B', border: '#FFC3B2' },
  RETURNED:         { label: 'Returned',           bg: '#F1F5F9', color: '#475569', border: '#CBD5E1' },
};

export default function LogisticsDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/agent/dashboard');
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const agent = (() => { try { return JSON.parse(localStorage.getItem('logistics_agent')); } catch { return null; } })();
  const d = data || {};
  const today = d.today || {};
  const month = d.month || {};
  const active = d.activeDeliveries || [];
  const recent = d.recentDeliveries || [];

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 rounded-lg w-64" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          {error}
          <button type="button" onClick={() => load()} className="text-xs font-bold text-white underline">Retry</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white">Delivery dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Welcome back, {agent?.firstName}. Here is your delivery overview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/logistics/deliveries')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)', boxShadow: '0 4px 16px rgba(0,82,204,0.30)' }}
          >
            <Package className="w-4 h-4" /> All deliveries
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Today's Deliveries", value: today.total || 0, sub: `${today.completed || 0} completed`, icon: Package, color: '#0052CC', highlight: true },
          { title: 'Active Right Now', value: active.length, sub: 'Pickups & in transit', icon: Navigation, color: '#6366F1', highlight: active.length > 0 },
          { title: 'Monthly Deliveries', value: month.total || 0, sub: `${month.completed || 0} completed`, icon: Truck, color: '#00875A' },
          { title: 'Total Earnings', value: formatCurrency(d.totalEarnings || 0), sub: 'Lifetime payout', icon: Banknote, color: '#FF8B00' },
        ].map(({ title, value, sub, icon: Icon, color, highlight }) => (
          <div
            key={title}
            className="rounded-xl border p-5 transition-all"
            style={{
              background: highlight ? `${color}08` : 'rgba(255,255,255,0.03)',
              borderColor: highlight ? `${color}25` : 'rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{title}</p>
                <p className={`text-2xl font-black mt-1 ${highlight ? '' : 'text-white'}`} style={highlight ? { color } : {}}>{value}</p>
                {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</p>}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active deliveries */}
      {active.length > 0 && (
        <div className="rounded-xl border" style={{ background: 'rgba(0,82,204,0.04)', borderColor: 'rgba(0,82,204,0.15)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(0,82,204,0.10)' }}>
            <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
            <h2 className="text-sm font-bold text-white">Active Deliveries</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400">{active.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {active.map((del) => {
              const cfg = STATUS_CONFIG[del.status] || STATUS_CONFIG.PENDING_PICKUP;
              return (
                <div key={del.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Package className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white font-mono">{del.trackingNumber}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      <MapPin className="w-3 h-3 inline mr-0.5" />{del.deliveryAddress}
                    </p>
                    {mapsSearchUrl(del.deliveryAddress) && (
                      <a
                        href={mapsSearchUrl(del.deliveryAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-400 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                      >
                        Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-bold text-blue-400">{del.customerName}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {formatCurrency(del.deliveryFee)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent deliveries */}
      <div className="rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white">Recent Deliveries</h2>
          <button onClick={() => navigate('/logistics/deliveries')} className="text-blue-400 text-[12px] font-bold hover:underline">
            View all →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center">
            <Truck className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No deliveries yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {recent.map((del) => {
              const cfg = STATUS_CONFIG[del.status] || STATUS_CONFIG.PENDING_PICKUP;
              return (
                <div key={del.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    {del.status === 'DELIVERED' ? <CheckCircle className="w-4 h-4" style={{ color: cfg.color }} /> : <Package className="w-4 h-4" style={{ color: cfg.color }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white font-mono">{del.trackingNumber}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {del.customerName} · {del.deliveryAddress}
                    </p>
                    {publicTrackingCustomerUrl(del.trackingNumber) && (
                      <a
                        href={publicTrackingCustomerUrl(del.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-sky-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        Customer track <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-bold text-blue-400 tabular-nums">{formatCurrency(del.agentPayout)}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {new Date(del.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
