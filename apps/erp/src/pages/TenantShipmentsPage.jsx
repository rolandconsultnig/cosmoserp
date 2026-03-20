import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, ExternalLink, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

export default function TenantShipmentsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-deliveries', statusFilter],
    queryFn: () =>
      api.get('/logistics/tenant/deliveries', { params: { status: statusFilter || undefined, limit: 50 } }).then((r) => r.data),
  });

  const rows = data?.data || [];

  const trackUrl = (trackingNumber) => {
    const base = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
      ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '')
      : '';
    const path = `/logistics/track/${encodeURIComponent(trackingNumber)}`;
    return base ? `${base}${path}` : `/api${path}`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-subtitle">Logistics requests from your ERP (incl. marketplace)</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING_PICKUP">Pending pickup</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="OUT_FOR_DELIVERY">Out for delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-600" /> Deliveries ({data?.total ?? 0})
        </div>
        {isLoading && (
          <div className="p-12 flex justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-sm">No shipments yet. Create one from marketplace fulfillment or logistics request API.</div>
        )}
        {!isLoading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-4 py-2 font-semibold">Tracking</th>
                  <th className="text-left px-4 py-2 font-semibold">Customer</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-right px-4 py-2 font-semibold">Fee</th>
                  <th className="text-left px-4 py-2 font-semibold">Updated</th>
                  <th className="text-right px-4 py-2 font-semibold">Track</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-800">{d.trackingNumber}</td>
                    <td className="px-4 py-2.5">{d.customerName}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getStatusColor(d.status))}>{d.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(d.deliveryFee)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{formatDate(d.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <a
                        href={trackUrl(d.trackingNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 font-semibold text-xs hover:underline"
                      >
                        Public track <ExternalLink className="w-3 h-3" />
                      </a>
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
