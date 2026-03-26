import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Search, Save, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate } from '../lib/utils';

function TaskModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'tasks-assignee-list'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const projects = projectsData?.data || [];
  const users = (usersData?.data || []).filter((u) => u.role === 'STAFF');

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    projectId: initial?.projectId || '',
    assigneeId: initial?.assignee?.id || initial?.assigneeId || '',
    status: initial?.status || 'TODO',
    priority: initial?.priority || 'MEDIUM',
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? api.put(`/tasks/${initial.id}`, payload) : api.post('/tasks', payload),
    onSuccess: () => {
      qc.invalidateQueries(['tasks']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payload = useMemo(() => ({
    title: form.title,
    description: form.description || null,
    projectId: form.projectId,
    assigneeId: form.assigneeId || null,
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
  }), [form]);

  const valid = form.title.trim() && form.projectId;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input value={form.title} onChange={set('title')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Project *</label>
            <select value={form.projectId} onChange={set('projectId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={set('priority')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['LOW','MEDIUM','HIGH','URGENT'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Assignee</label>
              <select value={form.assigneeId} onChange={set('assigneeId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Due date</label>
              <input type="date" value={form.dueDate} onChange={set('dueDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

export default function TasksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });
  const projects = projectsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get('/tasks', { params: projectId ? { projectId } : {} }).then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries(['tasks']),
    onError: (e) => setError(e.response?.data?.error || 'Failed to delete'),
  });

  const rows = (data?.data || []).filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(t.title || '').toLowerCase().includes(s)
      || String(t.status || '').toLowerCase().includes(s)
      || String(t.priority || '').toLowerCase().includes(s)
      || String(t.project?.name || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      {open && <TaskModal initial={open === true ? null : open} onClose={() => setOpen(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Track work items across projects</p>
        </div>
        <button
          onClick={() => { setError(''); setOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="min-w-[240px]">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Task</th>
                <th className="text-left px-5 py-3 font-semibold">Project</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Priority</th>
                <th className="text-left px-5 py-3 font-semibold">Assignee</th>
                <th className="text-left px-5 py-3 font-semibold">Due</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(7)].map((__, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">No tasks yet.</td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{t.title}</div>
                    <div className="text-xs text-slate-400">Created {formatDate(t.createdAt)}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{t.project?.name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      t.status === 'DONE' ? 'bg-emerald-100 text-emerald-700'
                        : t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                          : t.status === 'BLOCKED' ? 'bg-amber-100 text-amber-700'
                            : t.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                    )}>{t.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700'
                        : t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700'
                          : t.priority === 'LOW' ? 'bg-slate-100 text-slate-700'
                            : 'bg-blue-50 text-blue-700'
                    )}>{t.priority}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { setError(''); setOpen(t); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate(t.id)}
                      disabled={del.isPending}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border',
                        'border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-40'
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
