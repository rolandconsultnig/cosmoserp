import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Palmtree,
  Loader2,
  Check,
  X,
  Filter,
  ExternalLink,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, cn, getStatusColor } from '../lib/utils';

function empName(emp) {
  if (!emp) return '—';
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—';
}

export default function LeaveManagementPage() {
  const [filter, setFilter] = useState('PENDING'); // PENDING | ALL | APPROVED | REJECTED | CANCELLED
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['leave-requests', filter === 'ALL' ? 'all' : filter],
    queryFn: () =>
      api
        .get(filter === 'ALL' ? '/leave-requests' : `/leave-requests?status=${filter}`)
        .then((r) => r.data.data),
  });

  const decideMutation = useMutation({
    mutationFn: ({ id, action }) => api.patch(`/leave-requests/${id}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] });
      qc.invalidateQueries({ queryKey: ['calendar-feed'] });
    },
  });

  const rows = data || [];

  const pendingCount = useMemo(() => {
    if (!data || filter !== 'ALL') return null;
    return data.filter((r) => r.status === 'PENDING').length;
  }, [data, filter]);

  if (error?.response?.status === 403) {
    return (
      <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Palmtree className="w-6 h-6" />
          Leave management
        </h1>
        <p className="text-sm mt-2">
          Only <strong>Owner</strong>, <strong>Admin</strong>, and <strong>HR</strong> roles can approve leave requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Palmtree className="w-7 h-7 text-emerald-600" />
            Leave management
          </h1>
          <p className="page-subtitle">
            Review requests from the staff portal — approve or reject. Approved leave appears on the{' '}
            <Link to="/calendar" className="text-blue-600 hover:underline font-medium">
              Calendar
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status
          </span>
          {['PENDING', 'ALL', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors',
                filter === s
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filter === 'ALL' && pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <strong>{pendingCount}</strong> request(s) awaiting decision — filter by{' '}
          <button type="button" className="underline font-semibold" onClick={() => setFilter('PENDING')}>
            Pending
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold">Employee</th>
                  <th className="text-left px-4 py-3 font-semibold">Dates</th>
                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Decided</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-slate-400">
                      No leave requests in this view.
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
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {formatDate(row.startDate)} → {formatDate(row.endDate)}
                    </td>
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
                      {row.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={decideMutation.isPending}
                            onClick={() => decideMutation.mutate({ id: row.id, action: 'approve' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={decideMutation.isPending}
                            onClick={() => decideMutation.mutate({ id: row.id, action: 'reject' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
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

      <p className="text-xs text-slate-500 flex items-center gap-1">
        <ExternalLink className="w-3.5 h-3.5" />
        Staff apply under <Link to="/staff-portal" className="text-blue-600 hover:underline">Staff portal</Link> → Leave.
      </p>
    </div>
  );
}
