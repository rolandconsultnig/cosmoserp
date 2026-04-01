import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, BookOpen, FileText, Trash2, Wallet, BellRing, PiggyBank, TrendingUp, Scale, Banknote } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { FINANCE_FEATURE_CATALOG } from '../../../shared/financeFeatureCatalog';
import ApPaymentProcessingPanel from '../components/ApPaymentProcessingPanel';

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

function CreateMatchedVendorBillModal({ onClose, initialPoId = '', initialSupplierId = '' }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [billNumber, setBillNumber] = useState(`VB-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setSupplierId(initialSupplierId || '');
  }, [initialSupplierId]);

  const { data: candidates } = useQuery({
    queryKey: ['ap-po-matching-candidates', supplierId, initialPoId],
    queryFn: () => api.get('/ap/matching/po-lines', {
      params: { supplierId: supplierId || undefined, poId: initialPoId || undefined },
    }).then((r) => r.data.data),
  });

  const groupedSuppliers = useMemo(() => {
    const seen = new Map();
    (candidates || []).forEach((c) => {
      if (!seen.has(c.supplierId)) seen.set(c.supplierId, { id: c.supplierId, name: c.supplierName });
    });
    return Array.from(seen.values());
  }, [candidates]);

  const selectedLines = lines.filter((l) => l.selected);
  const selectedSupplierId = selectedLines[0]?.supplierId || supplierId;

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/ap/vendor-bills', payload),
    onSuccess: () => {
      qc.invalidateQueries(['ap-vendor-bills']);
      qc.invalidateQueries(['ap-due-alerts']);
      onClose();
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create matched vendor bill'),
  });

  const visible = useMemo(
    () => (candidates || []).filter((c) => !supplierId || c.supplierId === supplierId),
    [candidates, supplierId],
  );

  const toggleLine = (line) => {
    setLines((prev) => {
      const idx = prev.findIndex((x) => x.poLineId === line.poLineId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], selected: !copy[idx].selected };
        return copy;
      }
      return [
        ...prev,
        {
          poLineId: line.poLineId,
          supplierId: line.supplierId,
          description: line.description,
          quantity: line.maxInvoiceableQty,
          unitPrice: Number(line.unitPrice || 0),
          vatRate: Number(line.vatRate || 0.075),
          selected: true,
          maxInvoiceableQty: line.maxInvoiceableQty,
        },
      ];
    });
  };

  const updateLine = (poLineId, key, value) => {
    setLines((prev) => prev.map((l) => {
      if (l.poLineId !== poLineId) return l;
      const next = { ...l, [key]: value };
      if (key === 'quantity') {
        const q = Number(value || 0);
        next.quantity = q > l.maxInvoiceableQty ? l.maxInvoiceableQty : q;
      }
      return next;
    }));
  };

  const submit = () => {
    if (!selectedSupplierId) return setError('Select at least one PO line to create bill');
    if (!billNumber.trim()) return setError('Bill number is required');
    if (!dueDate) return setError('Due date is required');
    const payloadLines = selectedLines.map((l) => ({
      poLineId: l.poLineId,
      description: l.description,
      quantity: Number(l.quantity || 0),
      unitPrice: Number(l.unitPrice || 0),
      vatRate: Number(l.vatRate || 0),
      whtRate: 0,
    })).filter((l) => l.quantity > 0);
    if (!payloadLines.length) return setError('Selected lines must have invoice quantity > 0');
    mutation.mutate({
      supplierId: selectedSupplierId,
      billNumber: billNumber.trim(),
      billDate,
      dueDate,
      lines: payloadLines,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Matched Vendor Bill (PO 3-way)</h2>
            {initialPoId && (
              <p className="text-xs text-slate-500 mt-1">Showing lines for one purchase order (received qty vs invoice).</p>
            )}
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplier Filter</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">All suppliers</option>
              {groupedSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bill Number *</label>
            <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bill Date</label>
            <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-3 py-2 font-semibold">Pick</th>
                <th className="text-left px-3 py-2 font-semibold">PO / Supplier</th>
                <th className="text-left px-3 py-2 font-semibold">Item</th>
                <th className="text-right px-3 py-2 font-semibold">Available Qty</th>
                <th className="text-right px-3 py-2 font-semibold">Invoice Qty</th>
                <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No received PO lines available for matching.</td></tr>
              )}
              {visible.map((line) => {
                const selected = lines.find((l) => l.poLineId === line.poLineId)?.selected;
                const lineDraft = lines.find((l) => l.poLineId === line.poLineId);
                return (
                  <tr key={line.poLineId} className="border-b border-slate-50">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleLine(line)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{line.poNumber}</div>
                      <div className="text-[11px] text-slate-500">{line.supplierName}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{line.productName || line.description}</div>
                      <div className="text-[11px] text-slate-500">{line.description}</div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{line.maxInvoiceableQty}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        max={line.maxInvoiceableQty}
                        step="0.001"
                        disabled={!selected}
                        value={lineDraft?.quantity ?? ''}
                        onChange={(e) => updateLine(line.poLineId, 'quantity', Number(e.target.value))}
                        className="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-right disabled:bg-slate-50"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!selected}
                        value={lineDraft?.unitPrice ?? Number(line.unitPrice || 0)}
                        onChange={(e) => updateLine(line.poLineId, 'unitPrice', Number(e.target.value))}
                        className="w-28 border border-slate-200 rounded px-2 py-1 text-xs text-right disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Matched Bill
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateBillNoteModal({ bill, defaultType = 'CREDIT', onClose, onSubmit }) {
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  const { data: notesData, isLoading } = useQuery({
    queryKey: ['ap-bill-notes', bill?.id],
    queryFn: () => api.get(`/ap/vendor-bills/${bill.id}/notes`).then((r) => r.data.data),
    enabled: !!bill?.id,
  });

  const notes = notesData || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Apply AP Note - {bill?.billNumber}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="CREDIT">Credit note</option>
              <option value="DEBIT">Debit note</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Reason" />
          </div>
        </div>

        <div className="flex gap-2 justify-end mb-4">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onSubmit({ id: bill.id, type, amount: Number(amount || 0), reason, reference })}
            disabled={!Number(amount) || Number(amount) <= 0 || !reason.trim()}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Apply note
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Note History</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-2 font-semibold">Type</th>
                <th className="text-right px-4 py-2 font-semibold">Amount</th>
                <th className="text-left px-4 py-2 font-semibold">Reference</th>
                <th className="text-left px-4 py-2 font-semibold">Reason</th>
                <th className="text-left px-4 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="text-center py-6 text-slate-400">Loading notes...</td></tr>}
              {!isLoading && notes.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-400">No notes yet</td></tr>}
              {!isLoading && notes.map((n) => (
                <tr key={n.id} className="border-b border-slate-50">
                  <td className="px-4 py-2"><span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', n.method === 'CREDIT_NOTE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>{n.method === 'CREDIT_NOTE' ? 'Credit' : 'Debit'}</span></td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(n.amount || 0)}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{n.reference || '-'}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{n.notes || '-'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{formatDate(n.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateFixedAssetModal({ accounts, onClose, onSubmit, isPending, error }) {
  const [form, setForm] = useState({
    assetCode: `FA-${Date.now().toString().slice(-6)}`,
    name: '',
    description: '',
    cost: '',
    salvageValue: '0',
    usefulLifeMonths: '36',
    inServiceDate: new Date().toISOString().split('T')[0],
    assetAccountId: '',
    depreciationExpenseAccountId: '',
    accumulatedDepreciationAccountId: '',
  });

  const assetAccounts = (accounts || []).filter((a) => a.type === 'ASSET');
  const expenseAccounts = (accounts || []).filter((a) => a.type === 'EXPENSE');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const monthly = useMemo(() => {
    const base = (parseFloat(form.cost) || 0) - (parseFloat(form.salvageValue) || 0);
    const life = parseInt(form.usefulLifeMonths, 10) || 0;
    return life > 0 ? base / life : 0;
  }, [form.cost, form.salvageValue, form.usefulLifeMonths]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">New Fixed Asset</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Asset Code *</label>
            <input value={form.assetCode} onChange={set('assetCode')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">In-service date *</label>
            <input type="date" value={form.inServiceDate} onChange={set('inServiceDate')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Asset name *</label>
            <input value={form.name} onChange={set('name')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input value={form.description} onChange={set('description')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cost *</label>
            <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Salvage value</label>
            <input type="number" min="0" step="0.01" value={form.salvageValue} onChange={set('salvageValue')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Useful life (months) *</label>
            <input type="number" min="1" step="1" value={form.usefulLifeMonths} onChange={set('usefulLifeMonths')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="text-xs text-slate-500 flex items-end">
            Monthly (straight-line): {formatCurrency(monthly > 0 ? monthly : 0)}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Asset account (debit) *</label>
            <select value={form.assetAccountId} onChange={set('assetAccountId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select asset account…</option>
              {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Depreciation expense account (debit) *</label>
            <select value={form.depreciationExpenseAccountId} onChange={set('depreciationExpenseAccountId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select expense account…</option>
              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Accumulated depreciation account (credit) *</label>
            <select value={form.accumulatedDepreciationAccountId} onChange={set('accumulatedDepreciationAccountId')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select contra-asset account…</option>
              {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
            <div className="text-[11px] text-slate-500 mt-1">Tip: create an ASSET account like “Accumulated Depreciation” (it will carry a negative balance).</div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => onSubmit(form)}
            disabled={isPending || !form.assetCode || !form.name || !form.cost || !form.usefulLifeMonths || !form.inServiceDate || !form.assetAccountId || !form.depreciationExpenseAccountId || !form.accumulatedDepreciationAccountId}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Create Asset
          </button>
        </div>
      </div>
    </div>
  );
}

const typeColors = { ASSET: 'bg-blue-50 text-blue-700', LIABILITY: 'bg-red-50 text-red-700', EQUITY: 'bg-purple-50 text-purple-700', REVENUE: 'bg-green-50 text-green-700', EXPENSE: 'bg-orange-50 text-orange-700' };

export default function FinancePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('accounts');
  const [showCreateAcc, setShowCreateAcc] = useState(false);
  const [showCreateJE, setShowCreateJE] = useState(false);
  const [showCreateMatchedBill, setShowCreateMatchedBill] = useState(false);

  const closeMatchedVendorBillModal = () => {
    setShowCreateMatchedBill(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openMatched');
      next.delete('poId');
      next.delete('supplierId');
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (searchParams.get('tab') === 'ap') setTab('ap');
    if (searchParams.get('openMatched') === '1') setShowCreateMatchedBill(true);
  }, [searchParams]);
  const [billNoteModal, setBillNoteModal] = useState({ open: false, bill: null, type: 'CREDIT' });
  const [reconForm, setReconForm] = useState({ accountId: '', statementDate: new Date().toISOString().split('T')[0], openingBalance: '', closingBalance: '', notes: '' });
  const [selectedReconId, setSelectedReconId] = useState('');
  const [statementInput, setStatementInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState({});
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [budgetForm, setBudgetForm] = useState({ name: '', fiscalYear: new Date().getFullYear(), startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31`, notes: '' });
  const [budgetLineForm, setBudgetLineForm] = useState({ accountId: '', month: String(new Date().getMonth() + 1), amount: '', category: 'OPEX', costCenter: '', projectCode: '', headcount: '' });
  const [allocationForm, setAllocationForm] = useState({ accountId: '', totalAmount: '', mode: 'EVEN', startMonth: '1', endMonth: '12', seasonalWeights: '', category: 'OPEX', costCenter: '', projectCode: '', headcount: '', notes: '' });
  const [reallocationForm, setReallocationForm] = useState({ sourceLineId: '', targetLineId: '', amount: '' });
  const [apSubTab, setApSubTab] = useState('vendor-bills');
  const [stmtTab, setStmtTab] = useState('pl');
  const [stmtFrom, setStmtFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [stmtTo, setStmtTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [showCreateFA, setShowCreateFA] = useState(false);
  const [depAsOf, setDepAsOf] = useState(() => new Date().toISOString().split('T')[0]);

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
  const { data: reconSessions } = useQuery({
    queryKey: ['bank-recon-sessions'],
    queryFn: () => api.get('/accounts/bank-reconciliation/sessions').then((r) => r.data.data),
    enabled: tab === 'bank-reconciliation',
  });
  const { data: reconDetailData } = useQuery({
    queryKey: ['bank-recon-detail', selectedReconId],
    queryFn: () => api.get(`/accounts/bank-reconciliation/sessions/${selectedReconId}`).then((r) => r.data.data),
    enabled: tab === 'bank-reconciliation' && !!selectedReconId,
  });

  const { data: stmtPl, isLoading: stmtPlLoading, refetch: refetchStmtPl } = useQuery({
    queryKey: ['report', 'pl', stmtFrom, stmtTo],
    queryFn: () => api.get('/reports/profit-loss', { params: { from: stmtFrom, to: stmtTo, basis: 'gl' } }).then((r) => r.data.data),
    enabled: tab === 'financial-statements' && stmtTab === 'pl',
  });
  const { data: stmtBs, isLoading: stmtBsLoading, refetch: refetchStmtBs } = useQuery({
    queryKey: ['report', 'bs', stmtTo],
    queryFn: () => api.get('/reports/balance-sheet', { params: { asOf: stmtTo, basis: 'gl' } }).then((r) => r.data.data),
    enabled: tab === 'financial-statements' && stmtTab === 'bs',
  });
  const { data: stmtCf, isLoading: stmtCfLoading, refetch: refetchStmtCf } = useQuery({
    queryKey: ['report', 'cf', stmtFrom, stmtTo],
    queryFn: () => api.get('/reports/cash-flow', { params: { from: stmtFrom, to: stmtTo } }).then((r) => r.data.data),
    enabled: tab === 'financial-statements' && stmtTab === 'cf',
  });
  const { data: fixedAssetsData } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: () => api.get('/fixed-assets').then((r) => r.data.data),
    enabled: tab === 'fixed-assets',
  });

  const qc = useQueryClient();
  const postJournalMutation = useMutation({
    mutationFn: (id) => api.post(`/accounts/journal-entries/${id}/post`),
    onSuccess: () => {
      qc.invalidateQueries(['journal-entries']);
      qc.invalidateQueries(['accounts']);
      qc.invalidateQueries({ queryKey: ['report'] });
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
      qc.invalidateQueries({ queryKey: ['report'] });
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

  const createFixedAssetMutation = useMutation({
    mutationFn: (payload) => api.post('/fixed-assets', payload),
    onSuccess: () => {
      qc.invalidateQueries(['fixed-assets']);
      setShowCreateFA(false);
    },
  });
  const runDepreciationMutation = useMutation({
    mutationFn: (payload) => api.post('/fixed-assets/run-depreciation', payload),
    onSuccess: () => {
      qc.invalidateQueries(['fixed-assets']);
      qc.invalidateQueries(['accounts']);
      qc.invalidateQueries({ queryKey: ['report'] });
    },
  });

  const refreshAP = () => {
    qc.invalidateQueries(['ap-vendor-bills']);
    qc.invalidateQueries(['ap-due-alerts']);
    qc.invalidateQueries(['ap-payment-batches']);
    qc.invalidateQueries(['ap-payments-list']);
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
    mutationFn: ({ id, amount, dueDate }) => api.post(`/ap/vendor-bills/${id}/payment-schedules`, { amount, dueDate }),
    onSuccess: () => {
      refreshAP();
      setScheduleDraft({});
    },
  });
  const payBillMutation = useMutation({
    mutationFn: ({ id, amount }) => api.post(`/ap/vendor-bills/${id}/payments`, { amount, method: 'BANK_TRANSFER' }),
    onSuccess: refreshAP,
  });
  const createBillNoteMutation = useMutation({
    mutationFn: ({ id, type, amount, reason, reference }) => api.post(`/ap/vendor-bills/${id}/notes`, { type, amount, reason, reference }),
    onSuccess: refreshAP,
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
  const refreshRecon = () => {
    qc.invalidateQueries(['bank-recon-sessions']);
    if (selectedReconId) qc.invalidateQueries(['bank-recon-detail', selectedReconId]);
  };
  const createReconSessionMutation = useMutation({
    mutationFn: (payload) => api.post('/accounts/bank-reconciliation/sessions', payload),
    onSuccess: (resp) => {
      refreshRecon();
      setSelectedReconId(resp?.data?.data?.id || '');
    },
  });
  const importReconLinesMutation = useMutation({
    mutationFn: ({ id, lines }) => api.post(`/accounts/bank-reconciliation/sessions/${id}/import-lines`, { lines }),
    onSuccess: () => {
      setStatementInput('');
      refreshRecon();
    },
  });
  const matchReconLineMutation = useMutation({
    mutationFn: ({ lineId, journalEntryId }) => api.post(`/accounts/bank-reconciliation/lines/${lineId}/match`, { journalEntryId }),
    onSuccess: refreshRecon,
  });
  const unmatchReconLineMutation = useMutation({
    mutationFn: (lineId) => api.post(`/accounts/bank-reconciliation/lines/${lineId}/unmatch`),
    onSuccess: refreshRecon,
  });
  const completeReconSessionMutation = useMutation({
    mutationFn: (id) => api.post(`/accounts/bank-reconciliation/sessions/${id}/complete`),
    onSuccess: refreshRecon,
  });

  const filtered = (accounts || []).filter((a) => !typeFilter || a.type === typeFilter);
  const apBills = apBillsData?.data || [];
  const budgets = budgetsData?.data || [];
  const budgetDetail = budgetDetailData || null;
  const budgetVariance = budgetVarianceData || null;
  const budgetControl = budgetControlData || null;
  const apFeatureModules = [
    { title: 'Vendor Management', status: 'partial', actionLabel: 'Open Suppliers', actionPath: '/suppliers', note: 'Onboarding and basic profile flows available.' },
    { title: 'Invoice Management', status: 'partial', actionLabel: 'Open AP Bills', actionPath: '/finance', note: 'Vendor bill queue, approval, posting, and due tracking available.' },
    { title: 'Purchase Order (PO) Matching', status: 'partial', actionLabel: 'Open AP Bills', actionPath: '/finance', note: '3-way matched bill creation is now available from this AP tab.' },
    { title: 'Payment Processing', status: 'partial', actionLabel: 'Payment processing tab', actionPath: '/finance', note: 'Batch runs, scheduling, methods, discounts, approvals, and payment register are on the Payment processing sub-tab.' },
    { title: 'Debit Notes & Credit Notes', status: 'partial', actionLabel: 'Open AP Bills', actionPath: '/finance', note: 'Apply debit/credit notes directly on vendor bills with history.' },
    { title: 'Prepayments & Advances', status: 'planned', actionLabel: 'Open Finance', actionPath: '/finance', note: 'No dedicated prepayment/advance UI flow yet.' },
    { title: 'Aging & Reporting', status: 'partial', actionLabel: 'View Reports', actionPath: '/reports', note: 'Due alerts and overdue stats available; full AP aging report pending.' },
    { title: 'Withholding Tax (WHT)', status: 'planned', actionLabel: 'Open Finance', actionPath: '/finance', note: 'No AP WHT automation workflow in frontend yet.' },
  ];

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
      {showCreateMatchedBill && (
        <CreateMatchedVendorBillModal
          onClose={closeMatchedVendorBillModal}
          initialPoId={searchParams.get('poId') || ''}
          initialSupplierId={searchParams.get('supplierId') || ''}
        />
      )}
      {billNoteModal.open && (
        <CreateBillNoteModal
          bill={billNoteModal.bill}
          defaultType={billNoteModal.type}
          onClose={() => setBillNoteModal({ open: false, bill: null, type: 'CREDIT' })}
          onSubmit={(payload) => createBillNoteMutation.mutate(payload, {
            onSuccess: () => setBillNoteModal({ open: false, bill: null, type: 'CREDIT' }),
          })}
        />
      )}
      {periodModal}
      <div className="page-header">
        <div><h1 className="page-title">Finance</h1><p className="page-subtitle">Chart of Accounts and General Ledger</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateAcc(true)} className="border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"><BookOpen className="w-4 h-4" /> Add Account</button>
          <button onClick={() => setShowCreateJE(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-2"><FileText className="w-4 h-4" /> Journal Entry</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="text-sm font-semibold text-slate-900 mb-2">Finance Module Feature Set (All Tenants)</div>
        <div className="text-xs text-slate-500 mb-3">This catalog is the standardized capability target for the accounting and finance module.</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {FINANCE_FEATURE_CATALOG.map((group) => (
            <div key={group.title} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-2">{group.title}</div>
              <ul className="list-disc pl-4 space-y-1">
                {(group.items || []).map((item) => (
                  <li key={item} className="text-xs text-slate-600">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {['accounts', 'journals', 'periods', 'trial-balance', 'financial-statements', 'fixed-assets', 'bank-reconciliation', 'ap', 'ar', 'budgets'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'accounts'
              ? 'Chart of Accounts'
              : t === 'journals'
                ? 'Journal Entries'
                : t === 'periods'
                  ? 'Accounting Periods'
                  : t === 'trial-balance'
                    ? 'Trial Balance'
                    : t === 'financial-statements'
                      ? 'Financial Statements'
                    : t === 'fixed-assets'
                      ? 'Fixed Assets'
                    : t === 'bank-reconciliation'
                      ? 'Bank Reconciliation'
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

      {tab === 'financial-statements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Phase 3 — GL financial statements</div>
                <div className="text-xs text-slate-500">Statements from posted journals (GL). Cash flow highlights cash and bank asset accounts.</div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Open Reports page for CSV export
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { id: 'pl', label: 'P & L', Icon: TrendingUp },
                { id: 'bs', label: 'Balance Sheet', Icon: Scale },
                { id: 'cf', label: 'Cash Flow', Icon: Banknote },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStmtTab(id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                    stmtTab === id ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">To / As of</label>
                <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (stmtTab === 'pl') refetchStmtPl();
                  else if (stmtTab === 'bs') refetchStmtBs();
                  else refetchStmtCf();
                }}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {stmtTab === 'pl' && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              {stmtPlLoading && <div className="text-sm text-slate-500">Loading…</div>}
              {!stmtPlLoading && stmtPl && (
                <div className="max-w-xl space-y-4">
                  <div className="text-xs text-slate-500">{formatDate(stmtFrom)} — {formatDate(stmtTo)} · GL basis</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">Revenue</div><div className="text-lg font-bold text-slate-900">{formatCurrency(stmtPl.revenue?.total || 0)}</div></div>
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">COGS</div><div className="text-lg font-bold text-slate-900">{formatCurrency(stmtPl.costOfSales?.total || 0)}</div></div>
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">Op. expenses</div><div className="text-lg font-bold text-slate-900">{formatCurrency(stmtPl.expenses?.total || 0)}</div></div>
                    <div className="bg-emerald-50 rounded-lg p-3"><div className="text-[11px] text-emerald-700">Net profit</div><div className="text-lg font-bold text-emerald-900">{formatCurrency(stmtPl.netProfit || 0)}</div></div>
                  </div>
                  <div className="text-xs text-slate-500">Gross profit {formatCurrency(stmtPl.grossProfit || 0)} · Margin {stmtPl.grossMargin ?? 0}%</div>
                  <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Tag expense accounts with subType COGS to split cost of sales from operating expenses.</div>
                </div>
              )}
            </div>
          )}

          {stmtTab === 'bs' && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              {stmtBsLoading && <div className="text-sm text-slate-500">Loading…</div>}
              {!stmtBsLoading && stmtBs && (
                <div className="max-w-xl space-y-4">
                  <div className="text-xs text-slate-500">As at {formatDate(stmtBs.asOf || stmtTo)} · {stmtBs.check === 'balanced' ? 'Balanced' : 'Review accounts'}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">Assets</div><div className="text-lg font-bold">{formatCurrency(stmtBs.assets?.total || 0)}</div></div>
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">Liabilities</div><div className="text-lg font-bold">{formatCurrency(stmtBs.liabilities?.total || 0)}</div></div>
                    <div className="bg-slate-50 rounded-lg p-3"><div className="text-[11px] text-slate-500">Equity</div><div className="text-lg font-bold">{formatCurrency(stmtBs.equity?.total || 0)}</div></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {stmtTab === 'cf' && (
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              {stmtCfLoading && <div className="text-sm text-slate-500">Loading…</div>}
              {!stmtCfLoading && stmtCf && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-teal-50 rounded-lg p-3"><div className="text-[11px] text-teal-700">Net cash change</div><div className="text-xl font-bold text-teal-900">{formatCurrency(stmtCf.totalNetCashChange || 0)}</div></div>
                  </div>
                  {stmtCf.note && <p className="text-xs text-slate-500">{stmtCf.note}</p>}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left py-2">Code</th><th className="text-left py-2">Account</th><th className="text-right py-2">Period</th></tr></thead>
                      <tbody>
                        {(stmtCf.cashAccounts || []).length === 0 && (
                          <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-xs">No cash/bank movement. Set subType CASH or BANK on asset accounts.</td></tr>
                        )}
                        {(stmtCf.cashAccounts || []).map((c) => (
                          <tr key={`${c.code}-${c.name}`} className="border-b border-slate-50">
                            <td className="py-2 font-mono text-xs">{c.code}</td>
                            <td className="py-2">{c.name}</td>
                            <td className="py-2 text-right font-semibold">{formatCurrency(c.periodNetChange || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
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

      {tab === 'fixed-assets' && (
        <div className="space-y-4">
          {showCreateFA && (
            <CreateFixedAssetModal
              accounts={accounts}
              onClose={() => setShowCreateFA(false)}
              onSubmit={(payload) => createFixedAssetMutation.mutate(payload)}
              isPending={createFixedAssetMutation.isPending}
              error={createFixedAssetMutation.error?.response?.data?.error || ''}
            />
          )}

          <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Asset Register</div>
              <div className="text-xs text-slate-500">Straight-line depreciation posting (monthly) into posted journal entries.</div>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Depreciation month (as of)</label>
                <input type="date" value={depAsOf} onChange={(e) => setDepAsOf(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <button
                type="button"
                onClick={() => runDepreciationMutation.mutate({ asOf: depAsOf })}
                disabled={runDepreciationMutation.isPending}
                className="px-4 py-2 text-sm font-semibold border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-60"
              >
                {runDepreciationMutation.isPending ? 'Running…' : 'Run Depreciation'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateFA(true)}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 inline-block mr-1" /> New Asset
              </button>
            </div>
          </div>

          {runDepreciationMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {runDepreciationMutation.error?.response?.data?.error || 'Failed to run depreciation'}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold">Asset</th>
                  <th className="text-left px-4 py-3 font-semibold">In service</th>
                  <th className="text-right px-4 py-3 font-semibold">Cost</th>
                  <th className="text-right px-4 py-3 font-semibold">Salvage</th>
                  <th className="text-right px-4 py-3 font-semibold">Life</th>
                  <th className="text-right px-4 py-3 font-semibold">Monthly</th>
                  <th className="text-left px-4 py-3 font-semibold">Posted</th>
                </tr>
              </thead>
              <tbody>
                {(fixedAssetsData || []).length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">No fixed assets yet</td></tr>
                )}
                {(fixedAssetsData || []).map((a) => {
                  const base = (parseFloat(a.cost) || 0) - (parseFloat(a.salvageValue) || 0);
                  const life = parseInt(a.usefulLifeMonths, 10) || 0;
                  const monthly = life > 0 ? base / life : 0;
                  const postedCount = (a.depreciations || []).length;
                  const postedTotal = (a.depreciations || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
                  return (
                    <tr key={a.id} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-600">{a.assetCode}</div>
                        <div className="font-medium text-slate-900">{a.name}</div>
                        {a.description && <div className="text-[11px] text-slate-500">{a.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(a.inServiceDate)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(a.cost || 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(a.salvageValue || 0)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{a.usefulLifeMonths}m</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(monthly > 0 ? monthly : 0)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{postedCount} months · {formatCurrency(postedTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'bank-reconciliation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-sm font-semibold text-slate-900 mb-3">Start Reconciliation Session</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <select value={reconForm.accountId} onChange={(e) => setReconForm((f) => ({ ...f, accountId: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm">
                <option value="">Select bank/cash account</option>
                {(accounts || []).filter((a) => a.type === 'ASSET').map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <input type="date" value={reconForm.statementDate} onChange={(e) => setReconForm((f) => ({ ...f, statementDate: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Opening balance" value={reconForm.openingBalance} onChange={(e) => setReconForm((f) => ({ ...f, openingBalance: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Closing balance" value={reconForm.closingBalance} onChange={(e) => setReconForm((f) => ({ ...f, closingBalance: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <input placeholder="Notes (optional)" value={reconForm.notes} onChange={(e) => setReconForm((f) => ({ ...f, notes: e.target.value }))} className="border border-slate-200 rounded px-3 py-2 text-sm" />
              <button
                type="button"
                onClick={() => createReconSessionMutation.mutate(reconForm)}
                disabled={createReconSessionMutation.isPending || !reconForm.accountId || !reconForm.statementDate}
                className="px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Create Session
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Sessions</div>
              <div className="divide-y divide-slate-100">
                {(reconSessions || []).length === 0 && <div className="px-4 py-6 text-sm text-slate-400">No sessions yet</div>}
                {(reconSessions || []).map((s) => (
                  <button key={s.id} type="button" onClick={() => setSelectedReconId(s.id)} className={cn('w-full text-left px-4 py-3 hover:bg-slate-50', selectedReconId === s.id && 'bg-slate-50')}>
                    <div className="text-sm font-semibold text-slate-900">{s.account?.name}</div>
                    <div className="text-xs text-slate-500">{formatDate(s.statementDate)} - {s.status} - {s.matchedCount}/{s.totalLines} matched</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {!selectedReconId && <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-sm text-slate-500">Select a session to reconcile statement lines.</div>}
              {selectedReconId && (
                <>
                  <div className="bg-white rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-slate-900">Import Statement Lines</div>
                      <button
                        type="button"
                        onClick={() => completeReconSessionMutation.mutate(selectedReconId)}
                        disabled={completeReconSessionMutation.isPending}
                        className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Complete Session
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">Paste CSV lines: `date,description,debit,credit,reference` (one per line)</div>
                    <textarea value={statementInput} onChange={(e) => setStatementInput(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs h-28" placeholder="2026-03-01,Bank charge,1000,0,CHG-01" />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const lines = statementInput
                            .split('\n')
                            .map((row) => row.trim())
                            .filter(Boolean)
                            .map((row) => {
                              const [txDate, description, debit, credit, reference] = row.split(',');
                              return { txDate, description, debit: Number(debit || 0), credit: Number(credit || 0), reference };
                            });
                          importReconLinesMutation.mutate({ id: selectedReconId, lines });
                        }}
                        disabled={importReconLinesMutation.isPending || !statementInput.trim()}
                        className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Import Lines
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-4 py-3 font-semibold">Date</th><th className="text-left px-4 py-3 font-semibold">Description</th><th className="text-right px-4 py-3 font-semibold">Amount</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold">Match</th><th className="text-right px-4 py-3 font-semibold">Action</th></tr></thead>
                      <tbody>
                        {(reconDetailData?.session?.lines || []).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No statement lines yet</td></tr>}
                        {(reconDetailData?.session?.lines || []).map((line) => (
                          <tr key={line.id} className="border-b border-slate-50">
                            <td className="px-4 py-3 text-xs">{formatDate(line.txDate)}</td>
                            <td className="px-4 py-3">
                              <div className="text-xs font-medium">{line.description}</div>
                              <div className="text-[11px] text-slate-500">{line.reference || '-'}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(line.amount || 0)}</td>
                            <td className="px-4 py-3"><span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', line.status === 'MATCHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{line.status}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-600">{line.matchedJournal?.reference || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              {line.status !== 'MATCHED' ? (
                                <select
                                  onChange={(e) => e.target.value && matchReconLineMutation.mutate({ lineId: line.id, journalEntryId: e.target.value })}
                                  className="border border-slate-200 rounded px-2 py-1 text-xs"
                                  defaultValue=""
                                >
                                  <option value="">Match with journal...</option>
                                  {(reconDetailData?.candidateJournals || []).map((j) => (
                                    <option key={j.id} value={j.id}>{j.reference} ({formatCurrency(j.lineAmount || 0)})</option>
                                  ))}
                                </select>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => unmatchReconLineMutation.mutate(line.id)}
                                  className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-50"
                                >
                                  Unmatch
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'ap' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
            <button
              type="button"
              onClick={() => setApSubTab('vendor-bills')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', apSubTab === 'vendor-bills' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              Vendor bills
            </button>
            <button
              type="button"
              onClick={() => setApSubTab('payment-processing')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', apSubTab === 'payment-processing' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              Payment processing
            </button>
          </div>

          {apSubTab === 'payment-processing' && (
            <ApPaymentProcessingPanel apBills={apBills} refreshAP={refreshAP} />
          )}

          {apSubTab === 'vendor-bills' && (
          <>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">AP Feature Coverage</h3>
              <div className="text-xs text-slate-500">
                Available now: {apFeatureModules.filter((m) => m.status === 'partial').length} / {apFeatureModules.length}
              </div>
            </div>
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowCreateMatchedBill(true)}
                className="px-3 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Matched Vendor Bill (PO Matching)
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apFeatureModules.map((module) => (
                <div key={module.title} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">{module.title}</div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
                      module.status === 'partial'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      {module.status === 'partial' ? 'Partial' : 'Planned'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{module.note}</div>
                  <button
                    type="button"
                    onClick={() => navigate(module.actionPath)}
                    className="mt-2 px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    {module.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-500 uppercase font-bold">Upcoming (7 days)</div>
              <div className="text-2xl font-black text-slate-900">{dueAlerts?.upcoming?.length || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-500 uppercase font-bold">Overdue schedules</div>
              <div className="text-2xl font-black text-red-600">{dueAlerts?.overdue?.length || 0}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-500 uppercase font-bold">Bills in queue</div>
              <div className="text-2xl font-black text-indigo-600">{apBills.length}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold">Bill</th>
                  <th className="text-left px-4 py-3 font-semibold">Supplier</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Amount Due</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apBills.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No vendor bills</td></tr>}
                {apBills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-800">{b.billNumber}</div>
                      <div className="text-[11px] text-slate-500">Due {formatDate(b.dueDate)}</div>
                    </td>
                    <td className="px-4 py-3">{b.supplier?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold">{b.status}</div>
                      <div className="text-[11px] text-slate-500">Approval: {b.approvalStatus}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(b.amountDue || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => submitBillApprovalMutation.mutate(b.id)}
                          disabled={submitBillApprovalMutation.isPending || b.status !== 'DRAFT'}
                          className="px-2 py-1 text-[11px] border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewBillApprovalMutation.mutate({ id: b.id, decision: 'APPROVE' })}
                          disabled={reviewBillApprovalMutation.isPending || b.status !== 'DRAFT'}
                          className="px-2 py-1 text-[11px] border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => postBillMutation.mutate(b.id)}
                          disabled={postBillMutation.isPending || b.status !== 'DRAFT' || b.approvalStatus !== 'APPROVED'}
                          className="px-2 py-1 text-[11px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Post
                        </button>
                        <button
                          type="button"
                          onClick={() => payBillMutation.mutate({ id: b.id, amount: b.amountDue })}
                          disabled={payBillMutation.isPending || !['POSTED', 'PARTIAL'].includes(b.status) || Number(b.amountDue || 0) <= 0}
                          className="px-2 py-1 text-[11px] bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" /> Pay due
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillNoteModal({ open: true, bill: b, type: 'CREDIT' })}
                          disabled={createBillNoteMutation.isPending || ['CANCELLED'].includes(b.status)}
                          className="px-2 py-1 text-[11px] border border-emerald-300 text-emerald-700 rounded hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Credit note
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillNoteModal({ open: true, bill: b, type: 'DEBIT' })}
                          disabled={createBillNoteMutation.isPending || ['CANCELLED'].includes(b.status)}
                          className="px-2 py-1 text-[11px] border border-rose-300 text-rose-700 rounded hover:bg-rose-50 disabled:opacity-50"
                        >
                          Debit note
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={scheduleDraft[b.id]?.amount || ''}
                          onChange={(e) => setScheduleDraft((s) => ({ ...s, [b.id]: { ...(s[b.id] || {}), amount: e.target.value } }))}
                          placeholder="Amount"
                          className="w-24 border border-slate-200 rounded px-2 py-1 text-[11px]"
                        />
                        <input
                          type="date"
                          value={scheduleDraft[b.id]?.dueDate || ''}
                          onChange={(e) => setScheduleDraft((s) => ({ ...s, [b.id]: { ...(s[b.id] || {}), dueDate: e.target.value } }))}
                          className="border border-slate-200 rounded px-2 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => schedulePaymentMutation.mutate({
                            id: b.id,
                            amount: scheduleDraft[b.id]?.amount,
                            dueDate: scheduleDraft[b.id]?.dueDate,
                          })}
                          disabled={schedulePaymentMutation.isPending || !scheduleDraft[b.id]?.amount || !scheduleDraft[b.id]?.dueDate}
                          className="px-2 py-1 text-[11px] border border-amber-300 text-amber-700 rounded hover:bg-amber-50 disabled:opacity-50"
                        >
                          Schedule
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </div>
      )}

      {tab === 'ar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Collections & Overdue Reminders</div>
              <div className="text-xs text-slate-500">Send reminder batch for overdue invoices and review customer credit exposure.</div>
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
