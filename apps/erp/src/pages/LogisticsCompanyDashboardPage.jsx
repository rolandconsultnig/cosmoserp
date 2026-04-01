import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, Package, Truck, CheckCircle, Banknote, Users, Loader2, MapPin, ChevronRight,
  AlertTriangle, BarChart3, Clock,
} from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

function formatCurrency(v) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(Number(v) || 0);
}

const STATUS_STYLES = {
  PENDING_PICKUP: { bg: '#FFF7E6', color: '#FF8B00', label: 'Pending pickup' },
  IN_TRANSIT: { bg: '#EBF2FF', color: '#0052CC', label: 'In transit' },
  OUT_FOR_DELIVERY: { bg: '#F3E8FF', color: '#5B21B6', label: 'Out for delivery' },
  DELIVERED: { bg: '#E3FCEF', color: '#00875A', label: 'Delivered' },
  FAILED: { bg: '#FFEBE6', color: '#DE350B', label: 'Failed' },
  RETURNED: { bg: '#F1F5F9', color: '#475569', label: 'Returned' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
};

export default function LogisticsCompanyDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await logisticsJson('/logistics/company/dashboard');
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" /> Loading fleet overview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-md">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>
        <button
          type="button"
          onClick={() => navigate('/logistics-login')}
          className="mt-4 text-blue-400 text-sm font-bold hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const s = data?.summary || {};
  const recent = data?.recentDeliveries || [];
  const company = (() => { try { return JSON.parse(localStorage.getItem('logistics_company')); } catch { return null; } })();

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-400" />
            Company overview
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {company?.name || 'Your logistics company'} — all deliveries assigned to your fleet
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/logistics/company/schedule"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-slate-100 hover:bg-white/5"
          >
            <Clock className="w-4 h-4" /> Schedule
          </Link>
          <Link
            to="/logistics/company/analytics"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-slate-100 hover:bg-white/5"
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </Link>
          <Link
            to="/logistics/company/deliveries"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}
          >
            Shipments <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Active jobs', value: s.activeDeliveries ?? 0, sub: 'Pickup / transit / out', icon: Truck, color: '#6366F1' },
          { title: 'Total jobs', value: s.totalDeliveries ?? 0, sub: 'All time', icon: Package, color: '#0052CC' },
          { title: 'Delivered (month)', value: s.deliveredMonth ?? 0, sub: `Today: ${s.deliveredToday ?? 0}`, icon: CheckCircle, color: '#00875A' },
          { title: 'Agent payouts (del.)', value: formatCurrency(s.totalAgentPayouts), sub: 'Completed drops', icon: Banknote, color: '#FF8B00' },
        ].map(({ title, value, sub, icon: Icon, color }) => (
          <div
            key={title}
            className="rounded-xl border p-5"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{title}</p>
                <p className="text-2xl font-black mt-1 text-white">{value}</p>
                {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</p>}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: 'Exceptions',
            value: (s.exceptionsFailedOrReturned ?? 0) + (s.exceptionsDelayedVsEta ?? 0),
            sub: `${s.exceptionsFailedOrReturned ?? 0} failed/returned · ${s.exceptionsDelayedVsEta ?? 0} active past ETA`,
            icon: AlertTriangle,
            color: '#F59E0B',
            to: '/logistics/company/deliveries',
          },
          {
            title: 'On-time (SLA sample)',
            value: s.onTimeDeliveryRatePct != null ? `${s.onTimeDeliveryRatePct}%` : '—',
            sub: s.onTimeSampleSize ? `${s.onTimeSampleSize} completed w/ expected date` : 'Set expected delivery on jobs',
            icon: Clock,
            color: '#10B981',
            to: '/logistics/company/analytics',
          },
          {
            title: 'Gross fees (completed)',
            value: formatCurrency(s.totalDeliveryFees),
            sub: 'Spend / revenue view — see analytics',
            icon: Banknote,
            color: '#6366F1',
            to: '/logistics/company/analytics',
          },
        ].map(({ title, value, sub, icon: Icon, color, to }) => (
          <Link
            key={title}
            to={to}
            className="rounded-xl border p-4 block hover:border-blue-500/30 transition-colors"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <Icon className="w-5 h-5 mb-2" style={{ color }} />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
            <p className="text-xl font-black text-white mt-0.5">{value}</p>
            <p className="text-[11px] mt-1 text-slate-500">{sub}</p>
          </Link>
        ))}
      </div>

      <div
        className="rounded-xl border px-5 py-4 flex items-center gap-3"
        style={{ background: 'rgba(0,82,204,0.06)', borderColor: 'rgba(0,82,204,0.15)' }}
      >
        <Users className="w-5 h-5 text-blue-400" />
        <div>
          <p className="text-sm font-bold text-white">Drivers on roster</p>
          <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {s.rosterAgents ?? 0} registered agents under this company. Assignments are managed from the platform admin and seller requests.
          </p>
        </div>
      </div>

      <div className="rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white">Recent deliveries</h2>
          <Link to="/logistics/company/deliveries" className="text-blue-400 text-[12px] font-bold hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-8 text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
            No deliveries yet for this company.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {recent.map((del) => {
              const st = STATUS_STYLES[del.status] || STATUS_STYLES.PENDING_PICKUP;
              const agentLabel = del.agent
                ? `${del.agent.firstName} ${del.agent.lastName}`
                : 'Unassigned';
              return (
                <li key={del.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-mono font-bold text-white">{del.trackingNumber}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {del.deliveryAddress}
                    </p>
                    <p className="text-[10px] mt-0.5 text-blue-400/90">Agent: {agentLabel}</p>
                  </div>
                  <div className="text-right text-[12px] font-bold tabular-nums text-emerald-400">
                    {formatCurrency(del.deliveryFee)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
