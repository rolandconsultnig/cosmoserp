import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Search, Save, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn, formatDate } from '../lib/utils';

function AudienceBadge({ a }) {
  const label = a.audienceType === 'ALL'
    ? 'All'
    : a.audienceType === 'ROLE'
      ? `Role: ${a.audienceRole}`
      : a.audienceType === 'DEPARTMENT'
        ? `Dept: ${a.department?.name || 'Department'}`
        : a.audienceType === 'USERS'
          ? `Users: ${Array.isArray(a.userIds) ? a.userIds.length : 0}`
          : a.audienceType;
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
      {label}
    </span>
  );
}

function AnnouncementModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    title: initial?.title || '',
    body: initial?.body || '',
    audienceType: initial?.audienceType || 'ALL',
    audienceRole: initial?.audienceRole || 'STAFF',
    departmentId: initial?.departmentId || '',
    userIds: Array.isArray(initial?.userIds) ? initial.userIds.join(',') : '',
    publishAt: initial?.publishAt ? new Date(initial.publishAt).toISOString().slice(0, 16) : '',
    expiresAt: initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 16) : '',
  });
  const [error, setError] = useState('');

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  });
  const departments = deptData?.data || [];

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? api.put(`/announcements/${initial.id}`, payload) : api.post('/announcements', payload),
    onSuccess: () => {
      qc.invalidateQueries(['announcements']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payload = useMemo(() => {
    const userIds = String(form.userIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      title: form.title,
      body: form.body,
      audienceType: form.audienceType,
      audienceRole: form.audienceType === 'ROLE' ? form.audienceRole : null,
      departmentId: form.audienceType === 'DEPARTMENT' ? (form.departmentId || null) : null,
      userIds: form.audienceType === 'USERS' ? userIds : [],
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
  }, [form]);

  const valid = form.title.trim() && form.body.trim()
    && (form.audienceType !== 'DEPARTMENT' || form.departmentId)
    && (form.audienceType !== 'USERS' || String(form.userIds || '').trim());

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Announcement' : 'New Announcement'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input value={form.title} onChange={set('title')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Message *</label>
            <textarea value={form.body} onChange={set('body')} rows={6} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Audience</label>
              <select value={form.audienceType} onChange={set('audienceType')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">All users</option>
                <option value="ROLE">Role</option>
                <option value="DEPARTMENT">Department</option>
                <option value="USERS">Specific users</option>
              </select>
            </div>

            {form.audienceType === 'ROLE' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select value={form.audienceRole} onChange={set('audienceRole')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {['OWNER','ADMIN','ACCOUNTANT','SALES','WAREHOUSE','HR','STAFF','VIEWER'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {form.audienceType === 'DEPARTMENT' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                <select value={form.departmentId} onChange={set('departmentId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.audienceType === 'USERS' && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">User IDs (comma-separated)</label>
                <input value={form.userIds} onChange={set('userIds')} placeholder="uuid, uuid, uuid" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="text-[11px] text-slate-500 mt-1">Tip: we can upgrade this to a proper user picker later.</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Publish at</label>
              <input type="datetime-local" value={form.publishAt} onChange={set('publishAt')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expires at</label>
              <input type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate(payload)}
            disabled={mutation.isPending || !valid}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then((r) => r.data),
  });

  const ack = useMutation({
    mutationFn: (id) => api.post(`/announcements/${id}/ack`),
    onSuccess: () => qc.invalidateQueries(['announcements']),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries(['announcements']),
    onError: (e) => setError(e.response?.data?.error || 'Failed to delete'),
  });

  const rows = (data?.data || [])
    .filter((a) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return String(a.title || '').toLowerCase().includes(s) || String(a.body || '').toLowerCase().includes(s);
    });

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {open && <AnnouncementModal initial={open === true ? null : open} onClose={() => setOpen(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Internal messages for your team (with acknowledgements)</p>
        </div>
        <button
          onClick={() => { setError(''); setOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && [...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-5">
            <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
            <div className="mt-3 h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="mt-1.5 h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}

        {!isLoading && rows.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-400">
            No announcements yet.
          </div>
        )}

        {rows.map((a) => (
          <div key={a.id} className={cn(
            'bg-white rounded-xl border shadow-sm p-5',
            a.isRead ? 'border-slate-100' : 'border-emerald-200'
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                a.isRead ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
              )}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold text-slate-900 truncate">{a.title}</div>
                  <AudienceBadge a={a} />
                  {!a.isRead && <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-700">NEW</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {a.createdBy ? `By ${a.createdBy.firstName} ${a.createdBy.lastName}` : '—'}
                  {' · '}
                  {formatDate(a.createdAt)}
                  {a.publishAt && ` · Publishes ${formatDate(a.publishAt)}`}
                  {a.expiresAt && ` · Expires ${formatDate(a.expiresAt)}`}
                </div>
                <div className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
                  {a.body}
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => ack.mutate(a.id)}
                    disabled={ack.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    Mark as read
                  </button>

                  {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setError(''); setOpen(a); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => del.mutate(a.id)}
                        disabled={del.isPending}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
