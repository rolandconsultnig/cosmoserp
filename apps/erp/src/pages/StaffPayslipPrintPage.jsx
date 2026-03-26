import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatCurrency } from '../lib/utils';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-sm font-semibold text-slate-900 text-right">{value}</div>
    </div>
  );
}

export default function StaffPayslipPrintPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['staff-portal', 'payslip', id],
    queryFn: () => api.get(`/staff-portal/payslips/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const slip = data?.data;
  const emp = slip?.employee;
  const run = slip?.payrollRun;

  const period = useMemo(() => {
    if (!run) return '—';
    if (run.period) return run.period;
    const m = run.month ? String(run.month).padStart(2, '0') : '';
    return run.year && m ? `${run.year}-${m}` : '—';
  }, [run]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading payslip…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg w-full">
          <div className="text-sm text-red-700">
            {error.response?.data?.error || error.message || 'Failed to load payslip'}
          </div>
          <div className="mt-4">
            <Link to="/staff-portal" className="text-sm font-semibold text-blue-700">Back to Staff Portal</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/staff-portal" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Payslip</h1>
              <div className="text-sm text-slate-500 mt-1">Period: {period} {run?.status ? `· ${run.status}` : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">{emp ? `${emp.firstName} ${emp.lastName}` : '—'}</div>
              <div className="text-xs text-slate-500">{emp?.staffId || '—'}</div>
              <div className="text-xs text-slate-500">{emp?.department || '—'}</div>
              <div className="text-xs text-slate-500">{emp?.jobTitle || '—'}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="font-semibold text-slate-900 mb-2">Earnings</div>
              <Row label="Basic" value={formatCurrency(slip?.basicSalary || 0)} />
              <Row label="Housing" value={formatCurrency(slip?.housing || 0)} />
              <Row label="Transport" value={formatCurrency(slip?.transport || 0)} />
              <Row label="Other allowances" value={formatCurrency(slip?.otherAllowances || 0)} />
              <Row label="Gross" value={formatCurrency(slip?.grossSalary || 0)} />
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-2">Deductions</div>
              <Row label="PAYE" value={formatCurrency(slip?.payeeTax || 0)} />
              <Row label="Employee pension" value={formatCurrency(slip?.employeePension || 0)} />
              <Row label="NHF" value={formatCurrency(slip?.nhf || 0)} />
              <Row label="ITF" value={formatCurrency(slip?.itf || 0)} />
              <Row label="Other deductions" value={formatCurrency(slip?.otherDeductions || 0)} />
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="text-sm text-emerald-800 font-semibold">Net Pay</div>
            <div className="text-lg font-extrabold text-emerald-800">{formatCurrency(slip?.netPay || 0)}</div>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Generated: {slip?.createdAt ? formatDate(slip.createdAt) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
