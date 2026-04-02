import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, BookOpen, FileText, Trash2, Wallet, BellRing, PiggyBank } from 'lucide-react';
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
  const [scheduleDraft, setScheduleDraft] = useState({});
  const [payDraft, setPayDraft] = useState({});
  const [batchRunForm, setBatchRunForm] = useState({ dueTo: new Date().toISOString().split('T')[0], method: 'BANK_TRANSFER' });
  const [batchRunPreview, setBatchRunPreview] = useState(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [budgetForm, setBudgetForm] = useState({ name: '', fiscalYear: new Date().getFullYear(), startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31`, notes: '' });
  const [budgetLineForm, setBudgetLineForm] = useState({ accountId: '', month: String(new Date().getMonth() + 1), amount: '', category: 'OPEX', costCenter: '', projectCode: '', headcount: '' });
  const [allocationForm, setAllocationForm] = useState({ accountId: '', totalAmount: '', mode: 'EVEN', startMonth: '1', endMonth: '12', seasonalWeights: '', category: 'OPEX', costCenter: '', projectCode: '', headcount: '', notes: '' });
  const [reallocationForm, setReallocationForm] = useState({ sourceLineId: '', targetLineId: '', amount: '' });

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: () => api.get('/accounts', { params: { limit: 200 } }).then((r) => r.data.data) });
  const { data: journals } = useQuery({ queryKey: ['journal-entries'], queryFn: () => api.get('/accounts/journal-entries', { params: { limit: 50 } }).then((r) => r.data.data), enabled: tab === 'journals' });
  const { data: periods } = useQuery({ queryKey: ['accounting-periods'], queryFn: () => api.get('/accounts/accounting-periods').then((r) => r.data.data), enabled: tab === 'periods' });
  const { data: trialBalance, isLoading: tbLoading, refetch: refetchTB } = useQuery({
    queryKey: ['trial-balance', asOf],
    queryFn: () => api.get('/accounts/trial-balance', { params: { asOf } }).then((r) => r.data.data),
    enabled: tab === 'trial-balance',
  });
  const { data: apBillsData } = useQuery({
    queryKey: ['ap-vendor-bills'],
    queryFn: () => api.get('/ap/vendor-bills', { params: { limit: 50 } }).then((r) => r.data),
    enabled: tab === 'ap',
  });
  const { data: dueAlerts } = useQuery({
    queryKey: ['ap-due-alerts'],
    queryFn: () => api.get('/ap/payment-schedules/due-alerts', { params: { days: 7 } }).then((r) => r.data.data),
    enabled: tab === 'ap',
  });
  const { data: arCollections } = useQuery({
    queryKey: ['ar-collections'],
    queryFn: () => api.get('/ar/collections').then((r) => r.data.data),
    enabled: tab === 'ar',
  });
  const { data: arCreditOverview } = useQuery({
    queryKey: ['ar-credit-overview'],
    queryFn: () => api.get('/ar/credit-overview').then((r) => r.data.data),
    enabled: tab === 'ar',
  });
  const { data: budgetsData } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets', { params: { limit: 50 } }).then((r) => r.data),
    enabled: tab === 'budgets',
  });
  const { data: budgetDetailData } = useQuery({
    queryKey: ['budget-detail', selectedBudgetId],
    queryFn: () => api.get(`/budgets/${selectedBudgetId}`).then((r) => r.data.data),
    enabled: tab === 'budgets' && !!selectedBudgetId,
  });
  const { data: budgetVarianceData } = useQuery({
    queryKey: ['budget-variance', selectedBudgetId],
    queryFn: () => api.get(`/budgets/${selectedBudgetId}/variance`).then((r) => r.data.data),
    enabled: tab === 'budgets' && !!selectedBudgetId,
  });
  const { data: budgetControlData } = useQuery({
    queryKey: ['budget-control', selectedBudgetId],
    queryFn: () => api.get(`/budgets/${selectedBudgetId}/control-summary`).then((r) => r.data.data),
    enabled: tab === 'budgets' && !!selectedBudgetId,
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

  const refreshAP = () => {
    qc.invalidateQueries(['ap-vendor-bills']);
    qc.invalidateQueries(['ap-due-alerts']);
  };

  const submitBillApprovalMutation = useMutation({
    mutationFn: (id) => api.post(`/ap/vendor-bills/${id}/submit-approval`),
    onSuccess: refreshAP,
  });
  const reviewBillApprovalMutation = useMutation({
    mutationFn: ({ id, decision }) => api.post(`/ap/vendor-bills/${id}/review-approval`, { decision }),
    onSuccess: refreshAP,
  });
  const postBillMutation = useMutation({
    mutationFn: (id) => api.post(`/ap/vendor-bills/${id}/post`),
    onSuccess: refreshAP,
  });
  const schedulePaymentMutation = useMutation({
    mutationFn: ({ id, amount, dueDate, paymentMethod, autoExecute, approvalLevels, earlyDiscountRate, earlyDiscountDeadline }) => api.post(`/ap/vendor-bills/${id}/payment-schedules`, { amount, dueDate, paymentMethod, autoExecute, approvalLevels, earlyDiscountRate, earlyDiscountDeadline }),
    onSuccess: () => {
      refreshAP();
      setScheduleDraft({});
    },
  });
  const payBillMutation = useMutation({
    mutationFn: ({ id, amount, method, approvalLevels }) => api.post(`/ap/vendor-bills/${id}/payments`, { amount, method, approvalLevels }),
    onSuccess: refreshAP,
  });
  const approvePaymentMutation = useMutation({
    mutationFn: (paymentId) => api.post(`/ap/vendor-bills/payments/${paymentId}/approve`),
    onSuccess: refreshAP,
  });
  const rejectPaymentMutation = useMutation({
    mutationFn: (paymentId) => api.post(`/ap/vendor-bills/payments/${paymentId}/reject`, { reason: 'Rejected from Finance AP dashboard' }),
    onSuccess: refreshAP,
  });
  const batchRunMutation = useMutation({
    mutationFn: ({ dryRun, autoOnly = false }) => api.post(`/ap/payment-runs/${autoOnly ? 'auto-execute' : 'execute'}`, {
      dueTo: batchRunForm.dueTo,
      method: batchRunForm.method,
      dryRun,
    }),
    onSuccess: (res, vars) => {
      if (vars?.dryRun) setBatchRunPreview(res.data?.data || null);
      else {
        setBatchRunPreview(null);
        refreshAP();
      }
    },
  });

  const sendArReminderMutation = useMutation({
    mutationFn: () => api.post('/ar/collections/send-reminders', { channel: 'EMAIL', daysOverdue: 1, limit: 200 }),
    onSuccess: () => {
      qc.invalidateQueries(['ar-collections']);
      qc.invalidateQueries(['ar-credit-overview']);
    },
  });

  const createBudgetMutation = useMutation({
    mutationFn: (payload) => api.post('/budgets', payload),
    onSuccess: (resp) => {
      qc.invalidateQueries(['budgets']);
      setSelectedBudgetId(resp?.data?.data?.id || '');
      setBudgetForm((f) => ({ ...f, name: '', notes: '' }));
    },
  });
  const upsertBudgetLineMutation = useMutation({
    mutationFn: ({ id, lines }) => api.post(`/budgets/${id}/lines/upsert`, { lines }),
    onSuccess: () => {
      qc.invalidateQueries(['budget-detail', selectedBudgetId]);
      qc.invalidateQueries(['budget-variance', selectedBudgetId]);
      qc.invalidateQueries(['budget-control', selectedBudgetId]);
      qc.invalidateQueries(['budgets']);
      setBudgetLineForm((f) => ({ ...f, amount: '' }));
    },
  });
  const allocateBudgetMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/budgets/${id}/allocate`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['budget-detail', selectedBudgetId]);
      qc.invalidateQueries(['budget-variance', selectedBudgetId]);
      qc.invalidateQueries(['budget-control', selectedBudgetId]);
      qc.invalidateQueries(['budgets']);
      setAllocationForm((f) => ({ ...f, totalAmount: '', seasonalWeights: '', notes: '' }));
    },
  });
  const reallocateBudgetMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/budgets/${id}/reallocate`, payload),
    onSuccess: () => {
      qc.invalidateQueries(['budget-detail', selectedBudgetId]);
      qc.invalidateQueries(['budget-variance', selectedBudgetId]);
      qc.invalidateQueries(['budget-control', selectedBudgetId]);
      qc.invalidateQueries(['budgets']);
      setReallocationForm((f) => ({ ...f, amount: '' }));
    },
  });
  const updateBudgetStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/budgets/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['budgets']);
      qc.invalidateQueries(['budget-detail', selectedBudgetId]);
      qc.invalidateQueries(['budget-variance', selectedBudgetId]);
      qc.invalidateQueries(['budget-control', selectedBudgetId]);
    },
  });

  const filtered = (accounts || []).filter((a) => !typeFilter || a.type === typeFilter);
  const apBills = apBillsData?.data || [];
  const budgets = budgetsData?.data || [];
  const budgetDetail = budgetDetailData || null;
  const budgetVariance = budgetVarianceData || null;
  const budgetControl = budgetControlData || null;

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
        {['accounts', 'journals', 'periods', 'trial-balance', 'ap', 'ar', 'budgets'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'accounts'
              ? 'Chart of Accounts'
              : t === 'journals'
                ? 'Journal Entries'
                : t === 'periods'
                  ? 'Accounting Periods'
                  : t === 'trial-balance'
                    ? 'Trial Balance'
                    : t === 'ap'
                      ? 'Accounts Payable'
                      : t === 'ar'
                        ? 'Accounts Receivable'
                        : 'Budgets'}
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

      {tab === 'ap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">Run due up to</div>
                <input type="date" value={batchRunForm.dueTo} onChange={(e) => setBatchRunForm((f) => ({ ...f, dueTo: e.target.value }))} className="border border-slate-200 rounded px-2 py-1.5 text-xs" />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Default Method</div>
                <select value={batchRunForm.method} onChange={(e) => setBatchRunForm((f) => ({ ...f, method: e.target.value }))} className="border border-slate-200 rounded px-2 py-1.5 text-xs">
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="MOBILE_MONEY">Mobile money</option>
                </select>
              </div>
              <button type="button" onClick={() => batchRunMutation.mutate({ dryRun: true, autoOnly: false })} disabled={batchRunMutation.isPending} className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50">Preview batch</button>
              <button type="button" onClick={() => batchRunMutation.mutate({ dryRun: false, autoOnly: false })} disabled={batchRunMutation.isPending} className="px-3 py-1.5 text-xs border border-blue-200 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50">Execute batch</button>
              <button type="button" onClick={() => batchRunMutation.mutate({ dryRun: false, autoOnly: true })} disabled={batchRunMutation.isPending} className="px-3 py-1.5 text-xs border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-50 disabled:opacity-50">Auto-execute schedules</button>
            </div>
            {batchRunPreview && (
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
                Dry run: {batchRunPreview.count || 0} schedules • planned {formatCurrency(batchRunPreview.totalPlanned || 0)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs font-semibold text-slate-500 mb-2">Bills</div><div className="text-2xl font-black">{apBills.length}</div></div>
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs font-semibold text-slate-500 mb-2">Due in 7 days</div><div className="text-2xl font-black text-amber-600">{(dueAlerts || []).length}</div></div>
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs font-semibold text-slate-500 mb-2">Outstanding</div><div className="text-2xl font-black">{formatCurrency(apBills.reduce((s, b) => s + Number(b.amountDue || 0), 0))}</div></div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Bill</th><th className="text-left px-4 py-3 font-semibold">Supplier</th><th className="text-left px-4 py-3 font-semibold">Due</th><th className="text-right px-4 py-3 font-semibold">Amount Due</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold">Payments</th><th className="text-right px-4 py-3 font-semibold">Actions</th></tr></thead>
              <tbody>
                {apBills.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No vendor bills</td></tr>}
                {apBills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.billNumber}</td>
                    <td className="px-4 py-3">{b.supplier?.name || '—'}</td>
                    <td className="px-4 py-3">{formatDate(b.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(b.amountDue || 0)}</td>
                    <td className="px-4 py-3 text-xs">{b.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {(b.payments || []).slice(0, 2).map((p) => (
                          <div key={p.id} className="text-[11px] flex items-center gap-1.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded ${p.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : p.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                            <span>{formatCurrency(Number(p.amount || 0))}</span>
                            {p.status === 'PENDING' && (
                              <>
                                <button type="button" onClick={() => approvePaymentMutation.mutate(p.id)} disabled={approvePaymentMutation.isPending} className="text-emerald-700 hover:underline">Approve</button>
                                <button type="button" onClick={() => rejectPaymentMutation.mutate(p.id)} disabled={rejectPaymentMutation.isPending} className="text-rose-700 hover:underline">Reject</button>
                              </>
                            )}
                          </div>
                        ))}
                        {(b.payments || []).length === 0 && <span className="text-[11px] text-slate-400">No payments</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" onClick={() => submitBillApprovalMutation.mutate(b.id)} disabled={submitBillApprovalMutation.isPending || b.approvalStatus !== 'PENDING'} className="px-2 py-1 text-xs border rounded border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40">Submit</button>
                        <button type="button" onClick={() => reviewBillApprovalMutation.mutate({ id: b.id, decision: 'APPROVE' })} disabled={reviewBillApprovalMutation.isPending || b.approvalStatus !== 'PENDING'} className="px-2 py-1 text-xs border rounded border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Approve</button>
                        <button type="button" onClick={() => reviewBillApprovalMutation.mutate({ id: b.id, decision: 'REJECT' })} disabled={reviewBillApprovalMutation.isPending || b.approvalStatus !== 'PENDING'} className="px-2 py-1 text-xs border rounded border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-40">Reject</button>
                        <button type="button" onClick={() => postBillMutation.mutate(b.id)} disabled={postBillMutation.isPending || b.status !== 'DRAFT'} className="px-2 py-1 text-xs border rounded border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">Post</button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        <input type="number" min="0" step="0.01" value={payDraft[b.id]?.amount || ''} onChange={(e) => setPayDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), amount: e.target.value } }))} placeholder="Pay amount" className="border border-slate-200 rounded px-2 py-1 text-xs" />
                        <select value={payDraft[b.id]?.method || 'BANK_TRANSFER'} onChange={(e) => setPayDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), method: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs">
                          <option value="BANK_TRANSFER">Bank</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="MOBILE_MONEY">Mobile money</option>
                        </select>
                        <select value={payDraft[b.id]?.approvalLevels || ''} onChange={(e) => setPayDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), approvalLevels: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs">
                          <option value="">Auto approvals</option>
                          <option value="1">1 level</option>
                          <option value="2">2 levels</option>
                          <option value="3">3 levels</option>
                        </select>
                        <button type="button" onClick={() => payBillMutation.mutate({ id: b.id, amount: Number(payDraft[b.id]?.amount || 0), method: payDraft[b.id]?.method || 'BANK_TRANSFER', approvalLevels: payDraft[b.id]?.approvalLevels ? Number(payDraft[b.id].approvalLevels) : undefined })} disabled={payBillMutation.isPending || !payDraft[b.id]?.amount} className="px-2 py-1 text-xs border rounded border-slate-200 hover:bg-slate-50 disabled:opacity-50">Pay</button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1">
                        <input type="number" min="0" step="0.01" value={scheduleDraft[b.id]?.amount || ''} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), amount: e.target.value } }))} placeholder="Schedule amount" className="border border-slate-200 rounded px-2 py-1 text-xs" />
                        <input type="date" value={scheduleDraft[b.id]?.dueDate || ''} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), dueDate: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs" />
                        <select value={scheduleDraft[b.id]?.paymentMethod || 'BANK_TRANSFER'} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), paymentMethod: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs">
                          <option value="BANK_TRANSFER">Bank</option>
                          <option value="CHEQUE">Cheque</option>
                          <option value="MOBILE_MONEY">Mobile money</option>
                        </select>
                        <select value={scheduleDraft[b.id]?.approvalLevels || ''} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), approvalLevels: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs">
                          <option value="">Auto approvals</option>
                          <option value="1">1 level</option>
                          <option value="2">2 levels</option>
                          <option value="3">3 levels</option>
                        </select>
                        <input type="number" min="0" max="0.5" step="0.01" value={scheduleDraft[b.id]?.earlyDiscountRate || ''} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), earlyDiscountRate: e.target.value } }))} placeholder="Discount rate" className="border border-slate-200 rounded px-2 py-1 text-xs" />
                        <input type="date" value={scheduleDraft[b.id]?.earlyDiscountDeadline || ''} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), earlyDiscountDeadline: e.target.value } }))} className="border border-slate-200 rounded px-2 py-1 text-xs" />
                        <label className="text-[11px] text-slate-600 inline-flex items-center gap-1">
                          <input type="checkbox" checked={!!scheduleDraft[b.id]?.autoExecute} onChange={(e) => setScheduleDraft((d) => ({ ...d, [b.id]: { ...(d[b.id] || {}), autoExecute: e.target.checked } }))} /> Auto
                        </label>
                        <button type="button" onClick={() => schedulePaymentMutation.mutate({ id: b.id, amount: Number(scheduleDraft[b.id]?.amount || 0), dueDate: scheduleDraft[b.id]?.dueDate, paymentMethod: scheduleDraft[b.id]?.paymentMethod || 'BANK_TRANSFER', autoExecute: !!scheduleDraft[b.id]?.autoExecute, approvalLevels: scheduleDraft[b.id]?.approvalLevels ? Number(scheduleDraft[b.id].approvalLevels) : undefined, earlyDiscountRate: scheduleDraft[b.id]?.earlyDiscountRate ? Number(scheduleDraft[b.id].earlyDiscountRate) : undefined, earlyDiscountDeadline: scheduleDraft[b.id]?.earlyDiscountDeadline || undefined })} disabled={schedulePaymentMutation.isPending || !scheduleDraft[b.id]?.amount || !scheduleDraft[b.id]?.dueDate} className="px-2 py-1 text-xs border rounded border-slate-200 hover:bg-slate-50 disabled:opacity-50">Schedule</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Collections</div>
              <div className="text-xs text-slate-500">Send reminders for overdue invoices.</div>
            </div>
            <button
              type="button"
              onClick={() => sendArReminderMutation.mutate()}
              disabled={sendArReminderMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              {sendArReminderMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
              Send overdue reminders
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Open invoices</div><div className="text-2xl font-black">{arCollections?.summary?.totalOpenInvoices || 0}</div></div>
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Outstanding</div><div className="text-2xl font-black">{formatCurrency(arCollections?.summary?.totalOutstanding || 0)}</div></div>
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Due today</div><div className="text-2xl font-black text-amber-600">{arCollections?.summary?.dueTodayCount || 0}</div></div>
            <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Overdue</div><div className="text-2xl font-black text-red-600">{arCollections?.summary?.overdueCount || 0}</div></div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Invoice</th><th className="text-left px-4 py-3 font-semibold">Customer</th><th className="text-left px-4 py-3 font-semibold">Due</th><th className="text-right px-4 py-3 font-semibold">Amount Due</th><th className="text-left px-4 py-3 font-semibold">Last Reminder</th></tr></thead>
              <tbody>
                {(arCollections?.invoices || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No open receivables</td></tr>}
                {(arCollections?.invoices || []).map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{inv.customer?.name || '—'}</td>
                    <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.amountDue || 0)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{inv.reminders?.[0]?.createdAt ? formatDate(inv.reminders[0].createdAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Customer Credit Overview</div>
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Customer</th><th className="text-right px-4 py-3 font-semibold">Limit</th><th className="text-right px-4 py-3 font-semibold">Used</th><th className="text-right px-4 py-3 font-semibold">Available</th><th className="text-right px-4 py-3 font-semibold">Overdue</th></tr></thead>
              <tbody>
                {(arCreditOverview || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No customer credit lines</td></tr>}
                {(arCreditOverview || []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.creditLimit || 0)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.creditUsed || 0)} <span className="text-[11px] text-slate-400">({c.utilizationPct || 0}%)</span></td>
                    <td className="px-4 py-3 text-right">{formatCurrency(c.availableCredit || 0)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(c.overdueAmount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'budgets' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3"><PiggyBank className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-semibold text-slate-900">Create Budget</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input value={budgetForm.name} onChange={(e) => setBudgetForm((f) => ({ ...f, name: e.target.value }))} placeholder="Budget name" className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input type="number" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm((f) => ({ ...f, fiscalYear: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input type="date" value={budgetForm.startDate} onChange={(e) => setBudgetForm((f) => ({ ...f, startDate: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input type="date" value={budgetForm.endDate} onChange={(e) => setBudgetForm((f) => ({ ...f, endDate: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <button
                type="button"
                onClick={() => createBudgetMutation.mutate(budgetForm)}
                disabled={createBudgetMutation.isPending || !budgetForm.name}
                className="px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {createBudgetMutation.isPending ? 'Creating...' : 'Create Budget'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Budgets</div>
              <div className="divide-y divide-slate-100">
                {budgets.length === 0 && <div className="px-4 py-6 text-sm text-slate-400">No budgets yet</div>}
                {budgets.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBudgetId(b.id)}
                    className={cn('w-full text-left px-4 py-3 hover:bg-slate-50', selectedBudgetId === b.id && 'bg-slate-50')}
                  >
                    <div className="text-sm font-semibold text-slate-900">{b.name}</div>
                    <div className="text-xs text-slate-500">FY {b.fiscalYear} • {b.status} • {b._count?.lines || 0} lines</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {budgetDetail ? (
                <>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{budgetDetail.name} (FY {budgetDetail.fiscalYear})</div>
                        <div className="text-xs text-slate-500">Status: {budgetDetail.status}</div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateBudgetStatusMutation.mutate({ id: budgetDetail.id, status: 'APPROVED' })} disabled={updateBudgetStatusMutation.isPending || budgetDetail.status === 'APPROVED'} className="px-2.5 py-1 text-xs border border-blue-200 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50">Approve</button>
                        <button type="button" onClick={() => updateBudgetStatusMutation.mutate({ id: budgetDetail.id, status: 'LOCKED' })} disabled={updateBudgetStatusMutation.isPending || budgetDetail.status === 'LOCKED'} className="px-2.5 py-1 text-xs border border-rose-200 text-rose-700 rounded hover:bg-rose-50 disabled:opacity-50">Lock</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <select value={budgetLineForm.accountId} onChange={(e) => setBudgetLineForm((f) => ({ ...f, accountId: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        <option value="">Select account</option>
                        {(accounts || []).filter((a) => ['REVENUE', 'EXPENSE'].includes(a.type)).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <select value={budgetLineForm.month} onChange={(e) => setBudgetLineForm((f) => ({ ...f, month: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{`Month ${m}`}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" value={budgetLineForm.amount} onChange={(e) => setBudgetLineForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Budget amount" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <select value={budgetLineForm.category} onChange={(e) => setBudgetLineForm((f) => ({ ...f, category: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        {['OPEX', 'CAPEX', 'HEADCOUNT', 'SALARY', 'PROJECT'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input value={budgetLineForm.costCenter} onChange={(e) => setBudgetLineForm((f) => ({ ...f, costCenter: e.target.value }))} placeholder="Cost center / Department" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <input value={budgetLineForm.projectCode} onChange={(e) => setBudgetLineForm((f) => ({ ...f, projectCode: e.target.value }))} placeholder="Project code" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <input type="number" min="0" step="1" value={budgetLineForm.headcount} onChange={(e) => setBudgetLineForm((f) => ({ ...f, headcount: e.target.value }))} placeholder="Headcount (optional)" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <button
                        type="button"
                        onClick={() => upsertBudgetLineMutation.mutate({ id: budgetDetail.id, lines: [{ accountId: budgetLineForm.accountId, month: Number(budgetLineForm.month), amount: Number(budgetLineForm.amount || 0), category: budgetLineForm.category, costCenter: budgetLineForm.costCenter, projectCode: budgetLineForm.projectCode, headcount: budgetLineForm.headcount ? Number(budgetLineForm.headcount) : null, allocationMode: 'MANUAL' }] })}
                        disabled={upsertBudgetLineMutation.isPending || !budgetLineForm.accountId || !budgetLineForm.amount || budgetDetail.status === 'LOCKED'}
                        className="px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Save Line
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                    <div className="text-sm font-semibold text-slate-900">Budget Allocation (Even / Seasonal)</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <select value={allocationForm.accountId} onChange={(e) => setAllocationForm((f) => ({ ...f, accountId: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        <option value="">Select account</option>
                        {(accounts || []).filter((a) => ['REVENUE', 'EXPENSE'].includes(a.type)).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" value={allocationForm.totalAmount} onChange={(e) => setAllocationForm((f) => ({ ...f, totalAmount: e.target.value }))} placeholder="Total amount" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <select value={allocationForm.mode} onChange={(e) => setAllocationForm((f) => ({ ...f, mode: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        <option value="EVEN">Even spread</option>
                        <option value="SEASONAL">Seasonal</option>
                      </select>
                      <select value={allocationForm.category} onChange={(e) => setAllocationForm((f) => ({ ...f, category: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        {['OPEX', 'CAPEX', 'HEADCOUNT', 'SALARY', 'PROJECT'].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={allocationForm.startMonth} onChange={(e) => setAllocationForm((f) => ({ ...f, startMonth: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{`Start M${m}`}</option>)}
                      </select>
                      <select value={allocationForm.endMonth} onChange={(e) => setAllocationForm((f) => ({ ...f, endMonth: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{`End M${m}`}</option>)}
                      </select>
                      <input value={allocationForm.costCenter} onChange={(e) => setAllocationForm((f) => ({ ...f, costCenter: e.target.value }))} placeholder="Department / cost center" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <input value={allocationForm.projectCode} onChange={(e) => setAllocationForm((f) => ({ ...f, projectCode: e.target.value }))} placeholder="Project code" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <input type="number" min="0" step="1" value={allocationForm.headcount} onChange={(e) => setAllocationForm((f) => ({ ...f, headcount: e.target.value }))} placeholder="Headcount (optional)" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <input value={allocationForm.seasonalWeights} onChange={(e) => setAllocationForm((f) => ({ ...f, seasonalWeights: e.target.value }))} placeholder="Seasonal weights (comma-separated)" className="border border-slate-200 rounded px-3 py-2 text-sm md:col-span-2" />
                      <input value={allocationForm.notes} onChange={(e) => setAllocationForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <button
                        type="button"
                        onClick={() => allocateBudgetMutation.mutate({
                          id: budgetDetail.id,
                          payload: {
                            accountId: allocationForm.accountId,
                            totalAmount: Number(allocationForm.totalAmount || 0),
                            mode: allocationForm.mode,
                            startMonth: Number(allocationForm.startMonth),
                            endMonth: Number(allocationForm.endMonth),
                            seasonalWeights: allocationForm.seasonalWeights
                              ? allocationForm.seasonalWeights.split(',').map((w) => Number(String(w).trim())).filter((n) => Number.isFinite(n) && n > 0)
                              : [],
                            category: allocationForm.category,
                            costCenter: allocationForm.costCenter,
                            projectCode: allocationForm.projectCode,
                            headcount: allocationForm.headcount ? Number(allocationForm.headcount) : null,
                            notes: allocationForm.notes,
                          },
                        })}
                        disabled={allocateBudgetMutation.isPending || !allocationForm.accountId || !allocationForm.totalAmount || budgetDetail.status === 'LOCKED'}
                        className="px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Allocate
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                    <div className="text-sm font-semibold text-slate-900">Re-allocate Between Line Items</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <select value={reallocationForm.sourceLineId} onChange={(e) => setReallocationForm((f) => ({ ...f, sourceLineId: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        <option value="">Source line</option>
                        {(budgetDetail.lines || []).map((l) => (
                          <option key={l.id} value={l.id}>{`${l.account?.code} M${l.month} ${l.category || 'OPEX'} ${l.costCenter || ''} ${l.projectCode || ''} (${formatCurrency(l.amount || 0)})`}</option>
                        ))}
                      </select>
                      <select value={reallocationForm.targetLineId} onChange={(e) => setReallocationForm((f) => ({ ...f, targetLineId: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                        <option value="">Target line</option>
                        {(budgetDetail.lines || []).map((l) => (
                          <option key={l.id} value={l.id}>{`${l.account?.code} M${l.month} ${l.category || 'OPEX'} ${l.costCenter || ''} ${l.projectCode || ''} (${formatCurrency(l.amount || 0)})`}</option>
                        ))}
                      </select>
                      <input type="number" min="0" step="0.01" value={reallocationForm.amount} onChange={(e) => setReallocationForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Re-allocation amount" className="border border-slate-200 rounded px-3 py-2 text-sm" />
                      <button
                        type="button"
                        onClick={() => reallocateBudgetMutation.mutate({ id: budgetDetail.id, payload: { sourceLineId: reallocationForm.sourceLineId, targetLineId: reallocationForm.targetLineId, amount: Number(reallocationForm.amount || 0) } })}
                        disabled={reallocateBudgetMutation.isPending || !reallocationForm.sourceLineId || !reallocationForm.targetLineId || !reallocationForm.amount || budgetDetail.status === 'LOCKED'}
                        className="px-3 py-2 text-sm font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                      >
                        Re-allocate
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Budgeted</div><div className="text-lg font-black">{formatCurrency(budgetControl?.totals?.budgeted || 0)}</div></div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Actual</div><div className="text-lg font-black">{formatCurrency(budgetControl?.totals?.actual || 0)}</div></div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Utilization</div><div className={cn('text-lg font-black', (budgetControl?.totals?.utilizationPct || 0) >= 100 ? 'text-rose-600' : (budgetControl?.totals?.utilizationPct || 0) >= 90 ? 'text-amber-600' : 'text-emerald-600')}>{(budgetControl?.totals?.utilizationPct || 0).toFixed(1)}%</div></div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Committed Costs (Open POs)</div><div className="text-lg font-black text-indigo-700">{formatCurrency(budgetControl?.totals?.committedCosts || 0)}</div></div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4"><div className="text-xs text-slate-500">Alerts</div><div className="text-xs text-slate-700 font-semibold">Exceeded: {budgetControl?.alerts?.exceeded || 0} • Near: {budgetControl?.alerts?.nearLimit || 0}</div></div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                    <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Budget Utilization by Category</div>
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Category</th><th className="text-right px-4 py-3 font-semibold">Budgeted</th><th className="text-right px-4 py-3 font-semibold">Actual</th><th className="text-right px-4 py-3 font-semibold">Variance</th><th className="text-right px-4 py-3 font-semibold">Utilization</th></tr></thead>
                      <tbody>
                        {Object.keys(budgetControl?.categoryTotals || {}).length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">No category totals yet</td></tr>}
                        {Object.entries(budgetControl?.categoryTotals || {}).map(([key, row]) => (
                          <tr key={key} className="border-b border-slate-50">
                            <td className="px-4 py-3 font-semibold">{key}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.budgeted || 0)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.actual || 0)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.variance || 0)}</td>
                            <td className={cn('px-4 py-3 text-right font-semibold', (row.utilizationPct || 0) >= 100 ? 'text-rose-600' : (row.utilizationPct || 0) >= 90 ? 'text-amber-600' : 'text-emerald-600')}>{(row.utilizationPct || 0).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Account</th><th className="text-left px-4 py-3 font-semibold">Month</th><th className="text-left px-4 py-3 font-semibold">Category</th><th className="text-left px-4 py-3 font-semibold">Cost Center</th><th className="text-left px-4 py-3 font-semibold">Project</th><th className="text-right px-4 py-3 font-semibold">Budgeted</th><th className="text-right px-4 py-3 font-semibold">Actual</th><th className="text-right px-4 py-3 font-semibold">Variance</th><th className="text-right px-4 py-3 font-semibold">Utilization</th><th className="text-left px-4 py-3 font-semibold">Alert</th></tr></thead>
                      <tbody>
                        {(budgetVariance?.rows || []).length === 0 && <tr><td colSpan={10} className="text-center py-8 text-slate-400">No budget lines yet</td></tr>}
                        {(budgetVariance?.rows || []).map((row) => (
                          <tr key={row.id} className="border-b border-slate-50">
                            <td className="px-4 py-3">{row.account?.code} — {row.account?.name}</td>
                            <td className="px-4 py-3">{row.month}</td>
                            <td className="px-4 py-3">{row.category || 'OPEX'}</td>
                            <td className="px-4 py-3">{row.costCenter || '—'}</td>
                            <td className="px-4 py-3">{row.projectCode || '—'}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.budgeted || 0)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.actual || 0)}</td>
                            <td className={cn('px-4 py-3 text-right font-semibold', (row.variance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600')}>{formatCurrency(row.variance || 0)}</td>
                            <td className={cn('px-4 py-3 text-right font-semibold', (row.utilizationPct || 0) >= 100 ? 'text-rose-600' : (row.utilizationPct || 0) >= 90 ? 'text-amber-600' : 'text-emerald-600')}>{(row.utilizationPct || 0).toFixed(1)}%</td>
                            <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', row.alertLevel === 'EXCEEDED' ? 'bg-rose-50 text-rose-700' : row.alertLevel === 'NEAR_LIMIT' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{row.alertLevel || 'OK'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-semibold text-slate-900">
                          <td className="px-4 py-3" colSpan={5}>Totals</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(budgetVariance?.totals?.budgeted || 0)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(budgetVariance?.totals?.actual || 0)}</td>
                          <td className={cn('px-4 py-3 text-right', (budgetVariance?.totals?.variance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600')}>{formatCurrency(budgetVariance?.totals?.variance || 0)}</td>
                          <td className="px-4 py-3 text-right">—</td>
                          <td className="px-4 py-3">—</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">Select a budget to manage lines and variance.</div>
              )}
            </div>
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
