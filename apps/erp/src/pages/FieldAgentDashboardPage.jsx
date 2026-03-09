import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import api from '../lib/api';

export default function FieldAgentDashboardPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    industry: '',
  });

  const { data: me } = useQuery({
    queryKey: ['agent-me'],
    queryFn: () => api.get('/agents/me').then((r) => r.data.data),
  });

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['agent-businesses', search],
    queryFn: () =>
      api
        .get('/agents/businesses', { params: { search } })
        .then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/agents/businesses', payload).then((r) => r.data),
    onSuccess: () => {
      setForm({
        businessName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        industry: '',
      });
      qc.invalidateQueries(['agent-businesses']);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const list = businesses?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Field Agent Portal</h1>
          <p className="text-sm text-slate-500">
            Onboard businesses and lodge them for KYC review.
          </p>
          {me?.tenant && (
            <p className="text-xs text-slate-400 mt-1">
              Your base: {me.tenant.tradingName || me.tenant.businessName} · {me.tenant.city}, {me.tenant.state}
            </p>
          )}
        </div>
      </div>

      {/* New business form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Business Name</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-60"
            >
              {createMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {createMutation.isLoading ? 'Saving…' : 'Add Business'}
            </button>
          </div>
        </form>
        {createMutation.error && (
          <p className="text-xs text-red-600 mt-2">
            {createMutation.error.response?.data?.error || 'Failed to create business'}
          </p>
        )}
      </div>

      {/* Search + list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-900 text-sm">Businesses</h2>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-sm"
              placeholder="Search by name, email, city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading businesses…
          </div>
        ) : list.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No businesses found yet. Use the form above to onboard your first one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {list.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-slate-900">{b.businessName}</div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                    {b.city || b.state ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {b.city}{b.city && b.state ? ', ' : ''}{b.state}
                      </span>
                    ) : null}
                    {b.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {b.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-600 bg-slate-50">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {b.kycStatus || 'PENDING'}
                  </div>
                  {b.email && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Mail className="w-3 h-3" />
                      {b.email}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

