import { useState, useEffect } from 'react';
import { MessageSquare, Send, User, ChevronLeft, Loader2 } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn } from '../lib/utils';

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

export default function PlatformSupportPage() {
  const admin = useAuthStore((s) => s.admin);
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchStats = () => {
    api.get('/admin/support/platform-tickets/stats')
      .then((r) => setStats(r.data.data))
      .catch(() => setStats(null));
  };

  const fetchTickets = () => {
    api.get('/admin/support/platform-tickets', { params: { limit: 50, ...(statusFilter && { status: statusFilter }) } })
      .then((r) => setTickets(r.data.data || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (!selected?.id) return;
    api.get(`/admin/support/platform-tickets/${selected.id}`)
      .then((r) => setSelected(r.data.data));
  }, [selected?.id]);

  const updateStatus = (ticketId, status) => {
    api.patch(`/admin/support/platform-tickets/${ticketId}`, { status })
      .then((r) => {
        if (selected?.id === ticketId) setSelected(r.data.data);
        fetchTickets();
        fetchStats();
      });
  };

  const assignToMe = (ticketId) => {
    if (!admin?.id) return;
    api.patch(`/admin/support/platform-tickets/${ticketId}`, { assignedToAdminId: admin.id })
      .then((r) => {
        if (selected?.id === ticketId) setSelected(r.data.data);
        fetchTickets();
      });
  };

  const sendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    setSending(true);
    api.post(`/admin/support/platform-tickets/${selected.id}/reply`, { body: replyText.trim() })
      .then((r) => {
        setSelected((prev) => prev ? { ...prev, comments: [...(prev.comments || []), r.data.data] } : null);
        setReplyText('');
      })
      .finally(() => setSending(false));
  };

  const s = stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Platform Support (Back Office)</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Support tickets from marketplace customers (live chat and general inquiries)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><MessageSquare className="w-4 h-4" /> Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{s.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500 text-sm">Open</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{s.open ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500 text-sm">In Progress</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{s.inProgress ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500 text-sm">Resolved / Closed</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{s.resolved ?? 0}</div>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="flex gap-6">
        <div className={cn('flex-1 min-w-0', selected && 'lg:max-w-md')}>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-2">
              {tickets.length === 0 && <p className="text-slate-500 text-sm">No tickets.</p>}
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={cn(
                    'w-full text-left rounded-xl border p-4 transition-colors',
                    selected?.id === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <div className="font-medium text-slate-900 truncate">{t.subject}</div>
                  <div className="text-xs text-slate-500 mt-1">#{t.ticketNumber} · {t.customerEmail} · {t.status}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-5">
            <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-slate-500 text-sm mb-4 hover:text-slate-700">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-semibold text-slate-900">{selected.subject}</h2>
            <p className="text-xs text-slate-500 mt-1">#{selected.ticketNumber} · {selected.customerEmail} · {selected.customerName || '—'}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              <select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
              </select>
              {!selected.assignedToAdminId && (
                <button type="button" onClick={() => assignToMe(selected.id)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                  <User className="w-4 h-4" /> Assign to me
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3 max-h-[280px] overflow-y-auto">
              {(selected.comments || []).map((c) => (
                <div
                  key={c.id}
                  className={cn('p-3 rounded-lg', c.authorType === 'CUSTOMER' ? 'bg-slate-100' : 'bg-indigo-50')}
                >
                  <div className="text-xs text-slate-500">{c.authorName} · {new Date(c.createdAt).toLocaleString()}</div>
                  <div className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}
            </div>

            {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
              <form onSubmit={sendReply} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Reply to customer…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button type="submit" disabled={sending || !replyText.trim()} className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50">
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
