import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Briefcase, Banknote, Shield, Building2, TrendingUp,
  ChevronLeft, ChevronRight, UserCheck, Clock, FileText,
  CheckCircle, XCircle, Loader2, X, Ban,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

function fmt(v) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(v || 0); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

const EMP_TYPE = {
  FULL_TIME: { label: 'Full-Time', color: '#00875A', bg: '#E3FCEF' },
  PART_TIME: { label: 'Part-Time', color: '#0052CC', bg: '#EBF2FF' },
  CONTRACT:  { label: 'Contract',  color: '#FF8B00', bg: '#FFF7E6' },
  INTERN:    { label: 'Intern',    color: '#6366F1', bg: '#EEF2FF' },
};

const PAY_STATUS = {
  DRAFT:      { label: 'Draft',      color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
  PROCESSING: { label: 'Processing', color: '#0052CC', bg: '#EBF2FF', border: '#A4CDFF' },
  APPROVED:   { label: 'Approved',   color: '#FF8B00', bg: '#FFF7E6', border: '#FFE0A3' },
  PAID:       { label: 'Paid',       color: '#00875A', bg: '#E3FCEF', border: '#ABF5D1' },
  CANCELLED:  { label: 'Cancelled',  color: '#DE350B', bg: '#FFEBE6', border: '#FFC3B2' },
};

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HRPayrollPage() {
  const [tab, setTab] = useState('overview');
  const [payPage, setPayPage] = useState(1);
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const qc = useQueryClient();

  const invalidateAll = () => { qc.invalidateQueries(['admin-hr-overview']); qc.invalidateQueries(['admin-payroll-runs']); };

  const { data: overview } = useQuery({
    queryKey: ['admin-hr-overview'],
    queryFn: () => api.get('/admin/hr/overview').then(r => r.data.data).catch(() => ({})),
  });

  const { data: payrollData, isLoading: payLoading } = useQuery({
    queryKey: ['admin-payroll-runs', payPage, payStatusFilter],
    queryFn: () => api.get('/admin/hr/payroll-runs', { params: { page: payPage, limit: 20, status: payStatusFilter || undefined } }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'payroll',
    keepPreviousData: true,
  });

  const payrollStatusMutation = useMutation({
    mutationFn: ({ payrollId, status }) => api.patch(`/admin/hr/payroll-runs/${payrollId}/status`, { status }),
    onSuccess: invalidateAll,
  });

  const d = overview || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-black text-slate-900 tracking-tight">HR & Payroll Management</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Cross-tenant workforce analytics, payroll approval, and compliance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: d.totalEmployees || 0, sub: 'Active across tenants', icon: Users, color: '#0052CC' },
          { label: 'Net Payroll Paid', value: fmt(d.totalNetPaid), sub: 'Lifetime total', icon: Banknote, color: '#00875A' },
          { label: 'Total PAYE', value: fmt(d.totalPAYE), sub: 'Tax remitted', icon: Shield, color: '#7C3AED' },
          { label: 'Total Pension', value: fmt(d.totalPension), sub: 'Employee + Employer', icon: Briefcase, color: '#FF8B00' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[22px] font-black text-slate-900 tracking-tight">{value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'payroll', label: 'Manage Payroll' },
          { id: 'compliance', label: 'Tax Compliance' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employment type breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Employee Distribution</h3>
            <div className="space-y-3">
              {(d.employeesByType || []).map(e => {
                const cfg = EMP_TYPE[e.employmentType] || EMP_TYPE.FULL_TIME;
                const pct = d.totalEmployees ? Math.round((e._count / d.totalEmployees) * 100) : 0;
                return (
                  <div key={e.employmentType} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                      <UserCheck className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[13px] mb-1">
                        <span className="font-bold text-slate-700">{cfg.label}</span>
                        <span className="font-bold" style={{ color: cfg.color }}>{e._count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {(d.employeesByType || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No employee data</p>}
            </div>
          </div>

          {/* Top employers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Top Employers</h3>
            <div className="space-y-2">
              {(d.topEmployers || []).map((t, i) => (
                <div key={t.tenantId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-black">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{t.tenant?.businessName || 'Unknown'}</p>
                  </div>
                  <span className="text-[14px] font-black text-indigo-600">{t._count} staff</span>
                </div>
              ))}
              {(d.topEmployers || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No data</p>}
            </div>
          </div>

          {/* Recent payroll months */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Recent Payroll Months</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Period', 'Gross', 'Net', 'PAYE', 'Pension'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(d.payrollByMonth || []).map((p, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-800">{MONTHS[p.month]} {p.year}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums text-slate-700">{fmt(p.totalGross)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold tabular-nums text-emerald-600">{fmt(p.totalNet)}</td>
                      <td className="px-4 py-2.5 text-[12px] tabular-nums text-slate-500">{fmt(p.totalPaye)}</td>
                      <td className="px-4 py-2.5 text-[12px] tabular-nums text-slate-500">{fmt(p.totalPension)}</td>
                    </tr>
                  ))}
                  {(d.payrollByMonth || []).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-[13px]">No payroll data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manage Payroll Tab */}
      {tab === 'payroll' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={payStatusFilter} onChange={e => { setPayStatusFilter(e.target.value); setPayPage(1); }}
              className="text-[13px] border border-slate-200 rounded-xl px-3 py-2">
              <option value="">All Statuses</option>
              {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {payStatusFilter && (
              <button onClick={() => { setPayStatusFilter(''); setPayPage(1); }}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-700">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['Tenant', 'Period', 'Status', 'Staff', 'Gross', 'Net', 'PAYE', 'Pension', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payLoading && [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      {[...Array(10)].map((_, j) => <td key={j} className="px-3 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                    </tr>
                  ))}
                  {(payrollData?.data || []).map(run => {
                    const cfg = PAY_STATUS[run.status] || PAY_STATUS.DRAFT;
                    const canApprove = ['DRAFT', 'PROCESSING'].includes(run.status);
                    const canPay = run.status === 'APPROVED';
                    const canCancel = ['DRAFT', 'PROCESSING', 'APPROVED'].includes(run.status);
                    return (
                      <tr key={run.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-3 text-[12px] font-semibold text-indigo-600">{run.tenant?.businessName}</td>
                        <td className="px-3 py-3 text-[13px] font-bold text-slate-800">{MONTHS[run.month]} {run.year}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>
                        </td>
                        <td className="px-3 py-3 text-[13px] font-bold text-slate-700">{run._count?.payslips || 0}</td>
                        <td className="px-3 py-3 text-[12px] tabular-nums text-slate-700">{fmt(run.totalGross)}</td>
                        <td className="px-3 py-3 text-[13px] font-bold tabular-nums text-emerald-600">{fmt(run.totalNet)}</td>
                        <td className="px-3 py-3 text-[12px] tabular-nums text-slate-500">{fmt(run.totalPaye)}</td>
                        <td className="px-3 py-3 text-[12px] tabular-nums text-slate-500">{fmt(run.totalPension)}</td>
                        <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap">{fmtDate(run.createdAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {canApprove && (
                              <button onClick={() => payrollStatusMutation.mutate({ payrollId: run.id, status: 'APPROVED' })}
                                disabled={payrollStatusMutation.isPending}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Approve payroll">
                                <CheckCircle className="w-3 h-3" /> Approve
                              </button>
                            )}
                            {canPay && (
                              <button onClick={() => payrollStatusMutation.mutate({ payrollId: run.id, status: 'PAID' })}
                                disabled={payrollStatusMutation.isPending}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Mark as paid">
                                <Banknote className="w-3 h-3" /> Mark Paid
                              </button>
                            )}
                            {canCancel && (
                              <button onClick={() => payrollStatusMutation.mutate({ payrollId: run.id, status: 'CANCELLED' })}
                                disabled={payrollStatusMutation.isPending}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Cancel payroll">
                                <Ban className="w-3 h-3" />
                              </button>
                            )}
                            {run.status === 'PAID' && (
                              <span className="text-[10px] font-bold text-emerald-500 italic">Completed</span>
                            )}
                            {run.status === 'CANCELLED' && (
                              <span className="text-[10px] font-bold text-red-400 italic">Cancelled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!payLoading && (payrollData?.data || []).length === 0 && (
                    <tr><td colSpan={10} className="text-center py-16">
                      <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-[13px] text-slate-400">No payroll runs found</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(payrollData?.pagination?.totalPages || payrollData?.totalPages || 0) > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-[12px] text-slate-400">Page {payPage} of {payrollData.pagination?.totalPages || payrollData.totalPages}</span>
                <div className="flex gap-1.5">
                  <button disabled={payPage === 1} onClick={() => setPayPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button disabled={payPage >= (payrollData.pagination?.totalPages || payrollData.totalPages)} onClick={() => setPayPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" /> Tax Compliance Summary
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-4 text-center" style={{ background: '#EBF2FF', border: '1px solid #A4CDFF' }}>
                <p className="text-[20px] font-black" style={{ color: '#0052CC' }}>{fmt(d.totalPAYE)}</p>
                <p className="text-[11px] font-bold text-slate-500">PAYE Tax</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#FFF7E6', border: '1px solid #FFE0A3' }}>
                <p className="text-[20px] font-black" style={{ color: '#FF8B00' }}>{fmt(d.totalPension)}</p>
                <p className="text-[11px] font-bold text-slate-500">Pension</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <p className="text-[20px] font-black" style={{ color: '#7C3AED' }}>{fmt(d.totalNHF)}</p>
                <p className="text-[11px] font-bold text-slate-500">NHF</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#E3FCEF', border: '1px solid #ABF5D1' }}>
                <p className="text-[20px] font-black" style={{ color: '#00875A' }}>{d.activePayrolls || 0}</p>
                <p className="text-[11px] font-bold text-slate-500">Active Payrolls</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4">Filing Status by Type</h3>
            <div className="space-y-2">
              {(d.complianceStats || []).map((s, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-[13px] font-bold text-slate-700">{s.type}</span>
                    <span className="text-[11px] text-slate-400">· {s.status}</span>
                  </div>
                  <span className="text-[14px] font-black text-slate-900">{s._count}</span>
                </div>
              ))}
              {(d.complianceStats || []).length === 0 && <p className="text-[13px] text-slate-400 text-center py-4">No filings recorded</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
