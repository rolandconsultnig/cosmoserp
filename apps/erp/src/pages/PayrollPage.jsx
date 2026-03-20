import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle, Download, Loader2, BadgeCheck, Ban, FileSpreadsheet, Printer } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, getStatusColor, cn } from '../lib/utils';

function apiOrigin() {
  const raw = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '')
    : '';
  return raw || '';
}

async function openPayslipPrint(runId, payslipId) {
  const token = localStorage.getItem('accessToken');
  const path = `/payroll/${runId}/payslips/${payslipId}/print`;
  const url = apiOrigin() ? `${apiOrigin()}${path}` : `/api${path}`;
  try {
    const res = await fetch(url, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      window.alert(err.error || `Could not open payslip (${res.status})`);
      return;
    }
    const html = await res.text();
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      window.alert('Allow pop-ups to view the payslip, or try again.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
  } catch (e) {
    window.alert(e?.message || 'Failed to load payslip');
  }
}

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [approveNote, setApproveNote] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['payroll-summary', year],
    queryFn: () => api.get('/payroll/summary', { params: { year } }).then((r) => r.data.data),
  });

  const { data: runs, isLoading } = useQuery({
    queryKey: ['payroll-runs', year, statusFilter, monthFilter],
    queryFn: () =>
      api.get('/payroll', {
        params: {
          year,
          status: statusFilter || undefined,
          month: monthFilter || undefined,
        },
      }).then((r) => r.data),
  });

  const { data: runDetail } = useQuery({
    queryKey: ['payroll-run', selectedRun],
    queryFn: () => api.get(`/payroll/${selectedRun}`).then((r) => r.data.data),
    enabled: !!selectedRun,
  });

  const processMutation = useMutation({
    mutationFn: () => api.post('/payroll/process', { month: parseInt(month), year: parseInt(year) }),
    onSuccess: (res) => { qc.invalidateQueries(['payroll-runs']); setSelectedRun(res.data.data.id); },
  });

  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['payroll-runs']); qc.invalidateQueries(['payroll-run', selectedRun]); qc.invalidateQueries(['payroll-summary']); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/mark-paid`),
    onSuccess: () => { qc.invalidateQueries(['payroll-runs']); qc.invalidateQueries(['payroll-run', selectedRun]); qc.invalidateQueries(['payroll-summary']); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries(['payroll-runs']); qc.invalidateQueries(['payroll-run', selectedRun]); qc.invalidateQueries(['payroll-summary']); },
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Nigerian statutory deductions: PAYE, Pension (8%), NHF, ITF</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Runs', value: summary?.runCount || 0, color: 'text-slate-800' },
          { label: 'Total Gross', value: formatCurrency(summary?.totalGross || 0), color: 'text-blue-700' },
          { label: 'Total PAYE', value: formatCurrency(summary?.totalPaye || 0), color: 'text-red-700' },
          { label: 'Total Pension', value: formatCurrency(summary?.totalPension || 0), color: 'text-amber-700' },
          { label: 'Total Net', value: formatCurrency(summary?.totalNet || 0), color: 'text-emerald-700' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className={cn('mt-1 text-lg font-bold', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Process payroll */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Run Payroll</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg transition">
            {processMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Process Payroll
          </button>
        </div>
        {processMutation.isError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {processMutation.error?.response?.data?.error || 'Failed to process payroll'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Payroll run list */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm">Payroll Runs ({year})</div>
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
            >
              <option value="">All statuses</option>
              <option value="PROCESSING">Processing</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs"
            >
              <option value="">All months</option>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          {isLoading && <div className="p-4 text-center text-slate-400 text-sm">Loading…</div>}
          {(runs?.data || []).length === 0 && !isLoading && (
            <div className="p-4 text-center text-slate-400 text-sm">No payroll runs for {year}</div>
          )}
          {(runs?.data || []).map((run) => (
            <button key={run.id} onClick={() => setSelectedRun(run.id)}
              className={cn('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition', selectedRun === run.id && 'bg-blue-50')}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{run.period}</div>
                  <div className="text-xs text-slate-500">{run._count?.payslips || 0} employees</div>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getStatusColor(run.status))}>{run.status}</span>
              </div>
              <div className="text-sm font-semibold text-slate-700 mt-1">{formatCurrency(run.totalNet)}</div>
            </button>
          ))}
        </div>

        {/* Payroll run detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedRun && (
            <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400 shadow-sm">
              Select a payroll run to view details
            </div>
          )}
          {selectedRun && runDetail && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Gross Pay', value: runDetail.totalGross, color: 'text-blue-700' },
                  { label: 'PAYE Tax', value: runDetail.totalPaye, color: 'text-red-600' },
                  { label: 'Pension (8%)', value: runDetail.totalPension, color: 'text-orange-600' },
                  { label: 'Net Pay', value: runDetail.totalNet, color: 'text-green-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
                    <div className="text-xs text-slate-500 mb-1">{label}</div>
                    <div className={cn('text-lg font-bold', color)}>{formatCurrency(value)}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {runDetail.status === 'PROCESSING' && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="w-full max-w-md">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Approval note (optional — stored in audit log)</label>
                      <textarea
                        value={approveNote}
                        onChange={(e) => setApproveNote(e.target.value)}
                        rows={2}
                        placeholder="e.g. Board sign-off ref, finance ticket…"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => approveMutation.mutate({ id: runDetail.id, note: approveNote })}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition w-fit"
                    >
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve Payroll
                    </button>
                  </div>
                )}
                {runDetail.status === 'APPROVED' && (
                  <button onClick={() => markPaidMutation.mutate(runDetail.id)} disabled={markPaidMutation.isPending}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                    {markPaidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                    Mark as Paid
                  </button>
                )}
                {['PROCESSING','APPROVED'].includes(runDetail.status) && (
                  <button onClick={() => cancelMutation.mutate(runDetail.id)} disabled={cancelMutation.isPending}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                    Cancel Run
                  </button>
                )}
                {['APPROVED','PAID'].includes(runDetail.status) && (
                  <a href={`/api/payroll/${runDetail.id}/nibss`}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                    <Download className="w-4 h-4" /> Download NIBSS File
                  </a>
                )}
                <a href={`/api/payroll/${runDetail.id}/export`}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV
                </a>
              </div>

              {/* Payslips table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-900 text-sm">
                  Employee Payslips — {runDetail.period}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                        <th className="text-left px-4 py-2 font-semibold">Employee</th>
                        <th className="text-right px-4 py-2 font-semibold">Gross</th>
                        <th className="text-right px-4 py-2 font-semibold">PAYE</th>
                        <th className="text-right px-4 py-2 font-semibold">Pension</th>
                        <th className="text-right px-4 py-2 font-semibold">NHF</th>
                        <th className="text-right px-4 py-2 font-semibold">Net Pay</th>
                        <th className="text-right px-4 py-2 font-semibold">Payslip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(runDetail.payslips || []).map((slip) => (
                        <tr key={slip.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-900">{slip.employee?.firstName} {slip.employee?.lastName}</div>
                            <div className="text-xs text-slate-400">{slip.employee?.jobTitle} · {slip.employee?.department}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right">{formatCurrency(slip.grossSalary)}</td>
                          <td className="px-4 py-2.5 text-right text-red-600">-{formatCurrency(slip.payeeTax)}</td>
                          <td className="px-4 py-2.5 text-right text-orange-600">-{formatCurrency(slip.employeePension)}</td>
                          <td className="px-4 py-2.5 text-right text-orange-500">-{formatCurrency(slip.nhf)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">{formatCurrency(slip.netPay)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => openPayslipPrint(runDetail.id, slip.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print / PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
