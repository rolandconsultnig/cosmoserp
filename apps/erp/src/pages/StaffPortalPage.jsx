import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload, Mail, Inbox, Send, FileText, Printer, Undo2, Clock3, LogIn, LogOut } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate, formatDateTime } from '../lib/utils';

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="font-semibold text-slate-900 mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function StaffPortalPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('credentials');

  const { data: meData, isLoading: meLoading, error: meErr } = useQuery({
    queryKey: ['staff-portal', 'me'],
    queryFn: () => api.get('/staff-portal/me').then((r) => r.data),
  });

  const me = meData?.data;

  const tabs = useMemo(() => ([
    { key: 'credentials', label: 'Credentials', icon: FileText },
    { key: 'payslips', label: 'Payslips', icon: Printer },
    { key: 'attendance', label: 'Attendance', icon: Clock3 },
    { key: 'leave', label: 'Leave', icon: Save },
    { key: 'resignation', label: 'Resignation', icon: Save },
    { key: 'messages', label: 'Intranet', icon: Mail },
  ]), []);

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Portal</h1>
          <p className="page-subtitle">Self service: credentials, leave, resignation, intranet</p>
        </div>
      </div>

      {meLoading && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex items-center gap-2 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {meErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {meErr.response?.data?.error || meErr.message || 'Failed'}
        </div>
      )}

      {me && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
          <div className="font-semibold text-slate-900">{me.firstName} {me.lastName}</div>
          <div className="text-sm text-slate-500">{me.staffId}</div>
          <div className="text-sm text-slate-500">{me.department || '—'}</div>
          <div className="text-sm text-slate-500">{me.jobTitle || '—'}</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2',
                active ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              )}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'credentials' && <CredentialsTab />}
      {tab === 'payslips' && <PayslipsTab />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'leave' && <LeaveTab />}
      {tab === 'resignation' && <ResignationTab />}
      {tab === 'messages' && <MessagesTab />}
    </div>
  );
}

function PayslipsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['staff-portal', 'payslips'],
    queryFn: () => api.get('/staff-portal/payslips').then((r) => r.data),
  });

  const rows = data?.data || [];

  return (
    <Section title="My payslips">
      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error.response?.data?.error || error.message || 'Failed'}
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">No payslips yet.</div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold">Period</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Net pay</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">{p.payrollRun?.period || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{p.payrollRun?.status || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{String(p.netPay ?? '')}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => window.open(`/staff-portal/payslips/${p.id}/print`, '_blank')}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-slate-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function CredentialsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['staff-portal', 'documents'],
    queryFn: () => api.get('/staff-portal/documents').then((r) => r.data),
  });

  const rows = data?.data || [];

  const uploadMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('documentType', documentType);
      fd.append('file', file);
      const res = await api.post('/staff-portal/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data;
    },
    onSuccess: () => {
      setError('');
      setTitle('');
      setDocumentType('');
      setFile(null);
      qc.invalidateQueries(['staff-portal', 'documents']);
    },
    onError: (e) => setError(e.response?.data?.error || 'Upload failed'),
  });

  const valid = title.trim() && documentType.trim() && file;

  return (
    <div className="grid gap-5">
      <Section title="Upload credential">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Document type</label>
            <input value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => uploadMut.mutate()}
            disabled={!valid || uploadMut.isPending}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {uploadMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
          </button>
        </div>
      </Section>

      <Section title="My uploaded credentials">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No documents yet.</td></tr>
              )}
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                  <td className="px-4 py-3 text-slate-700">{d.documentType}</td>
                  <td className="px-4 py-3 text-slate-700">{d.status}</td>
                  <td className="px-4 py-3 text-slate-500">{d.createdAt ? formatDate(d.createdAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function LeaveTab() {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['staff-portal', 'leave'],
    queryFn: () => api.get('/staff-portal/leave').then((r) => r.data),
  });

  const rows = data?.data || [];

  const applyMut = useMutation({
    mutationFn: (payload) => api.post('/staff-portal/leave', payload).then((r) => r.data),
    onSuccess: () => {
      setError('');
      setStartDate('');
      setEndDate('');
      setReason('');
      qc.invalidateQueries(['staff-portal', 'leave']);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const valid = startDate && endDate;

  return (
    <div className="grid gap-5">
      <Section title="Apply for leave">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => applyMut.mutate({ startDate, endDate, reason: reason || null })}
            disabled={!valid || applyMut.isPending}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {applyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </Section>

      <Section title="My leave requests">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold">Period</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No leave requests yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {r.startDate ? formatDate(r.startDate) : '—'} - {r.endDate ? formatDate(r.endDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.status}</td>
                  <td className="px-4 py-3 text-slate-700">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{r.createdAt ? formatDate(r.createdAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ResignationTab() {
  const qc = useQueryClient();
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data } = useQuery({
    queryKey: ['staff-portal', 'resignations'],
    queryFn: () => api.get('/staff-portal/resignations').then((r) => r.data),
  });

  const rows = data?.data || [];

  const submitMut = useMutation({
    mutationFn: (payload) => api.post('/staff-portal/resignations', payload).then((r) => r.data),
    onSuccess: () => {
      setError('');
      setLastWorkingDate('');
      setReason('');
      qc.invalidateQueries(['staff-portal', 'resignations']);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const withdrawMut = useMutation({
    mutationFn: (id) => api.post(`/staff-portal/resignations/${id}/withdraw`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries(['staff-portal', 'resignations']),
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="grid gap-5">
      <Section title="Submit resignation">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Last working date (optional)</label>
            <input type="date" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason (optional)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => submitMut.mutate({ lastWorkingDate: lastWorkingDate || null, reason: reason || null })}
            disabled={submitMut.isPending}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {submitMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Submit
          </button>
        </div>
      </Section>

      <Section title="My resignations">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                <th className="text-left px-4 py-3 font-semibold">Last working date</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">No resignations yet.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-700">{r.submittedAt ? formatDate(r.submittedAt) : '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.lastWorkingDate ? formatDate(r.lastWorkingDate) : '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.status}</td>
                  <td className="px-4 py-3 text-slate-700">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        disabled={withdrawMut.isPending}
                        onClick={() => withdrawMut.mutate(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-60"
                      >
                        <Undo2 className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function AttendanceTab() {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [noteIn, setNoteIn] = useState('');
  const [noteOut, setNoteOut] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff-portal', 'attendance'],
    queryFn: () => api.get('/attendance/me').then((r) => r.data.data),
  });

  const clockInMut = useMutation({
    mutationFn: () => api.post('/attendance/clock-in', { noteIn: noteIn || null }).then((r) => r.data),
    onSuccess: () => {
      setError('');
      setNoteIn('');
      qc.invalidateQueries(['staff-portal', 'attendance']);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to clock in'),
  });

  const clockOutMut = useMutation({
    mutationFn: (id) => api.post(`/attendance/${id}/clock-out`, { noteOut: noteOut || null }).then((r) => r.data),
    onSuccess: () => {
      setError('');
      setNoteOut('');
      qc.invalidateQueries(['staff-portal', 'attendance']);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to clock out'),
  });

  const open = data?.openEntry || null;
  const todayRows = data?.todayEntries || [];
  const shift = data?.currentShift || null;

  return (
    <div className="grid gap-5">
      <Section title="Clock in / out">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500">Current shift</div>
            {shift ? (
              <div className="text-sm text-slate-800 mt-1">
                <div className="font-semibold">{shift.name}</div>
                <div>{shift.startTime} - {shift.endTime}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 mt-1">No active shift assigned.</div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clock in note (optional)</label>
            <input value={noteIn} onChange={(e) => setNoteIn(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Clock out note (optional)</label>
            <input value={noteOut} onChange={(e) => setNoteOut(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
          {!open ? (
            <button
              type="button"
              onClick={() => clockInMut.mutate()}
              disabled={clockInMut.isPending || isLoading}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
            >
              {clockInMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Clock in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => clockOutMut.mutate(open.id)}
              disabled={clockOutMut.isPending || isLoading}
              className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-60 flex items-center gap-2"
            >
              {clockOutMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Clock out
            </button>
          )}
        </div>
      </Section>

      <Section title="Today's attendance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold">Clock in</th>
                <th className="text-left px-4 py-3 font-semibold">Clock out</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {todayRows.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-slate-400">No entries today.</td></tr>
              )}
              {todayRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 text-slate-700">{formatDateTime(r.clockInAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.clockOutAt ? formatDateTime(r.clockOutAt) : '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{r.status}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">
                    <div>{r.noteIn || '—'}</div>
                    {r.noteOut && <div className="text-slate-500 mt-0.5">Out: {r.noteOut}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function MessagesTab() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('inbox');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['users', 'staff-portal-message-users'],
    queryFn: () => api.get('/staff-portal/users').then((r) => r.data),
  });

  const users = usersData?.data || [];

  const { data } = useQuery({
    queryKey: ['staff-portal', 'messages', mode],
    queryFn: () => api.get(mode === 'inbox' ? '/staff-portal/messages/inbox' : '/staff-portal/messages/sent').then((r) => r.data),
  });

  const rows = data?.data || [];

  const sendMut = useMutation({
    mutationFn: (payload) => api.post('/staff-portal/messages', payload).then((r) => r.data),
    onSuccess: () => {
      setError('');
      setRecipientId('');
      setSubject('');
      setBody('');
      qc.invalidateQueries(['staff-portal', 'messages', 'sent']);
      setMode('sent');
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to send'),
  });

  const readMut = useMutation({
    mutationFn: (id) => api.post(`/staff-portal/messages/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries(['staff-portal', 'messages', 'inbox']),
  });

  return (
    <div className="grid gap-5">
      <Section title="Compose message">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">— Select —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
            <input value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => sendMut.mutate({ recipientId, subject, body })}
            disabled={sendMut.isPending || !recipientId || !subject.trim() || !body.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </Section>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('inbox')}
          className={cn('px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2', mode === 'inbox' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100')}
        >
          <Inbox className="w-4 h-4" /> Inbox
        </button>
        <button
          type="button"
          onClick={() => setMode('sent')}
          className={cn('px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2', mode === 'sent' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100')}
        >
          <Send className="w-4 h-4" /> Sent
        </button>
      </div>

      <Section title={mode === 'inbox' ? 'Inbox' : 'Sent'}>
        <div className="space-y-2">
          {rows.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No messages.</div>}
          {rows.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { if (mode === 'inbox' && !m.readAt) readMut.mutate(m.id); }}
              className={cn(
                'w-full text-left border rounded-lg p-3 hover:bg-slate-50',
                mode === 'inbox' && !m.readAt ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{m.subject}</div>
                  <div className="text-sm text-slate-600 mt-1">{m.body}</div>
                </div>
                <div className="text-xs text-slate-400">{formatDate(m.createdAt)}</div>
              </div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
