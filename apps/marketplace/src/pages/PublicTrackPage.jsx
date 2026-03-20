import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Loader2, MapPin, Truck, Building2, Phone, ChevronLeft } from 'lucide-react';

const apiBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '')
  : '/api';

const STATUS_LABEL = {
  PENDING_PICKUP: 'Pending pickup',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

async function fetchTracking(code) {
  const res = await fetch(`${apiBase}/logistics/track/${encodeURIComponent(code.trim())}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Shipment not found');
  return json.data;
}

export default function PublicTrackPage() {
  const { code: codeFromRoute } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(codeFromRoute || '');

  useEffect(() => {
    if (codeFromRoute) setInput(codeFromRoute);
  }, [codeFromRoute]);

  const activeCode = (codeFromRoute || '').trim() || null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['public-logistics-track', activeCode],
    queryFn: () => fetchTracking(activeCode),
    enabled: !!activeCode,
    retry: false,
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    navigate(`/track/${encodeURIComponent(q)}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to shop
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Truck className="w-5 h-5 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Track shipment</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Enter the tracking number from your email or order confirmation.
      </p>

      <form onSubmit={onSubmit} className="flex gap-2 mb-8">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. COS-XXXX-1234"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="btn-buy px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap"
        >
          Track
        </button>
      </form>

      {activeCode && (
        <div className="card p-5">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading…
            </div>
          )}
          {isError && (
            <p className="text-sm text-red-600 py-4">{error?.message || 'Could not load shipment.'}</p>
          )}
          {data && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tracking</p>
                  <p className="font-mono font-bold text-gray-900">{data.trackingNumber}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800">
                  {STATUS_LABEL[data.status] || data.status}
                </span>
              </div>

              {data.status === 'FAILED' && data.failureReason && (
                <div className="rounded-lg bg-red-50 text-red-800 text-sm p-3">{data.failureReason}</div>
              )}

              <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span>{data.customerName}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{data.deliveryAddress}</span>
                </div>
                {data.company?.name && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{data.company.name}</span>
                  </div>
                )}
                {data.agent && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>
                      {data.agent.firstName} {data.agent.lastName}
                      {data.agent.phone && ` · ${data.agent.phone}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
