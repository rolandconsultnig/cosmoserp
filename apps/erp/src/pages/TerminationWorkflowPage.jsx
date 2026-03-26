import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { UserX, Loader2, Check, Undo2, Filter } from 'lucide-react';
import api from '../lib/api';
import { cn, formatDate, getStatusColor } from '../lib/utils';

function empName(emp) {
  if (!emp) return '—';
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
}

export default function TerminationWorkflowPage() {
  const [filter, setFilter] = useState('SUBMITTED');
  const [deactivateEmployee, setDeactivateEmployee] = useState(true);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['resignations', filter === 'ALL' ? 'all' : filter],
    queryFn: () =>
      api
        .get(filter === 'ALL' ? '/resignations' : `/resignations?status=${filter}`)
        .then((r) => r.data.data),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, action }) =>
      api.patch(`/resignations/${id}`, { action, deactivateEmployee }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resignations'] });
      qc.invalidateQueries({ queryKey: ['staff-portal', 'resignations'] });
    },
  });

  const rows = data || [];
  const submittedCount = useMemo(
    () => rows.filter((r) => r.status === 'SUBMITTED').length,
    [rows]
  );

  if (error?.response?.status === 403) {
    return (
      <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <UserX className="w-6 h-6" />
          Termination workflow
        </h1>
        <p className="text-sm mt-2">
          Only <strong>Owner</strong>, <strong>Admin</strong>, and <strong>HR</strong> roles can manage resignations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserX className="w-7 h-7 text-rose-600" />
            Termination workflow
          </h1>
          <p className="page-subtitle">
            Process staff resignation requests submitted under{' '}
            <Link to="/staff-portal" className="text-blue-600 hover:underline font-medium">
              Staff Portal
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status
          </span>
          {['SUBMITTED', 'ALL', 'ACKNOWLEDGED', 'WITHDRAWN'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors',
                filter === s
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 flex flex-wrap gap-3 items-center">
        <span>Submitted in current view: <strong>{submittedCount}</strong></span>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={deactivateEmployee}
            onChange={(e) => setDeactivateEmployee(e.target.checked)}
          />
          Mark employee inactive when acknowledging
        </label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-3 font-semibold">Last working day</th>
                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Decision</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-slate-400">
                      No resignations in this view.
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{empName(row.employee)}</div>
                      <div className="text-xs text-slate-500">
                        {row.employee?.staffId && `ID ${row.employee.staffId}`}
                        {row.employee?.department && ` · ${row.employee.department}`}
                        {row.employee?.isActive === false && ' · inactive'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.submittedAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(row.lastWorkingDate)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={row.reason || ''}>
                      {row.reason || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.decidedAt ? (
                        <>
                          {formatDate(row.decidedAt)}
                          {row.decidedBy && (
                            <span className="block text-slate-400">
                              by {row.decidedBy.firstName} {row.decidedBy.lastName}
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === 'SUBMITTED' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={decideMutation.isPending}
                            onClick={() => decideMutation.mutate({ id: row.id, action: 'acknowledge' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Acknowledge
                          </button>
                          <button
                            type="button"
                            disabled={decideMutation.isPending}
                            onClick={() => decideMutation.mutate({ id: row.id, action: 'withdraw' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50"
                          >
                            <Undo2 className="w-3.5 h-3.5" /> Mark withdrawn
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
