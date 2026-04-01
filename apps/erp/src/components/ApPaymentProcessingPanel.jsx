import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Play, CalendarClock, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'MOBILE_MONEY', label: 'Mobile money' },
  { value: 'CASH', label: 'Cash' },
];

function payStatusBadge(status) {
  const map = {
    PENDING: 'bg-amber-50 text-amber-800',
    SUCCESS: 'bg-emerald-50 text-emerald-800',
    FAILED: 'bg-red-50 text-red-800',
    REFUNDED: 'bg-slate-100 text-slate-700',
  };
  const label = status === 'SUCCESS' ? 'Processed' : status === 'PENDING' ? 'Pending' : status === 'FAILED' ? 'Failed' : status;
  return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', map[status] || 'bg-slate-100 text-slate-700')}>{label}</span>;
}

function batchStatusBadge(status) {
  const map = {
    DRAFT: 'bg-slate-100 text-slate-700',
    PENDING_APPROVAL: 'bg-amber-50 text-amber-800',
    APPROVED: 'bg-blue-50 text-blue-800',
    SCHEDULED: 'bg-indigo-50 text-indigo-800',
    EXECUTING: 'bg-purple-50 text-purple-800',
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    PARTIALLY_FAILED: 'bg-orange-50 text-orange-800',
    CANCELLED: 'bg-red-50 text-red-800',
  };
  return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', map[status] || 'bg-slate-100')}>{status?.replace(/_/g, ' ')}</span>;
}

export default function ApPaymentProcessingPanel({ apBills, refreshAP }) {
  const qc = useQueryClient();
  const [batchLines, setBatchLines] = useState([{ billId: '', amount: '', apMethod: 'BANK_TRANSFER', scheduleId: '' }]);
  const [approvalLevels, setApprovalLevels] = useState(1);
  const [scheduleFor, setScheduleFor] = useState('');
  const [autoEx, setAutoEx] = useState(true);
  const [earlyDraft, setEarlyDraft] = useState({});

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['ap-payment-batches'],
    queryFn: () => api.get('/ap/payment-batches', { params: { limit: 50 } }).then((r) => r.data),
  });
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['ap-payments-list'],
    queryFn: () => api.get('/ap/payments', { params: { limit: 100 } }).then((r) => r.data),
  });

  const payableBills = (apBills || []).filter((b) => ['POSTED', 'PARTIAL'].includes(b.status) && Number(b.amountDue) > 0);

  const refreshAll = () => {
    refreshAP();
    qc.invalidateQueries(['ap-payment-batches']);
    qc.invalidateQueries(['ap-payments-list']);
  };

  const createBatchMutation = useMutation({
    mutationFn: (payload) => api.post('/ap/payment-batches', payload),
    onSuccess: () => {
      refreshAll();
      setBatchLines([{ billId: '', amount: '', apMethod: 'BANK_TRANSFER', scheduleId: '' }]);
    },
  });

  const submitBatchMutation = useMutation({
    mutationFn: (id) => api.post(`/ap/payment-batches/${id}/submit`),
    onSuccess: refreshAll,
  });
  const approveBatchMutation = useMutation({
    mutationFn: ({ id, level }) => api.post(`/ap/payment-batches/${id}/approve`, { level }),
    onSuccess: refreshAll,
  });
  const rejectBatchMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/ap/payment-batches/${id}/reject`, { reason }),
    onSuccess: refreshAll,
  });
  const scheduleBatchMutation = useMutation({
    mutationFn: ({ id, scheduledFor, autoExecute }) => api.post(`/ap/payment-batches/${id}/schedule`, { scheduledFor, autoExecute }),
    onSuccess: refreshAll,
  });
  const executeBatchMutation = useMutation({
    mutationFn: ({ id, force }) => api.post(`/ap/payment-batches/${id}/execute`, { force }),
    onSuccess: refreshAll,
  });
  const processDueMutation = useMutation({
    mutationFn: () => api.post('/ap/payment-batches/process-due'),
    onSuccess: refreshAll,
  });

  const saveEarlyMutation = useMutation({
    mutationFn: ({ id, earlyPaymentDiscountPercent, earlyPaymentDeadline }) =>
      api.patch(`/ap/vendor-bills/${id}/early-payment`, { earlyPaymentDiscountPercent, earlyPaymentDeadline }),
    onSuccess: refreshAll,
  });

  const batches = batchesData?.data || [];
  const payments = paymentsData?.data || [];

  const addBatchLine = () => setBatchLines((ls) => [...ls, { billId: '', amount: '', apMethod: 'BANK_TRANSFER', scheduleId: '' }]);
  const setLine = (i, k, v) => setBatchLines((ls) => ls.map((row, j) => (j === i ? { ...row, [k]: v } : row)));

  const submitNewBatch = () => {
    const lines = batchLines
      .filter((l) => l.billId && Number(l.amount) > 0)
      .map((l) => ({
        billId: l.billId,
        amount: Number(l.amount),
        apMethod: l.apMethod,
        scheduleId: l.scheduleId || undefined,
      }));
    if (!lines.length) return;
    createBatchMutation.mutate({
      lines,
      approvalLevelsRequired: approvalLevels,
      scheduledFor: scheduleFor || undefined,
      autoExecute: autoEx,
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Payment processing
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          Single and batch payment runs, scheduled execution, bank transfer / cheque / mobile money, partial payments with installment schedules,
          prompt-payment discounts on bills, dual approval levels, and full payment status tracking (pending → processed / failed).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Payment runs</div>
          <div className="text-2xl font-black text-slate-900">{batches.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Recorded payments</div>
          <div className="text-2xl font-black text-slate-900">{paymentsData?.pagination?.total ?? payments.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 flex flex-col justify-center">
          <button
            type="button"
            onClick={() => processDueMutation.mutate()}
            disabled={processDueMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {processDueMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
            Run due scheduled payments
          </button>
          <p className="text-[10px] text-slate-500 mt-1">Executes approved batches with auto-run whose schedule date has passed.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-900">New payment run (single or batch)</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Approval levels</label>
            <select
              value={approvalLevels}
              onChange={(e) => setApprovalLevels(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={1}>Level 1 (Accountant / Admin / Owner)</option>
              <option value={2}>Level 1 + Level 2 (Admin / Owner)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Optional schedule (on create)</label>
            <input
              type="datetime-local"
              value={scheduleFor}
              onChange={(e) => setScheduleFor(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={autoEx} onChange={(e) => setAutoEx(e.target.checked)} />
              Auto-execute when due
            </label>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-2 py-2">Bill</th>
                <th className="text-left px-2 py-2">Amount</th>
                <th className="text-left px-2 py-2">Method</th>
                <th className="text-left px-2 py-2">Schedule id (installment)</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {batchLines.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1">
                    <select
                      value={row.billId}
                      onChange={(e) => setLine(i, 'billId', e.target.value)}
                      className="w-full border border-slate-200 rounded px-1 py-1"
                    >
                      <option value="">Select bill…</option>
                      {payableBills.map((b) => (
                        <option key={b.id} value={b.id}>{b.billNumber} · {b.supplier?.name} · due {formatCurrency(b.amountDue)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => setLine(i, 'amount', e.target.value)}
                      className="w-28 border border-slate-200 rounded px-1 py-1 text-right"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select value={row.apMethod} onChange={(e) => setLine(i, 'apMethod', e.target.value)} className="w-full border border-slate-200 rounded px-1 py-1">
                      {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={row.scheduleId}
                      onChange={(e) => setLine(i, 'scheduleId', e.target.value)}
                      className="w-full border border-slate-200 rounded px-1 py-1 font-mono text-[10px]"
                      placeholder="Optional UUID"
                    />
                  </td>
                  <td className="px-1 py-1">
                    {batchLines.length > 1 && (
                      <button type="button" onClick={() => setBatchLines((ls) => ls.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-2 py-2 border-t border-slate-100">
            <button type="button" onClick={addBatchLine} className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add line
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={submitNewBatch}
          disabled={createBatchMutation.isPending}
          className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {createBatchMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Create payment run
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Payment runs & approvals</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
              <th className="text-left px-3 py-2 font-semibold">Reference</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-right px-3 py-2 font-semibold">Total</th>
              <th className="text-left px-3 py-2 font-semibold">Schedule</th>
              <th className="text-right px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batchesLoading && <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading…</td></tr>}
            {!batchesLoading && batches.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No payment runs yet</td></tr>}
            {!batchesLoading && batches.map((batch) => (
              <tr key={batch.id} className="border-b border-slate-50 align-top">
                <td className="px-3 py-2 font-mono text-xs">{batch.reference}</td>
                <td className="px-3 py-2">{batchStatusBadge(batch.status)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(batch.totalAmount)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {batch.scheduledFor ? formatDate(batch.scheduledFor) : '—'}
                  {batch.autoExecute ? <span className="text-indigo-600"> · auto</span> : null}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {batch.status === 'DRAFT' && (
                      <button type="button" onClick={() => submitBatchMutation.mutate(batch.id)} className="px-2 py-0.5 text-[10px] border rounded border-slate-200 hover:bg-slate-50">Submit</button>
                    )}
                    {batch.status === 'PENDING_APPROVAL' && (
                      <>
                        <button type="button" onClick={() => approveBatchMutation.mutate({ id: batch.id, level: 1 })} className="px-2 py-0.5 text-[10px] border rounded border-emerald-200 text-emerald-700 hover:bg-emerald-50">Approve L1</button>
                        {batch.approvalLevelsRequired >= 2 && batch.approval1Status === 'APPROVED' && (
                          <button type="button" onClick={() => approveBatchMutation.mutate({ id: batch.id, level: 2 })} className="px-2 py-0.5 text-[10px] border rounded border-violet-200 text-violet-700 hover:bg-violet-50">Approve L2</button>
                        )}
                        <button type="button" onClick={() => rejectBatchMutation.mutate({ id: batch.id, reason: 'Rejected' })} className="px-2 py-0.5 text-[10px] border rounded border-red-200 text-red-600 hover:bg-red-50">Reject</button>
                      </>
                    )}
                    {['APPROVED', 'SCHEDULED'].includes(batch.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const sf = window.prompt('Schedule date/time (ISO, optional)', batch.scheduledFor?.slice(0, 16) || '');
                            if (sf) scheduleBatchMutation.mutate({ id: batch.id, scheduledFor: sf, autoExecute: true });
                          }}
                          className="px-2 py-0.5 text-[10px] border rounded border-indigo-200 text-indigo-700"
                        >
                          Set schedule
                        </button>
                        <button type="button" onClick={() => executeBatchMutation.mutate({ id: batch.id, force: false })} className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded inline-flex items-center gap-0.5">
                          <Play className="w-3 h-3" /> Execute
                        </button>
                        <button type="button" onClick={() => executeBatchMutation.mutate({ id: batch.id, force: true })} className="px-2 py-0.5 text-[10px] border rounded border-amber-300 text-amber-800" title="Ignore schedule">
                          Force
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-900">Payment register (status tracking)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
              <th className="text-left px-3 py-2 font-semibold">Date</th>
              <th className="text-left px-3 py-2 font-semibold">Bill</th>
              <th className="text-left px-3 py-2 font-semibold">Method</th>
              <th className="text-right px-3 py-2 font-semibold">Amount</th>
              <th className="text-right px-3 py-2 font-semibold">Discount</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Batch</th>
            </tr>
          </thead>
          <tbody>
            {paymentsLoading && <tr><td colSpan={7} className="text-center py-8 text-slate-400">Loading…</td></tr>}
            {!paymentsLoading && payments.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No payments yet</td></tr>}
            {!paymentsLoading && payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-50">
                <td className="px-3 py-2 text-xs">{formatDate(p.paidAt || p.createdAt)}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.bill?.billNumber || '—'}</td>
                <td className="px-3 py-2 text-xs">{String(p.method || '—').replace(/_/g, ' ')}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(p.amount)}</td>
                <td className="px-3 py-2 text-right text-xs">{Number(p.discountAmount) > 0 ? formatCurrency(p.discountAmount) : '—'}</td>
                <td className="px-3 py-2">{payStatusBadge(p.status)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{p.batch?.reference || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="text-sm font-semibold text-slate-900 mb-2">Early payment discount (per vendor bill)</div>
        <p className="text-xs text-slate-500 mb-3">Set a prompt-payment deadline and discount rate; settlements on or before the deadline apply the discount (posted to a discount account when configured).</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {payableBills.map((b) => (
            <div key={b.id} className="flex flex-wrap items-end gap-2 border border-slate-100 rounded-lg px-2 py-2">
              <span className="text-xs font-mono font-semibold w-24">{b.billNumber}</span>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                placeholder="Rate e.g. 0.02"
                value={earlyDraft[b.id]?.pct ?? ''}
                onChange={(e) => setEarlyDraft((d) => ({ ...d, [b.id]: { ...d[b.id], pct: e.target.value } }))}
                className="w-24 border border-slate-200 rounded px-1 py-1 text-xs"
              />
              <input
                type="date"
                value={earlyDraft[b.id]?.dl ?? ''}
                onChange={(e) => setEarlyDraft((d) => ({ ...d, [b.id]: { ...d[b.id], dl: e.target.value } }))}
                className="border border-slate-200 rounded px-1 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => saveEarlyMutation.mutate({
                  id: b.id,
                  earlyPaymentDiscountPercent: earlyDraft[b.id]?.pct === '' ? null : Number(earlyDraft[b.id]?.pct),
                  earlyPaymentDeadline: earlyDraft[b.id]?.dl || null,
                })}
                disabled={saveEarlyMutation.isPending}
                className="px-2 py-1 text-[10px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Save
              </button>
            </div>
          ))}
          {payableBills.length === 0 && <div className="text-xs text-slate-400">No open posted bills with balance.</div>}
        </div>
      </div>
    </div>
  );
}
