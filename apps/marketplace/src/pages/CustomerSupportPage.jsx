import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Plus, Send, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = () => {
    api.get('/marketplace/support/tickets')
      .then(({ data }) => setTickets(data.data || []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    const t = setInterval(() => {
      api.get(`/marketplace/support/tickets/${selected.id}`)
        .then(({ data }) => setSelected(data.data));
    }, 10000);
    return () => clearInterval(t);
  }, [selected?.id]);

  const openTicket = (ticket) => {
    setSelected(ticket);
    setShowNew(false);
    if (!ticket.comments) {
      api.get(`/marketplace/support/tickets/${ticket.id}`)
        .then(({ data }) => setSelected(data.data));
    }
  };

  const createTicket = (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;
    setSending(true);
    api.post('/marketplace/support/tickets', { subject: newSubject.trim(), description: newDescription.trim() })
      .then(({ data }) => {
        setTickets((prev) => [data.data, ...prev]);
        setSelected(data.data);
        setShowNew(false);
        setNewSubject('');
        setNewDescription('');
      })
      .finally(() => setSending(false));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selected) return;
    setSending(true);
    api.post(`/marketplace/support/tickets/${selected.id}/messages`, { body: message.trim() })
      .then(({ data }) => {
        setSelected((prev) => prev ? { ...prev, comments: [...(prev.comments || []), data.data] } : null);
        setMessage('');
      })
      .finally(() => setSending(false));
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading support…</p>
      </div>
    );
  }

  return (
    <CustomerAccountLayout active="support">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Live support</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">Start a conversation or continue an existing one. Our team will respond as soon as possible.</p>

      {!selected ? (
        <>
          <button
            type="button"
            onClick={() => { setShowNew(true); setSelected(null); }}
            className="btn-buy inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold mb-4"
          >
            <Plus className="w-4 h-4" /> New conversation
          </button>

          {showNew && (
            <div className="card p-5 mb-4">
              <h2 className="font-semibold text-gray-900 mb-3">New conversation</h2>
              <form onSubmit={createTicket} className="space-y-3">
                <input
                  type="text"
                  placeholder="Subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="input w-full"
                  required
                />
                <textarea
                  placeholder="How can we help?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="input w-full min-h-[100px]"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={sending} className="btn-buy py-2 px-4 rounded-lg text-sm font-semibold disabled:opacity-60">
                    Start conversation
                  </button>
                  <button type="button" onClick={() => { setShowNew(false); setNewSubject(''); setNewDescription(''); }} className="py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {tickets.length === 0 && !showNew && (
              <p className="text-gray-500 text-sm">No conversations yet. Start one above.</p>
            )}
            {tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t)}
                className="w-full card p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium text-gray-900">{t.subject}</span>
                  <span className="text-xs text-gray-500">{t.status}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">#{t.ticketNumber}</div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="card p-5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
          <h2 className="font-semibold text-gray-900 mb-1">{selected.subject}</h2>
          <p className="text-xs text-gray-500 mb-4">#{selected.ticketNumber} · {selected.status}</p>

          <div className="space-y-3 max-h-[320px] overflow-y-auto mb-4">
            {(selected.comments || []).map((c) => (
              <div
                key={c.id}
                className={`p-3 rounded-lg ${c.authorType === 'CUSTOMER' ? 'bg-brand-50 ml-0 mr-8' : 'bg-gray-100 mr-0 ml-8'}`}
              >
                <div className="text-xs text-gray-500 mb-1">{c.authorName} · {new Date(c.createdAt).toLocaleString()}</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{c.body}</div>
              </div>
            ))}
          </div>

          {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="input flex-1"
              />
              <button type="submit" disabled={sending || !message.trim()} className="btn-buy p-2.5 rounded-xl disabled:opacity-60">
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      )}
    </CustomerAccountLayout>
  );
}
