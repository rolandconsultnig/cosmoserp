import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Search, Save, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate } from '../lib/utils';

function ProjectModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    description: initial?.description || '',
    status: initial?.status || 'ACTIVE',
    startDate: initial?.startDate ? new Date(initial.startDate).toISOString().slice(0, 10) : '',
    endDate: initial?.endDate ? new Date(initial.endDate).toISOString().slice(0, 10) : '',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? api.put(`/projects/${initial.id}`, payload) : api.post('/projects', payload),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const payload = useMemo(() => ({
    name: form.name,
    code: form.code || null,
    description: form.description || null,
    status: form.status,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
  }), [form]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
            <input value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
              <input value={form.code} onChange={set('code')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. PRJ-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['PLANNED','ACTIVE','ON_HOLD','COMPLETED','CANCELLED'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate(payload)}
            disabled={mutation.isPending || !form.name.trim()}
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

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries(['projects']),
    onError: (e) => setError(e.response?.data?.error || 'Failed to delete'),
  });

  const rows = (data?.data || []).filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return String(p.name || '').toLowerCase().includes(s)
      || String(p.code || '').toLowerCase().includes(s)
      || String(p.status || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {open && <ProjectModal initial={open === true ? null : open} onClose={() => setOpen(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Plan and track internal work</p>
        </div>
        <button
          onClick={() => { setError(''); setOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Project</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Members</th>
                <th className="text-left px-5 py-3 font-semibold">Created</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(5)].map((__, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">No projects yet.</td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-400">{p.code || '—'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700'
                        : p.status === 'PLANNED' ? 'bg-slate-100 text-slate-700'
                          : p.status === 'ON_HOLD' ? 'bg-amber-100 text-amber-700'
                            : p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700'
                              : 'bg-rose-100 text-rose-700'
                    )}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{p._count?.members ?? 0}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { setError(''); setOpen(p); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate(p.id)}
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
