import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Search, Save, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

function DepartmentModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    managerId: initial?.managerId || '',
  });
  const [error, setError] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'departments-manager-list'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });
  const users = usersData?.data || [];

  const mutation = useMutation({
    mutationFn: (payload) => isEdit ? api.put(`/departments/${initial.id}`, payload) : api.post('/departments', payload),
    onSuccess: () => {
      qc.invalidateQueries(['departments']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
            <input
              value={form.name}
              onChange={set('name')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Operations"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
              <input
                value={form.code}
                onChange={set('code')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. OPS"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Manager</label>
              <select
                value={form.managerId}
                onChange={set('managerId')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => mutation.mutate({
              name: form.name,
              code: form.code || null,
              managerId: form.managerId || null,
            })}
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

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then((r) => r.data),
  });

  const del = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries(['departments']),
    onError: (e) => setError(e.response?.data?.error || 'Failed to delete'),
  });

  const rows = (data?.data || [])
    .filter((d) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return String(d.name || '').toLowerCase().includes(s) || String(d.code || '').toLowerCase().includes(s);
    });

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {open && <DepartmentModal initial={open === true ? null : open} onClose={() => setOpen(null)} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Organize users and power targeting (announcements, HR workflows)</p>
        </div>
        <button
          onClick={() => { setError(''); setOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-semibold">Department</th>
                <th className="text-left px-5 py-3 font-semibold">Code</th>
                <th className="text-left px-5 py-3 font-semibold">Manager</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {[...Array(4)].map((__, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">No departments yet.</td>
                </tr>
              )}
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-400">Created {new Date(d.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{d.code || '—'}</td>
                  <td className="px-5 py-3">
                    {d.manager
                      ? <div className="text-slate-700">{d.manager.firstName} {d.manager.lastName}</div>
                      : <div className="text-slate-400">—</div>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => { setError(''); setOpen({ ...d, managerId: d.manager?.id || '' }); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => del.mutate(d.id)}
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
