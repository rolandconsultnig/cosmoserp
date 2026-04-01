import { useEffect, useState, useCallback } from 'react';
import { Users, Loader2, Phone, Mail, Truck, Star, CheckCircle } from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';
import { cn } from '../lib/utils';

export default function LogisticsCompanyCarriersPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/company/agents');
      setAgents(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" />
          Carriers &amp; drivers
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Your active drivers on Cosmos: contact details, vehicle, online status, and delivery counts. Use this roster to coordinate dispatch alongside the shipments list.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-10">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading roster…
        </div>
      ) : agents.length === 0 ? (
        <p className="text-sm text-slate-500">No drivers linked to this company yet.</p>
      ) : (
        <ul className="space-y-3">
          {agents.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border p-4 flex flex-wrap gap-4 items-start justify-between"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm bg-gradient-to-br from-blue-600 to-indigo-600 flex-shrink-0">
                  {a.firstName?.[0]}{a.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">{a.firstName} {a.lastName}</span>
                    <span className="text-[10px] font-mono text-blue-400">{a.agentCode}</span>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        a.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200',
                      )}
                    >
                      {a.status}
                    </span>
                    {a.isOnline && (
                      <span className="text-[10px] font-bold text-sky-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Online
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="flex items-center gap-1 hover:text-blue-400">
                        <Mail className="w-3 h-3" /> {a.email}
                      </a>
                    )}
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="flex items-center gap-1 hover:text-blue-400">
                        <Phone className="w-3 h-3" /> {a.phone}
                      </a>
                    )}
                  </div>
                  {(a.vehicleType || a.vehiclePlate) && (
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      {a.vehicleType} {a.vehiclePlate && `· ${a.vehiclePlate}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <p className="text-slate-500 flex items-center justify-end gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  {a.rating != null ? Number(a.rating).toFixed(1) : '—'} rating
                </p>
                <p className="text-slate-400">{a.totalDeliveries ?? 0} deliveries</p>
                <p className="text-slate-500">Success {a.successRate != null ? `${Number(a.successRate).toFixed(0)}%` : '—'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
