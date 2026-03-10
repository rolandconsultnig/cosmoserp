import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function FieldAgentDashboardPage() {
  const { data: me } = useQuery({
    queryKey: ['agent-me'],
    queryFn: () => api.get('/agents/me').then((r) => r.data.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: () => api.get('/agents/dashboard').then((r) => r.data.data),
  });

  const { data: recent, isLoading } = useQuery({
    queryKey: ['agent-businesses-recent'],
    queryFn: () =>
      api
        .get('/agents/businesses', { params: { limit: 5 } })
        .then((r) => r.data.data),
  });

  const stats = dashboard || {};
  const list = recent || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Field Agent Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Onboard businesses and lodge them for KYC review.
        </p>
        {me?.tenant && (
          <p className="text-xs text-slate-400 mt-1">
            Your base: {me.tenant.tradingName || me.tenant.businessName} · {me.tenant.city}, {me.tenant.state}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalBusinesses ?? 0}</div>
              <div className="text-xs text-slate-500">Total onboarded</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.pendingKyc ?? 0}</div>
              <div className="text-xs text-slate-500">Pending KYC</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.approvedKyc ?? 0}</div>
              <div className="text-xs text-slate-500">Approved</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats.rejectedKyc ?? 0}</div>
              <div className="text-xs text-slate-500">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent businesses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent businesses</h2>
          <Link
            to="/field-agent/businesses"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No businesses yet. <Link to="/field-agent/businesses/new" className="text-emerald-600 font-medium hover:underline">Add your first business</Link>.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((b) => (
              <Link
                key={b.id}
                to={`/field-agent/businesses/${b.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900">{b.businessName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {b.city && b.state ? `${b.city}, ${b.state}` : b.email} · {formatDate(b.createdAt)}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    b.kycStatus === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : b.kycStatus === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {b.kycStatus || 'PENDING'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
