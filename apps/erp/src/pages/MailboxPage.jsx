import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, Send, Mail, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDateTime } from '../lib/utils';

export default function MailboxPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState('inbox');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const { data: usersData } = useQuery({
    queryKey: ['mailbox', 'users'],
    queryFn: () => api.get('/mailbox/users').then((r) => r.data.data),
  });
  const users = usersData || [];

  const { data: boxData, isLoading } = useQuery({
    queryKey: ['mailbox', mode],
    queryFn: () => api.get(mode === 'inbox' ? '/mailbox/inbox' : '/mailbox/sent').then((r) => r.data.data),
  });
  const rows = boxData || [];

  const sendMut = useMutation({
    mutationFn: () => api.post('/mailbox', { recipientId, subject, body }),
    onSuccess: () => {
      setError('');
      setRecipientId('');
      setSubject('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['mailbox', 'sent'] });
      setMode('sent');
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to send'),
  });

  const readMut = useMutation({
    mutationFn: (id) => api.post(`/mailbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mailbox', 'inbox'] }),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Mail className="w-7 h-7 text-blue-600" />
            Mailbox
          </h1>
          <p className="page-subtitle">Internal messaging for your organization.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
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
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !recipientId || !subject.trim() || !body.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex gap-2 w-fit">
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

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        {isLoading ? (
          <div className="py-8 flex items-center text-slate-500 gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : (
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
                  <div className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
