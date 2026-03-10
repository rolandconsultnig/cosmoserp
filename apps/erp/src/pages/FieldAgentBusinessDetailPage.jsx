import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, Loader2, FileCheck } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/utils';

export default function FieldAgentBusinessDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-business', id],
    queryFn: () => api.get(`/agents/businesses/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" /> Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/field-agent/businesses" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to My Businesses
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Business not found or you don’t have access to it.
        </div>
      </div>
    );
  }

  const b = data;
  const statusClass =
    b.kycStatus === 'APPROVED'
      ? 'bg-green-100 text-green-700'
      : b.kycStatus === 'REJECTED'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/field-agent/businesses"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> My Businesses
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{b.businessName}</h1>
              {b.tradingName && (
                <p className="text-sm text-slate-500">{b.tradingName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/field-agent/businesses/${b.id}/kyc`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              <FileCheck className="w-4 h-4" /> KYC
            </Link>
            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${statusClass}`}>
              {b.kycStatus || 'PENDING'}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {b.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</div>
                  <a href={`mailto:${b.email}`} className="text-slate-900 hover:text-emerald-600">
                    {b.email}
                  </a>
                </div>
              </div>
            )}
            {b.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</div>
                  <a href={`tel:${b.phone}`} className="text-slate-900 hover:text-emerald-600">
                    {b.phone}
                  </a>
                </div>
              </div>
            )}
            {(b.address || b.city || b.state) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Address</div>
                  <div className="text-slate-900">
                    {[b.address, b.city, b.state].filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
            {b.industry && (
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Industry</div>
                <div className="text-slate-900">{b.industry}</div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Onboarded</div>
                <div className="text-slate-900">{formatDate(b.createdAt)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Subscription</div>
              <div className="text-slate-900">{b.subscriptionStatus || 'TRIAL'}</div>
              {b.trialEndsAt && (
                <div className="text-xs text-slate-500">Trial ends {formatDate(b.trialEndsAt)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
