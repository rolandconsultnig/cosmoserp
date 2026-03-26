import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Loader2, Plus, CalendarClock } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate, formatDateTime, getStatusColor } from '../lib/utils';

const DAY_OPTIONS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
];

function fullName(e) {
  if (!e) return 'Unassigned';
  return `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unassigned';
}

export default function AttendanceShiftsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('shifts');
  const [rangeDays, setRangeDays] = useState(14);
  const [form, setForm] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    employeeId: '',
    daysOfWeek: [1, 2, 3, 4, 5],
    isActive: true,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'attendance-assign-list'],
    queryFn: () => api.get('/users').then((r) => r.data.data || []),
  });
  const users = usersData || [];

  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['attendance', 'shifts'],
    queryFn: () => api.get('/attendance/shifts').then((r) => r.data.data),
  });
  const shifts = shiftsData || [];

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d.toISOString();
  }, [rangeDays]);

  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['attendance', 'entries', rangeDays],
    queryFn: () => api.get(`/attendance/entries?from=${encodeURIComponent(from)}`).then((r) => r.data.data),
    enabled: tab === 'entries',
  });
  const entries = entriesData || [];

  const createShift = useMutation({
    mutationFn: (payload) => api.post('/attendance/shifts', payload),
    onSuccess: () => {
      setForm((f) => ({ ...f, name: '', employeeId: '' }));
      qc.invalidateQueries({ queryKey: ['attendance', 'shifts'] });
    },
  });

  const toggleShift = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/attendance/shifts/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', 'shifts'] }),
  });

  const onToggleDay = (day) => {
    setForm((f) => {
      const set = new Set(f.daysOfWeek);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...f, daysOfWeek: Array.from(set).sort((a, b) => a - b) };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarClock className="w-7 h-7 text-indigo-600" />
            Attendance &amp; shift management
          </h1>
          <p className="page-subtitle">Define shifts and review clock-in/clock-out records.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex gap-2 w-fit">
        {[
          ['shifts', 'Shifts'],
          ['entries', 'Attendance log'],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-semibold',
              tab === k ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'shifts' && (
        <>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="font-semibold text-slate-900">Create shift</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Shift name (e.g. Morning)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={form.employeeId}
                onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All staff</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={createShift.isPending || !form.name.trim()}
                onClick={() =>
                  createShift.mutate({
                    ...form,
                    employeeId: form.employeeId || null,
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {createShift.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add shift
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onToggleDay(v)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs font-medium',
                    form.daysOfWeek.includes(v)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {shiftsLoading ? (
              <div className="py-16 flex items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading shifts...
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-semibold">Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Time</th>
                    <th className="text-left px-4 py-3 font-semibold">Days</th>
                    <th className="text-left px-4 py-3 font-semibold">Assigned</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">No shifts yet.</td>
                    </tr>
                  )}
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 text-slate-700">{s.startTime} - {s.endTime}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {(s.daysOfWeek || [])
                          .map((d) => DAY_OPTIONS.find(([k]) => k === d)?.[1] || d)
                          .join(', ')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{fullName(users.find((u) => u.id === s.employeeId))}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleShift.mutate({ id: s.id, isActive: !s.isActive })}
                          disabled={toggleShift.isPending}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'entries' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700">Range:</span>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRangeDays(d)}
                className={cn('px-2 py-1 rounded text-xs font-semibold', rangeDays === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')}
              >
                {d} days
              </button>
            ))}
          </div>
          {entriesLoading ? (
            <div className="py-16 flex items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading attendance...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Clock in</th>
                  <th className="text-left px-4 py-3 font-semibold">Clock out</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">No attendance entries in selected range.</td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{fullName(e.employee)}</div>
                      <div className="text-xs text-slate-500">{e.employee?.staffId || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(e.clockInAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(e.clockOutAt)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(e.status))}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      <div>{e.noteIn || '—'}</div>
                      {e.noteOut && <div className="text-slate-500 mt-0.5">Out: {e.noteOut}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
