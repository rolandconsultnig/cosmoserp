import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, BookOpen, FileText, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

function CreateAccountModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ code: '', name: '', type: 'ASSET', currency: 'NGN', description: '' });
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (d) => api.post('/accounts', d), onSuccess: () => { qc.invalidateQueries(['accounts']); onClose(); }, onError: (e) => setError(e.response?.data?.error || 'Failed') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Add Account</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Account Code *</label><input required value={form.code} onChange={set('code')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1000" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.type} onChange={set('type')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Account Name *</label><input required value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Cash and Cash Equivalents" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label><input value={form.description} onChange={set('description')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Account
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateJournalModal({ accounts, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ description: '', reference: '', date: new Date().toISOString().split('T')[0] });
  const [lines, setLines] = useState([{ accountId: '', type: 'DEBIT', amount: '' }, { accountId: '', type: 'CREDIT', amount: '' }]);
  const [error, setError] = useState('');
  const mutation = useMutation({ mutationFn: (d) => api.post('/accounts/journal-entries', d), onSuccess: () => { qc.invalidateQueries(['journal-entries']); onClose(); }, onError: (e) => setError(e.response?.data?.error || 'Failed') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setLine = (i, k) => (e) => setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target.value } : l));
  const totalDebits = lines.filter((l) => l.type === 'DEBIT').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const totalCredits = lines.filter((l) => l.type === 'CREDIT').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const payload = useMemo(() => {
    const mapped = (lines || []).map((l) => {
      const amt = parseFloat(l.amount) || 0;
      return {
        accountId: l.accountId,
        description: '',
        debit: l.type === 'DEBIT' ? amt : 0,
        credit: l.type === 'CREDIT' ? amt : 0,
      };
    });
    return { ...form, date: form.date, lines: mapped };
  }, [form, lines]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">New Journal Entry</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Description *</label><input required value={form.description} onChange={set('description')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Reference</label><input value={form.reference} onChange={set('reference')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Date</label><input type="date" value={form.date} onChange={set('date')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="text-left px-3 py-2 font-semibold">Account</th><th className="text-left px-3 py-2 font-semibold">Type</th><th className="text-right px-3 py-2 font-semibold">Amount (₦)</th><th className="w-8" /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1.5"><select value={l.accountId} onChange={setLine(i, 'accountId')} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">Select account…</option>{(accounts || []).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></td>
                  <td className="px-2 py-1.5"><select value={l.type} onChange={setLine(i, 'type')} className="w-24 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></td>
                  <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" value={l.amount} onChange={setLine(i, 'amount')} className="w-28 border border-slate-200 rounded px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                  <td className="px-2 py-1.5">{lines.length > 2 && <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => setLines((ls) => [...ls, { accountId: '', type: 'DEBIT', amount: '' }])} className="text-xs text-blue-600 hover:underline font-medium">+ Add Line</button>
            <div className={cn('text-xs font-medium', balanced ? 'text-green-600' : 'text-red-600')}>
              Dr: {formatCurrency(totalDebits)} | Cr: {formatCurrency(totalCredits)} {balanced ? '✓ Balanced' : '✗ Unbalanced'}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => mutation.mutate(payload)} disabled={mutation.isPending || !balanced}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Post Journal
          </button>
        </div>
      </div>
    </div>
  );
}

const typeColors = { ASSET: 'bg-blue-50 text-blue-700', LIABILITY: 'bg-red-50 text-red-700', EQUITY: 'bg-purple-50 text-purple-700', REVENUE: 'bg-green-50 text-green-700', EXPENSE: 'bg-orange-50 text-orange-700' };

export default function FinancePage() {
  const [tab, setTab] = useState('accounts');
  const [showCreateAcc, setShowCreateAcc] = useState(false);
  const [showCreateJE, setShowCreateJE] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts', { params: { limit: 200 } }).then((r) => r.data.data) });
  const { data: journals } = useQuery({ queryKey: ['journal-entries'], queryFn: () => api.get('/accounts/journal-entries', { params: { limit: 50 } }).then((r) => r.data.data), enabled: tab === 'journals' });
  const { data: periods } = useQuery({ queryKey: ['accounting-periods'], queryFn: () => api.get('/accounts/accounting-periods').then((r) => r.data.data), enabled: tab === 'periods' });
  const { data: trialBalance, isLoading: tbLoading, refetch: refetchTB } = useQuery({
    queryKey: ['trial-balance', asOf],
    queryFn: () => api.get('/accounts/trial-balance', { params: { asOf } }).then((r) => r.data.data),
    enabled: tab === 'trial-balance',
  });

  const qc = useQueryClient();
  const postJournalMutation = useMutation({
    mutationFn: (id) => api.post(`/accounts/journal-entries/${id}/post`),
    onSuccess: () => {
      qc.invalidateQueries(['journal-entries']);
      qc.invalidateQueries(['accounts']);
    },
  });

  const deleteJournalMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/journal-entries/${id}`),
    onSuccess: () => qc.invalidateQueries(['journal-entries']),
  });

  const reverseJournalMutation = useMutation({
    mutationFn: (id) => api.post(`/accounts/journal-entries/${id}/reverse`),
    onSuccess: () => {
      qc.invalidateQueries(['journal-entries']);
      qc.invalidateQueries(['accounts']);
      qc.invalidateQueries(['trial-balance']);
    },
  });

  const createPeriodMutation = useMutation({
    mutationFn: (d) => api.post('/accounts/accounting-periods', d),
    onSuccess: () => {
      qc.invalidateQueries(['accounting-periods']);
      setShowCreatePeriod(false);
    },
  });

  const closePeriodMutation = useMutation({
    mutationFn: (id) => api.post(`/accounts/accounting-periods/${id}/close`),
    onSuccess: () => qc.invalidateQueries(['accounting-periods']),
  });

  const filtered = (accounts || []).filter((a) => !typeFilter || a.type === typeFilter);

  const periodModal = showCreatePeriod ? (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">New Accounting Period</h2><button onClick={() => setShowCreatePeriod(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
        <CreatePeriodForm
          isPending={createPeriodMutation.isPending}
          error={createPeriodMutation.error?.response?.data?.error || ''}
          onSubmit={(d) => createPeriodMutation.mutate(d)}
          onCancel={() => setShowCreatePeriod(false)}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {showCreateAcc && <CreateAccountModal onClose={() => setShowCreateAcc(false)} />}
      {showCreateJE && <CreateJournalModal accounts={accounts} onClose={() => setShowCreateJE(false)} />}
      {periodModal}
      <div className="page-header">
        <div><h1 className="page-title">Finance</h1><p className="page-subtitle">Chart of Accounts and General Ledger</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateAcc(true)} className="border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"><BookOpen className="w-4 h-4" /> Add Account</button>
          <button onClick={() => setShowCreateJE(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><FileText className="w-4 h-4" /> Journal Entry</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {['accounts', 'journals', 'periods', 'trial-balance'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'accounts' ? 'Chart of Accounts' : t === 'journals' ? 'Journal Entries' : t === 'periods' ? 'Accounting Periods' : 'Trial Balance'}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
            </select>
            <span className="text-xs text-slate-400">{filtered.length} accounts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Code</th><th className="text-left px-5 py-3 font-semibold">Account Name</th><th className="text-left px-5 py-3 font-semibold">Type</th><th className="text-right px-5 py-3 font-semibold">Balance</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400">No accounts found</td></tr>}
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 font-semibold">{a.code}</td>
                    <td className="px-5 py-3"><div className="font-medium text-slate-900">{a.name}</div>{a.description && <div className="text-xs text-slate-400">{a.description}</div>}</td>
                    <td className="px-5 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', typeColors[a.type] || 'bg-slate-100 text-slate-600')}>{a.type.replace(/_/g, ' ')}</span></td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(a.balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'journals' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Ref</th><th className="text-left px-5 py-3 font-semibold">Description</th><th className="text-left px-5 py-3 font-semibold">Date</th><th className="text-left px-5 py-3 font-semibold">Status</th><th className="text-right px-5 py-3 font-semibold">Total Dr</th><th className="text-left px-5 py-3 font-semibold">Lines</th><th className="text-right px-5 py-3 font-semibold">Action</th></tr></thead>
              <tbody>
                {(journals || []).length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No journal entries yet</td></tr>}
                {(journals || []).map((je) => {
                  const totalDr = (je.lines || []).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
                  return (
                    <tr key={je.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{je.reference || je.id.slice(0, 8)}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{je.description}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDate(je.date)}</td>
                      <td className="px-5 py-3 text-slate-500">{je.status}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatCurrency(totalDr)}</td>
                      <td className="px-5 py-3 text-slate-500">{(je.lines || []).length} lines</td>
                      <td className="px-5 py-3 text-right">
                        {je.status === 'DRAFT' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => postJournalMutation.mutate(je.id)}
                              disabled={postJournalMutation.isPending || deleteJournalMutation.isPending}
                              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                            >
                              Post
                            </button>
                            <button
                              type="button"
                              title="Delete draft"
                              onClick={() => {
                                if (window.confirm('Delete this draft journal entry?')) deleteJournalMutation.mutate(je.id);
                              }}
                              disabled={postJournalMutation.isPending || deleteJournalMutation.isPending}
                              className="p-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : je.status === 'POSTED' && !(je.reversedBy && je.reversedBy.length) ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Create a reversing posted journal for this entry?')) reverseJournalMutation.mutate(je.id);
                            }}
                            disabled={reverseJournalMutation.isPending}
                            className="px-3 py-1.5 text-xs font-semibold border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-50 disabled:opacity-60"
                          >
                            Reverse
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {je.reversedBy?.length ? 'Reversed' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'periods' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Accounting Periods</div>
            <button onClick={() => setShowCreatePeriod(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><Plus className="w-4 h-4" /> New Period</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Name</th><th className="text-left px-5 py-3 font-semibold">Start</th><th className="text-left px-5 py-3 font-semibold">End</th><th className="text-left px-5 py-3 font-semibold">Status</th><th className="text-right px-5 py-3 font-semibold">Action</th></tr></thead>
              <tbody>
                {(periods || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No accounting periods yet</td></tr>}
                {(periods || []).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(p.startDate)}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(p.endDate)}</td>
                    <td className="px-5 py-3 text-slate-500">{p.isClosed ? 'CLOSED' : 'OPEN'}</td>
                    <td className="px-5 py-3 text-right">
                      {!p.isClosed ? (
                        <button
                          onClick={() => closePeriodMutation.mutate(p.id)}
                          disabled={closePeriodMutation.isPending}
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                        >
                          Close
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'trial-balance' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-3 items-end justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Trial Balance</div>
              <div className="text-xs text-slate-500">As at a date (posted journals only)</div>
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">As of</label>
                <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={() => refetchTB()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Generate</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Code</th><th className="text-left px-5 py-3 font-semibold">Account</th><th className="text-left px-5 py-3 font-semibold">Type</th><th className="text-right px-5 py-3 font-semibold">Debit</th><th className="text-right px-5 py-3 font-semibold">Credit</th></tr></thead>
              <tbody>
                {tbLoading && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading…</td></tr>}
                {!tbLoading && (trialBalance?.rows || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No posted journal activity up to this date</td></tr>}
                {!tbLoading && (trialBalance?.rows || []).map((r) => (
                  <tr key={r.accountId} className="border-b border-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{r.code}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-5 py-3 text-slate-500">{r.type}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(r.debit)}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatCurrency(r.credit)}</td>
                  </tr>
                ))}
                {!tbLoading && trialBalance && (
                  <tr className="bg-slate-50">
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3 font-semibold text-slate-900">Totals</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{trialBalance.isBalanced ? 'BALANCED' : 'NOT BALANCED'}</td>
                    <td className="px-5 py-3 text-right font-black">{formatCurrency(trialBalance.totals?.debit || 0)}</td>
                    <td className="px-5 py-3 text-right font-black">{formatCurrency(trialBalance.totals?.credit || 0)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePeriodForm({ isPending, error, onSubmit, onCancel }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
        <input value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="January 2026" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Start *</label>
          <input type="date" value={form.startDate} onChange={set('startDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">End *</label>
          <input type="date" value={form.endDate} onChange={set('endDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
        <button
          onClick={() => onSubmit(form)}
          disabled={isPending || !form.name || !form.startDate || !form.endDate}
          className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create
        </button>
      </div>
    </div>
  );
}
