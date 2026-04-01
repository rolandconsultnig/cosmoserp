import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Loader2, AlertTriangle, Clock, Banknote, Package, TrendingUp, RefreshCw,
} from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

export default function LogisticsCompanyAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/company/dashboard');
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary || {};

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Dashboard &amp; analytics
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Real-time visibility, exceptions, spend, and SLA signals for your fleet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-white/10 text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-slate-400 py-12">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading metrics…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: 'Active shipments',
                value: s.activeDeliveries ?? 0,
                sub: 'Pickup / transit / out for delivery',
                icon: Package,
                color: '#6366F1',
                to: '/logistics/company/deliveries',
              },
              {
                title: 'Exceptions',
                value: (s.exceptionsFailedOrReturned ?? 0) + (s.exceptionsDelayedVsEta ?? 0),
                sub: `${s.exceptionsFailedOrReturned ?? 0} failed/returned · ${s.exceptionsDelayedVsEta ?? 0} past ETA (active)`,
                icon: AlertTriangle,
                color: '#F59E0B',
                to: '/logistics/company/deliveries',
              },
              {
                title: 'On-time delivery',
                value: s.onTimeDeliveryRatePct != null ? `${s.onTimeDeliveryRatePct}%` : '—',
                sub: s.onTimeSampleSize ? `From ${s.onTimeSampleSize} completed jobs w/ ETA` : 'Add expected dates on jobs for SLA',
                icon: TrendingUp,
                color: '#10B981',
              },
              {
                title: 'Delivery revenue (fees)',
                value: formatCurrency(s.totalDeliveryFees),
                sub: `${formatCurrency(s.totalAgentPayouts)} agent payouts (completed)`,
                icon: Banknote,
                color: '#FF8B00',
              },
            ].map(({ title, value, sub, icon: Icon, color, to }) => (
              <div
                key={title}
                className="rounded-xl border p-5 relative"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
              >
                {to && (
                  <Link to={to} className="absolute top-3 right-3 text-[10px] font-bold text-blue-400 hover:underline">
                    Open →
                  </Link>
                )}
                <Icon className="w-5 h-5 mb-2" style={{ color }} />
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{title}</p>
                <p className="text-2xl font-black text-white mt-1">{value}</p>
                <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl border p-5"
            style={{ background: 'rgba(0,82,204,0.06)', borderColor: 'rgba(0,82,204,0.15)' }}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Alerts &amp; notifications
            </div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>
              SMS and email to customers are sent when drivers update status through the Cosmos API. For operational follow-up,
              use <Link to="/logistics/company/deliveries" className="text-blue-400 font-semibold hover:underline">shipments</Link>
              {' '}and the exception counts on this page.
            </p>
          </div>

          <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Cost &amp; spend analytics</p>
            <p className="text-sm text-slate-300">
              Use delivery fee totals versus agent payouts as a quick margin view. Open{' '}
              <Link to="/logistics/company/billing" className="text-blue-400 font-semibold hover:underline">Billing</Link>
              {' '}for completed jobs, CSV export, and date filters. Combine with your ERP finance module for full invoicing.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
