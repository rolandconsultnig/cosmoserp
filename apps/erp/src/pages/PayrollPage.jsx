import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle, Download, ChevronDown, Users, DollarSign, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

export default function PayrollPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedRun, setSelectedRun] = useState(null);

  const { data: runs, isLoading } = useQuery({
    queryKey: ['payroll-runs', year],
    queryFn: () => api.get('/payroll', { params: { year } }).then((r) => r.data),
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
    onSuccess: () => { qc.invalidateQueries(['payroll-runs']); qc.invalidateQueries(['payroll-run', selectedRun]); },
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
              <div className="flex gap-3">
                {runDetail.status === 'PROCESSING' && (
                  <button onClick={() => approveMutation.mutate(runDetail.id)} disabled={approveMutation.isPending}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve Payroll
                  </button>
                )}
                {['APPROVED','PAID'].includes(runDetail.status) && (
                  <a href={`/api/payroll/${runDetail.id}/nibss`}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
                    <Download className="w-4 h-4" /> Download NIBSS File
                  </a>
                )}
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
