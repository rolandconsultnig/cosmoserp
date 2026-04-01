import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Loader2, MessageSquare } from 'lucide-react';
import { logisticsJson } from '../lib/logisticsApi';

const inputCls =
  'w-full py-2.5 px-3 rounded-xl text-[13px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600';

export default function LogisticsAgentSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fieldWrap = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logisticsJson('/logistics/agent/support/tickets');
      setTickets(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await logisticsJson('/logistics/agent/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      setSubject('');
      setMessage('');
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not submit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 overflow-y-auto h-full max-w-2xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-indigo-500/15">
            <Headphones className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Support</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Report assignment issues, app problems, or safety concerns. Tickets are stored for your dispatcher and platform operators.
            </p>
          </div>
        </div>
        <Link to="/logistics/deliveries" className="text-[12px] font-bold text-blue-400 hover:underline">My deliveries</Link>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          New ticket
        </h2>
        {formError && <p className="text-sm text-red-300">{formError}</p>}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">Subject</label>
          <input required minLength={3} value={subject} onChange={(e) => setSubject(e.target.value)} className={`mt-1 ${inputCls}`} style={fieldWrap} />
        </div>
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase">Message</label>
          <textarea required minLength={10} value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={`mt-1 ${inputCls} resize-y`} style={fieldWrap} />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50"
          style={{ background: '#0052CC' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Submit ticket
        </button>
      </form>

      <div>
        <h2 className="text-sm font-bold text-white mb-3">Your tickets</h2>
        {error && <p className="text-sm text-red-300 mb-2">{error}</p>}
        {loading ? (
          <div className="flex gap-2 text-slate-400 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No tickets yet.</p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-sm font-bold text-white">{t.subject}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{t.status}</span>
                </div>
                <p className="text-[12px] whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.55)' }}>{t.message}</p>
                <p className="text-[10px] text-slate-600">
                  {new Date(t.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
