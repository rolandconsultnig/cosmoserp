import { useQuery } from '@tanstack/react-query';
import { Headphones, Phone, CheckCircle, Clock, AlertTriangle, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn } from '../lib/utils';

const STATUS_COLORS = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  WAITING_CUSTOMER: 'bg-purple-50 text-purple-700 border-purple-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PRIORITY_COLORS = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700',
};

function StatCard({ title, value, sub, icon: Icon, iconBg, highlight }) {
  return (
    <div className={cn('bg-white rounded-xl border shadow-sm p-5', highlight ? 'border-red-200' : 'border-slate-100')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className={cn('text-2xl font-bold mt-1', highlight ? 'text-red-600' : 'text-slate-900')}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => api.get('/support/stats').then((r) => r.data.data),
  });

  const { data: myTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['agent-my-tickets', user?.id],
    queryFn: () => api.get('/support/tickets', {
      params: { assignedToId: user?.id, status: 'OPEN', limit: 10 },
    }).then((r) => r.data),
    enabled: !!user?.id,
  });

  const { data: urgentTickets, isLoading: urgentLoading } = useQuery({
    queryKey: ['agent-urgent-tickets'],
    queryFn: () => api.get('/support/tickets', {
      params: { priority: 'URGENT', status: 'OPEN', limit: 5 },
    }).then((r) => r.data),
  });

  const { data: recentCalls } = useQuery({
    queryKey: ['agent-recent-calls'],
    queryFn: () => api.get('/support/calls', { params: { limit: 5 } }).then((r) => r.data),
  });

  const s = stats || {};
  const tickets = myTickets?.data || [];
  const urgent = urgentTickets?.data || [];
  const calls = recentCalls?.data || [];

  const formatDuration = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60), s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.firstName} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Here's your support queue overview for today.</p>
      </div>

      {/* Stats */}
      {!statsLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Open Tickets" value={s.tickets?.open || 0} sub={`${s.tickets?.inProgress || 0} in progress`} icon={Headphones} iconBg="bg-blue-600" />
          <StatCard title="Urgent" value={s.tickets?.urgentOpen || 0} sub={s.tickets?.overdueCount ? `${s.tickets.overdueCount} overdue` : 'None overdue'} icon={AlertTriangle} iconBg="bg-red-500" highlight={s.tickets?.urgentOpen > 0} />
          <StatCard title="Resolved" value={s.tickets?.resolved || 0} sub="All time" icon={CheckCircle} iconBg="bg-green-600" />
          <StatCard title="Calls This Month" value={s.calls?.thisMonth || 0} sub={`${s.calls?.inbound || 0} in · ${s.calls?.outbound || 0} out`} icon={Phone} iconBg="bg-purple-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* My Assigned Tickets */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">My Assigned Tickets</h2>
            <button onClick={() => navigate('/agent/tickets')} className="text-blue-600 text-sm font-medium hover:underline">
              View all →
            </button>
          </div>
          {ticketsLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">No open tickets assigned to you</p>
              <p className="text-slate-400 text-xs mt-1">Great job keeping up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tickets.map((t) => (
                <div key={t.id} onClick={() => navigate('/agent/tickets')}
                  className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-400">{t.ticketNumber}</div>
                      <div className="text-sm font-medium text-slate-800 truncate mt-0.5">{t.subject}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.customerName}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[t.priority])}>
                        {t.priority}
                      </span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLORS[t.status])}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Tickets */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Urgent Open Tickets
            </h2>
            <button onClick={() => navigate('/agent/tickets')} className="text-blue-600 text-sm font-medium hover:underline">
              View all →
            </button>
          </div>
          {urgentLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
          ) : urgent.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">No urgent tickets</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {urgent.map((t) => (
                <div key={t.id} onClick={() => navigate('/agent/tickets')}
                  className="px-5 py-3 hover:bg-red-50/40 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-slate-400">{t.ticketNumber}</div>
                      <div className="text-sm font-medium text-slate-800 truncate mt-0.5">{t.subject}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{t.customerName} · {t.channel}</div>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0', STATUS_COLORS[t.status])}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Calls */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Calls</h2>
          <button onClick={() => navigate('/agent/calls')} className="text-blue-600 text-sm font-medium hover:underline">
            View all →
          </button>
        </div>
        {calls.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No call logs yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold">Customer</th>
                  <th className="text-left px-5 py-3 font-semibold">Direction</th>
                  <th className="text-left px-5 py-3 font-semibold">Outcome</th>
                  <th className="text-left px-5 py-3 font-semibold">Duration</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{c.customerName}</div>
                      <div className="text-xs text-slate-400">{c.customerPhone}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('flex items-center gap-1.5 text-xs font-medium', c.direction === 'INBOUND' ? 'text-green-600' : 'text-blue-600')}>
                        {c.direction === 'INBOUND'
                          ? <PhoneIncoming className="w-3.5 h-3.5" />
                          : <PhoneOutgoing className="w-3.5 h-3.5" />}
                        {c.direction}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                        c.outcome === 'CONNECTED' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600')}>
                        {c.outcome.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{formatDuration(c.durationSeconds)}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
