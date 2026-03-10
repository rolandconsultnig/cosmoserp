import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function FieldAgentBusinessesPage() {
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['agent-businesses', search, kycFilter, page],
    queryFn: () =>
      api
        .get('/agents/businesses', {
          params: { search: search || undefined, kycStatus: kycFilter || undefined, page, limit: 15 },
        })
        .then((r) => r.data),
  });

  const list = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = meta.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Businesses</h1>
        <p className="text-sm text-slate-500 mt-0.5">Businesses you have onboarded. Lodge new ones for KYC review.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm"
              placeholder="Search by name, email, city…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Link
            to="/field-agent/businesses/new"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Building2 className="w-4 h-4" /> New Business
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No businesses found. <Link to="/field-agent/businesses/new" className="text-emerald-600 font-medium hover:underline">Add a business</Link>.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {list.map((b) => (
                <Link
                  key={b.id}
                  to={`/field-agent/businesses/${b.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900">{b.businessName}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs mt-1">
                      {b.city || b.state ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[b.city, b.state].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                      {b.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {b.phone}
                        </span>
                      )}
                      {b.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {b.email}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Onboarded {formatDate(b.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        b.kycStatus === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : b.kycStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {b.kycStatus || 'PENDING'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Page {meta.page ?? 1} of {totalPages} · {meta.total ?? 0} total
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
