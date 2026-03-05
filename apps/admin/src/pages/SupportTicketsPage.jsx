import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Headphones, AlertTriangle, CheckCircle, Clock, MessageSquare,
  Phone, Mail, Globe, ChevronLeft, ChevronRight, Search,
  XCircle, Users, Loader2, ArrowUpRight, Send, X, Eye,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

const PRIORITY_CFG = {
  URGENT: { label: 'Urgent', color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
  HIGH:   { label: 'High',   color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
  MEDIUM: { label: 'Medium', color: '#0052CC', bg: '#EBF2FF', border: '#A4CDFF' },
  LOW:    { label: 'Low',    color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
};

const STATUS_CFG = {
  OPEN:         { label: 'Open',        color: '#DE350B', bg: '#FFEBE6' },
  IN_PROGRESS:  { label: 'In Progress', color: '#FF8B00', bg: '#FFF7E6' },
  WAITING:      { label: 'Waiting',     color: '#6366F1', bg: '#EEF2FF' },
  RESOLVED:     { label: 'Resolved',    color: '#00875A', bg: '#E3FCEF' },
  CLOSED:       { label: 'Closed',      color: '#64748B', bg: '#F1F5F9' },
};

const CHANNEL_ICON = { EMAIL: Mail, PHONE: Phone, WHATSAPP: MessageSquare, WEB: Globe, CHAT: MessageSquare };

const CATEGORY_CFG = {
  GENERAL:    { label: 'General' },
  BILLING:    { label: 'Billing' },
  TECHNICAL:  { label: 'Technical' },
  ACCOUNT:    { label: 'Account' },
  COMPLAINT:  { label: 'Complaint' },
  FEATURE:    { label: 'Feature Req.' },
};

export default function SupportTicketsPage() {
  const [tab, setTab] = useState('overview');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [commentModal, setCommentModal] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const qc = useQueryClient();

  const invalidateAll = () => { qc.invalidateQueries(['admin-tickets']); qc.invalidateQueries(['admin-support-stats']); qc.invalidateQueries(['admin-ticket-detail']); };

  const { data: stats } = useQuery({
    queryKey: ['admin-support-stats'],
    queryFn: () => api.get('/admin/support/stats').then(r => r.data.data).catch(() => ({})),
    refetchInterval: 30000,
  });

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['admin-tickets', page, statusFilter, priorityFilter],
    queryFn: () => api.get('/admin/support/tickets', {
      params: { page, limit: 20, ...(statusFilter && { status: statusFilter }), ...(priorityFilter && { priority: priorityFilter }) },
    }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'tickets',
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['admin-ticket-detail', detailModal?.id],
    queryFn: () => api.get(`/admin/support/tickets/${detailModal.id}`).then(r => r.data.data).catch(() => null),
    enabled: !!detailModal?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, ...body }) => api.patch(`/admin/support/tickets/${ticketId}`, body),
    onSuccess: invalidateAll,
  });

  const escalateMutation = useMutation({
    mutationFn: ({ ticketId }) => api.post(`/admin/support/tickets/${ticketId}/escalate`),
    onSuccess: invalidateAll,
  });

  const commentMutation = useMutation({
    mutationFn: ({ ticketId, content }) => api.post(`/admin/support/tickets/${ticketId}/comment`, { content }),
    onSuccess: () => { invalidateAll(); setCommentModal(null); setCommentText(''); },
  });

  const s = stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Support Management</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage, escalate, and respond to support tickets across all tenants</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: s.totalTickets || 0, icon: Headphones, color: '#0052CC' },
          { label: 'Open', value: s.openTickets || 0, icon: AlertTriangle, color: '#DE350B' },
          { label: 'In Progress', value: s.inProgressTickets || 0, icon: Clock, color: '#FF8B00' },
          { label: 'Resolved Today', value: s.resolvedToday || 0, icon: CheckCircle, color: '#00875A' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[26px] font-black text-slate-900 tracking-tight">{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'tickets', label: 'Manage Tickets' },
          { id: 'escalated', label: 'Escalated' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* By priority — clickable */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">By Priority</h3>
            <div className="space-y-2">
              {(s.byPriority || []).map(p => {
                const cfg = PRIORITY_CFG[p.priority] || PRIORITY_CFG.MEDIUM;
                return (
                  <div key={p.priority} className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    onClick={() => { setTab('tickets'); setPriorityFilter(p.priority); setPage(1); }}>
                    <span className="text-[13px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-[18px] font-black" style={{ color: cfg.color }}>{p._count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By category */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">By Category</h3>
            <div className="space-y-2">
              {(s.byCategory || []).map(c => (
                <div key={c.category} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[13px] font-semibold text-slate-700">{CATEGORY_CFG[c.category]?.label || c.category}</span>
                  <span className="text-[16px] font-black text-slate-900">{c._count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By channel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">By Channel</h3>
            <div className="space-y-2">
              {(s.byChannel || []).map(c => {
                const Icon = CHANNEL_ICON[c.channel] || MessageSquare;
                return (
                  <div key={c.channel} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-[13px] font-semibold text-slate-700">{c.channel}</span>
                    </div>
                    <span className="text-[16px] font-black text-slate-900">{c._count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-white">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-[13px] bg-white">
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(statusFilter || priorityFilter) && (
              <button onClick={() => { setStatusFilter(''); setPriorityFilter(''); setPage(1); }}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Ticket #', 'Subject', 'Tenant', 'Priority', 'Status', 'Channel', 'Assigned', 'Created', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      {[...Array(9)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                    </tr>
                  ))}
                  {(ticketsData?.data || []).map(ticket => {
                    const prCfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.MEDIUM;
                    const stCfg = STATUS_CFG[ticket.status] || STATUS_CFG.OPEN;
                    const ChIcon = CHANNEL_ICON[ticket.channel] || MessageSquare;
                    const isActive = !['CLOSED', 'RESOLVED'].includes(ticket.status);
                    return (
                      <tr key={ticket.id} className={cn('border-b border-slate-50 hover:bg-slate-50/50', ticket.escalated && 'bg-red-50/20')}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {ticket.escalated && <ArrowUpRight className="w-3 h-3 text-red-500" />}
                            <span className="text-[12px] font-mono font-bold text-slate-700">{ticket.ticketNumber}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-semibold text-slate-800 max-w-[180px] truncate">{ticket.subject}</td>
                        <td className="px-3 py-3 text-[11px] text-indigo-600 font-semibold">{ticket.tenant?.businessName || '—'}</td>
                        <td className="px-3 py-3">
                          <select value={ticket.priority}
                            onChange={e => updateMutation.mutate({ ticketId: ticket.id, priority: e.target.value })}
                            className="text-[9px] font-bold rounded-full px-2 py-0.5 border-0 cursor-pointer" style={{ background: prCfg.bg, color: prCfg.color }}>
                            {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select value={ticket.status}
                            onChange={e => updateMutation.mutate({ ticketId: ticket.id, status: e.target.value })}
                            className="text-[9px] font-bold rounded-full px-2 py-0.5 border-0 cursor-pointer" style={{ background: stCfg.bg, color: stCfg.color }}>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <ChIcon className="w-3.5 h-3.5 text-slate-400" title={ticket.channel} />
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          {ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : <span className="text-red-400 font-bold">Unassigned</span>}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(ticket.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setDetailModal(ticket)}
                              className="p-1 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="View details">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button onClick={() => setCommentModal(ticket)}
                              className="p-1 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors" title="Add comment">
                              <MessageSquare className="w-3 h-3" />
                            </button>
                            {isActive && !ticket.escalated && (
                              <button onClick={() => escalateMutation.mutate({ ticketId: ticket.id })}
                                disabled={escalateMutation.isPending}
                                className="p-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Escalate">
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                            {isActive && (
                              <button onClick={() => updateMutation.mutate({ ticketId: ticket.id, status: 'RESOLVED' })}
                                disabled={updateMutation.isPending}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && (ticketsData?.data || []).length === 0 && (
                    <tr><td colSpan={9} className="text-center py-16">
                      <Headphones className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">No tickets found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(ticketsData?.pagination?.totalPages || ticketsData?.totalPages || 0) > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[12px] text-slate-400">Page {page} of {ticketsData.pagination?.totalPages || ticketsData.totalPages}</span>
                <div className="flex gap-1.5">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button disabled={page >= (ticketsData.pagination?.totalPages || ticketsData.totalPages)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'escalated' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Escalated & Urgent Tickets — Requires Action
          </h3>
          {(s.escalatedTickets || []).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-[14px] text-slate-400 font-medium">No escalated tickets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(s.escalatedTickets || []).map(ticket => {
                const prCfg = PRIORITY_CFG[ticket.priority] || PRIORITY_CFG.HIGH;
                const stCfg = STATUS_CFG[ticket.status] || STATUS_CFG.OPEN;
                const age = Math.ceil((Date.now() - new Date(ticket.createdAt)) / 86400000);
                const isActive = !['CLOSED', 'RESOLVED'].includes(ticket.status);
                return (
                  <div key={ticket.id} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ background: prCfg.bg, borderColor: prCfg.border }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-bold" style={{ color: prCfg.color }}>{ticket.ticketNumber}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: prCfg.bg, color: prCfg.color }}>{prCfg.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
                        {ticket.escalated && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">ESCALATED</span>}
                      </div>
                      <p className="text-[13px] font-semibold text-slate-800 mt-0.5 truncate">{ticket.subject}</p>
                      <p className="text-[11px] text-slate-500">{ticket.tenant?.businessName} · {age} day{age !== 1 ? 's' : ''} ago</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {ticket.assignedTo ? (
                        <span className="text-[11px] text-slate-500">{ticket.assignedTo.firstName} {ticket.assignedTo.lastName}</span>
                      ) : (
                        <span className="text-[11px] text-red-400 font-bold">Unassigned</span>
                      )}
                      <button onClick={() => setCommentModal(ticket)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white text-blue-600 border border-blue-200 hover:bg-blue-50">
                        Comment
                      </button>
                      {isActive && (
                        <button onClick={() => updateMutation.mutate({ ticketId: ticket.id, status: 'RESOLVED' })}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50">
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Comment Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setCommentModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">Add Admin Comment</h3>
                <p className="text-[12px] text-slate-500">{commentModal.ticketNumber} · {commentModal.subject}</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
              <p className="text-[12px] text-slate-600"><strong>Tenant:</strong> {commentModal.tenant?.businessName}</p>
              <p className="text-[12px] text-slate-500"><strong>Status:</strong> {STATUS_CFG[commentModal.status]?.label} · <strong>Priority:</strong> {PRIORITY_CFG[commentModal.priority]?.label}</p>
            </div>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write your admin comment or response…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCommentModal(null)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => commentMutation.mutate({ ticketId: commentModal.id, content: commentText })}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">{detailModal.ticketNumber}</h3>
                <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{detailModal.subject}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tenant</p>
                <p className="text-[13px] font-semibold text-slate-800">{detailModal.tenant?.businessName}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                <p className="text-[13px] text-slate-800">{detailModal.customerName || detailModal.customer?.name || '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <p className="text-[13px] font-bold" style={{ color: (STATUS_CFG[detailModal.status] || STATUS_CFG.OPEN).color }}>{STATUS_CFG[detailModal.status]?.label}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Priority</p>
                <p className="text-[13px] font-bold" style={{ color: (PRIORITY_CFG[detailModal.priority] || PRIORITY_CFG.MEDIUM).color }}>{PRIORITY_CFG[detailModal.priority]?.label}</p>
              </div>
            </div>
            {detailModal.description && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Description</p>
                <p className="text-[13px] text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">{detailModal.description}</p>
              </div>
            )}
            {/* Comments */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Comments ({(ticketDetail?.comments || []).length})</p>
              {(ticketDetail?.comments || []).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ticketDetail.comments.map(c => (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700">{c.author?.firstName} {c.author?.lastName}</span>
                        <span className="text-[10px] text-slate-400">{fmtDate(c.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-slate-600">{c.content}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[12px] text-slate-400 italic">No comments yet</p>}
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => { setDetailModal(null); setCommentModal(detailModal); }}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100">
                <MessageSquare className="w-3.5 h-3.5" /> Comment
              </button>
              {!['CLOSED', 'RESOLVED'].includes(detailModal.status) && (
                <>
                  {!detailModal.escalated && (
                    <button onClick={() => { escalateMutation.mutate({ ticketId: detailModal.id }); setDetailModal(null); }}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-100">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                    </button>
                  )}
                  <button onClick={() => { updateMutation.mutate({ ticketId: detailModal.id, status: 'RESOLVED' }); setDetailModal(null); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve
                  </button>
                  <button onClick={() => { updateMutation.mutate({ ticketId: detailModal.id, status: 'CLOSED' }); setDetailModal(null); }}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-[12px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">
                    <XCircle className="w-3.5 h-3.5" /> Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
