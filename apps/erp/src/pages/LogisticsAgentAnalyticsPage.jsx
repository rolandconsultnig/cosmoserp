import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Loader2, Package, Navigation, Banknote, RefreshCw, TrendingUp } from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

export default function LogisticsAgentAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/agent/dashboard');
      setData(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const d = data || {};
  const today = d.today || {};
  const month = d.month || {};
  const active = d.activeDeliveries || [];

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Performance &amp; analytics
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Your workload, earnings snapshot, and transit activity. Deeper scorecards roll up to your company admin.
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

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-slate-400 py-12">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Today', value: today.total ?? 0, sub: `${today.completed ?? 0} completed`, icon: Package, color: '#0052CC' },
              { title: 'Active now', value: active.length, sub: 'Assigned to you', icon: Navigation, color: '#6366F1' },
              { title: 'This month', value: month.total ?? 0, sub: `${month.completed ?? 0} completed`, icon: TrendingUp, color: '#00875A' },
              { title: 'Lifetime payout', value: formatCurrency(d.totalEarnings), sub: 'Delivered jobs', icon: Banknote, color: '#FF8B00' },
            ].map(({ title, value, sub, icon: Icon, color }) => (
              <div key={title} className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
                <Icon className="w-5 h-5 mb-2" style={{ color }} />
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
                <p className="text-2xl font-black text-white mt-1">{value}</p>
                <p className="text-[11px] mt-1 text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            On-time performance in the company portal is based on completed jobs with an expected delivery date.{' '}
            <Link to="/logistics/deliveries" className="text-blue-400 font-semibold hover:underline">Update statuses</Link>
            {' '}to keep customer tracking accurate.
          </p>
        </>
      )}
    </div>
  );
}
