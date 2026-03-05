import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HeadphonesIcon, Phone, Plus, Search, Filter, X, ChevronDown,
  Clock, CheckCircle, AlertTriangle, PhoneIncoming, PhoneOutgoing,
  MessageSquare, User, Tag, Calendar, Loader2, RefreshCw,
} from 'lucide-react';
import api from '../lib/api';
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

const CHANNEL_ICONS = {
  EMAIL: '📧',
  PHONE: '📞',
  WHATSAPP: '💬',
  WALK_IN: '🚶',
  WEB_FORM: '🌐',
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

function NewTicketModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    channel: 'EMAIL', category: 'GENERAL', priority: 'MEDIUM',
    subject: '', description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/support/tickets', form);
      onCreated(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">New Support Ticket</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
              <input required value={form.customerName} onChange={(e) => set('customerName', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Channel</label>
              <select value={form.channel} onChange={(e) => set('channel', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['EMAIL','PHONE','WHATSAPP','WALK_IN','WEB_FORM'].map((c) => (
                  <option key={c} value={c}>{CHANNEL_ICONS[c]} {c.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['GENERAL','BILLING','TECHNICAL','DELIVERY','COMPLAINT','REFUND','OTHER'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['LOW','MEDIUM','HIGH','URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject *</label>
              <input required value={form.subject} onChange={(e) => set('subject', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
              <textarea required rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LogCallModal({ onClose, onLogged }) {
  const [form, setForm] = useState({
    customerName: '', customerPhone: '',
    direction: 'INBOUND', outcome: 'CONNECTED', durationSeconds: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form, durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null };
      const { data } = await api.post('/support/calls', payload);
      onLogged(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Log a Call</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name *</label>
              <input required value={form.customerName} onChange={(e) => set('customerName', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number *</label>
              <input required value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
              <select value={form.direction} onChange={(e) => set('direction', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INBOUND">📞 Inbound</option>
                <option value="OUTBOUND">📲 Outbound</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
              <select value={form.outcome} onChange={(e) => set('outcome', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['CONNECTED','NO_ANSWER','VOICEMAIL','BUSY','FAILED'].map((o) => (
                  <option key={o} value={o}>{o.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Duration (seconds)</label>
              <input type="number" min="0" value={form.durationSeconds} onChange={(e) => set('durationSeconds', e.target.value)}
                placeholder="e.g. 180"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Log Call
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TicketDetailPanel({ ticket, onClose, onUpdated }) {
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const updateStatus = async (status) => {
    try {
      await api.patch(`/support/tickets/${ticket.id}`, { status });
      onUpdated();
    } catch (e) { /* silent */ }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/support/tickets/${ticket.id}/comments`, { body: comment, isInternal });
      setComment('');
      onUpdated();
    } catch (e) { /* silent */ } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-400 font-mono">{ticket.ticketNumber}</div>
            <div className="font-semibold text-slate-900 text-sm mt-0.5">{ticket.subject}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', STATUS_COLORS[ticket.status])}>{ticket.status.replace('_', ' ')}</span>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{CHANNEL_ICONS[ticket.channel]} {ticket.channel}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{ticket.category}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Customer</div>
              <div className="font-medium text-slate-800">{ticket.customerName}</div>
              {ticket.customerEmail && <div className="text-xs text-slate-500">{ticket.customerEmail}</div>}
              {ticket.customerPhone && <div className="text-xs text-slate-500">{ticket.customerPhone}</div>}
            </div>
            {ticket.assignedTo && (
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Assigned To</div>
                <div className="font-medium text-slate-800">{ticket.assignedTo.firstName} {ticket.assignedTo.lastName}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Created</div>
              <div className="text-slate-700">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
            {ticket.resolvedAt && (
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Resolved</div>
                <div className="text-slate-700">{new Date(ticket.resolvedAt).toLocaleString()}</div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
            <div className="text-xs text-slate-400 font-medium mb-1">Description</div>
            {ticket.description}
          </div>

          <div className="flex flex-wrap gap-2">
            {ticket.status !== 'IN_PROGRESS' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button onClick={() => updateStatus('IN_PROGRESS')}
                className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 font-medium">
                Mark In Progress
              </button>
            )}
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button onClick={() => updateStatus('RESOLVED')}
                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 font-medium">
                Mark Resolved
              </button>
            )}
            {ticket.status !== 'CLOSED' && (
              <button onClick={() => updateStatus('CLOSED')}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 font-medium">
                Close Ticket
              </button>
            )}
          </div>

          {ticket.comments?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Conversation</div>
              <div className="space-y-3">
                {ticket.comments.map((c) => (
                  <div key={c.id} className={cn('rounded-lg p-3 text-sm', c.isInternal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50')}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{c.authorName}</span>
                      {c.isInternal && <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Internal</span>}
                      <span className="text-xs text-slate-400 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-700">{c.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <form onSubmit={submitComment} className="space-y-2">
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Add a reply or internal note…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                Internal note
              </label>
              <button type="submit" disabled={submitting || !comment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50 flex items-center gap-1">
                {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage({ defaultTab = 'tickets' }) {
  const [tab, setTab] = useState(defaultTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const qc = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['support-stats'],
    queryFn: () => api.get('/support/stats').then((r) => r.data.data),
  });

  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['support-tickets', search, statusFilter, priorityFilter],
    queryFn: () => api.get('/support/tickets', {
      params: { search: search || undefined, status: statusFilter || undefined, priority: priorityFilter || undefined, limit: 50 },
    }).then((r) => r.data),
  });

  const { data: callsData, isLoading: callsLoading, refetch: refetchCalls } = useQuery({
    queryKey: ['support-calls', search],
    queryFn: () => api.get('/support/calls', {
      params: { search: search || undefined, limit: 50 },
    }).then((r) => r.data),
    enabled: tab === 'calls',
  });

  const { data: ticketDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['support-ticket', selectedTicket?.id],
    queryFn: () => api.get(`/support/tickets/${selectedTicket.id}`).then((r) => r.data.data),
    enabled: !!selectedTicket,
  });

  const stats = statsData || {};
  const tickets = ticketsData?.data || [];
  const calls = callsData?.data || [];

  const formatDuration = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Care & Call Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage support tickets, calls, and customer interactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLogCall(true)}
            className="flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm px-4 py-2 rounded-xl transition">
            <Phone className="w-4 h-4" /> Log Call
          </button>
          <button onClick={() => setShowNewTicket(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-xl transition">
            <Plus className="w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      {/* Stats */}
      {!statsLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Open Tickets" value={stats.tickets?.open || 0} sub={`${stats.tickets?.inProgress || 0} in progress`} icon={HeadphonesIcon} iconBg="bg-blue-600" />
          <StatCard title="Urgent" value={stats.tickets?.urgentOpen || 0} sub={stats.tickets?.overdueCount ? `${stats.tickets.overdueCount} overdue` : 'None overdue'} icon={AlertTriangle} iconBg="bg-red-500" highlight={stats.tickets?.urgentOpen > 0} />
          <StatCard title="Resolved This Month" value={stats.tickets?.resolved || 0} sub={`${stats.tickets?.thisMonth || 0} total this month`} icon={CheckCircle} iconBg="bg-green-600" />
          <StatCard title="Calls This Month" value={stats.calls?.thisMonth || 0} sub={`${stats.calls?.inbound || 0} in · ${stats.calls?.outbound || 0} out`} icon={Phone} iconBg="bg-purple-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1 border-b border-slate-100 px-4">
          {[{ key: 'tickets', label: 'Tickets', icon: MessageSquare }, { key: 'calls', label: 'Call Logs', icon: Phone }].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px',
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => tab === 'tickets' ? refetchTickets() : refetchCalls()}
            className="text-slate-400 hover:text-slate-600 p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-50">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'tickets' ? 'Search tickets…' : 'Search calls…'}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {tab === 'tickets' && (
            <>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
                {['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Priorities</option>
                {['LOW','MEDIUM','HIGH','URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          )}
        </div>

        {/* Tickets Table */}
        {tab === 'tickets' && (
          <div className="overflow-x-auto">
            {ticketsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <HeadphonesIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No tickets found</p>
                <p className="text-sm mt-1">Create your first support ticket to get started</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold">Ticket</th>
                    <th className="text-left px-5 py-3 font-semibold">Customer</th>
                    <th className="text-left px-5 py-3 font-semibold">Category</th>
                    <th className="text-left px-5 py-3 font-semibold">Priority</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Assigned</th>
                    <th className="text-left px-5 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} onClick={() => setSelectedTicket(t)}
                      className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-mono text-xs text-slate-400">{t.ticketNumber}</div>
                        <div className="font-medium text-slate-900 mt-0.5 max-w-xs truncate">{t.subject}</div>
                        <div className="text-xs text-slate-400">{CHANNEL_ICONS[t.channel]} {t.channel} · {t._count?.comments || 0} replies</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{t.customerName}</div>
                        {t.customerEmail && <div className="text-xs text-slate-400">{t.customerEmail}</div>}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{t.category}</td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', STATUS_COLORS[t.status])}>{t.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : <span className="text-slate-300">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Calls Table */}
        {tab === 'calls' && (
          <div className="overflow-x-auto">
            {callsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : calls.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No call logs yet</p>
                <p className="text-sm mt-1">Log your first call to start tracking</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold">Customer</th>
                    <th className="text-left px-5 py-3 font-semibold">Direction</th>
                    <th className="text-left px-5 py-3 font-semibold">Outcome</th>
                    <th className="text-left px-5 py-3 font-semibold">Duration</th>
                    <th className="text-left px-5 py-3 font-semibold">Agent</th>
                    <th className="text-left px-5 py-3 font-semibold">Ticket</th>
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{c.customerName}</div>
                        <div className="text-xs text-slate-400">{c.customerPhone}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('flex items-center gap-1.5 text-xs font-medium', c.direction === 'INBOUND' ? 'text-green-600' : 'text-blue-600')}>
                          {c.direction === 'INBOUND' ? <PhoneIncoming className="w-3.5 h-3.5" /> : <PhoneOutgoing className="w-3.5 h-3.5" />}
                          {c.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                          c.outcome === 'CONNECTED' ? 'bg-green-50 text-green-700' :
                          c.outcome === 'NO_ANSWER' ? 'bg-slate-100 text-slate-600' :
                          'bg-red-50 text-red-600')}>
                          {c.outcome.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{formatDuration(c.durationSeconds)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        {c.agent ? `${c.agent.firstName} ${c.agent.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {c.ticket ? <span className="text-blue-600 font-mono">{c.ticket.ticketNumber}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={() => { setShowNewTicket(false); refetchTickets(); qc.invalidateQueries(['support-stats']); }}
        />
      )}

      {showLogCall && (
        <LogCallModal
          onClose={() => setShowLogCall(false)}
          onLogged={() => { setShowLogCall(false); refetchCalls(); qc.invalidateQueries(['support-stats']); }}
        />
      )}

      {selectedTicket && ticketDetail && (
        <TicketDetailPanel
          ticket={ticketDetail}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => { refetchDetail(); refetchTickets(); qc.invalidateQueries(['support-stats']); }}
        />
      )}
    </div>
  );
}
