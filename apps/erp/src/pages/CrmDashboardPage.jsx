import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Building2, CheckCircle2, XCircle, Loader2, Search, MapPin } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function CrmDashboardPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: () => api.get('/crm/dashboard').then((r) => r.data.data),
  });

  const { data: agents } = useQuery({
    queryKey: ['crm-agents'],
    queryFn: () => api.get('/crm/agents').then((r) => r.data.data),
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['crm-businesses', statusFilter, search],
    queryFn: () =>
      api
        .get('/crm/businesses', {
          params: { kycStatus: statusFilter || undefined, search: search || undefined },
        })
        .then((r) => r.data),
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, kycStatus }) =>
      api.patch(`/crm/businesses/${id}/kyc`, { kycStatus }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['crm-businesses']);
      qc.invalidateQueries(['crm-dashboard']);
    },
  });

  const list = businesses?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM Manager Portal</h1>
          <p className="text-sm text-slate-500">
            Review KYC submissions and manage your field agents.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Pending KYC</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.pendingKyc ?? 0}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-amber-500" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Active Field Agents</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{agents?.length ?? 0}</p>
          </div>
          <Users className="w-8 h-8 text-blue-500" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Total Businesses</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.totalBusinesses ?? 0}</p>
          </div>
          <Building2 className="w-8 h-8 text-green-500" />
        </div>
      </div>

      {/* KYC queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">KYC Queue</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-700 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                className="border border-slate-300 rounded-md pl-6 pr-2 py-1 text-xs text-slate-700"
                placeholder="Search business…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading businesses…
          </div>
        ) : list.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No businesses match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-sm">
            {list.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900">{b.businessName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    {b.city || b.state ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.city}{b.city && b.state ? ', ' : ''}{b.state}
                      </span>
                    ) : null}
                    <span>Joined {formatDate(b.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-600 bg-slate-50">
                    {b.kycStatus}
                  </span>
                  <button
                    type="button"
                    disabled={kycMutation.isLoading}
                    onClick={() => kycMutation.mutate({ id: b.id, kycStatus: 'APPROVED' })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={kycMutation.isLoading}
                    onClick={() => kycMutation.mutate({ id: b.id, kycStatus: 'REJECTED' })}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

