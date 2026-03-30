import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store, Loader2, Package, Truck, AlertTriangle, ShieldCheck, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';
import EscrowTimeline from '../components/EscrowTimeline';

export default function MarketplaceOrdersPage() {
  const qc = useQueryClient();
  const tenant = useAuthStore((s) => s.tenant);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [showLogistics, setShowLogistics] = useState(false);
  const [logisticsCompanyId, setLogisticsCompanyId] = useState('');
  const [logisticsFee, setLogisticsFee] = useState('1500');
  const [logisticsNotes, setLogisticsNotes] = useState('');

  const { data: listRes, isLoading } = useQuery({
    queryKey: ['marketplace-seller-orders', statusFilter],
    queryFn: () =>
      api.get('/seller/marketplace/orders', { params: { status: statusFilter || undefined, limit: 50 } }).then((r) => r.data),
    enabled: !!tenant?.isMarketplaceSeller,
  });

  const { data: detail } = useQuery({
    queryKey: ['marketplace-seller-order', selectedId],
    queryFn: () => api.get(`/seller/marketplace/orders/${selectedId}`).then((r) => r.data.data),
    enabled: !!selectedId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, trackingNumber }) =>
      api.patch(`/seller/marketplace/orders/${id}/status`, { status, trackingNumber }),
    onSuccess: () => {
      qc.invalidateQueries(['marketplace-seller-orders']);
      qc.invalidateQueries(['marketplace-seller-order', selectedId]);
      qc.invalidateQueries(['dashboard']);
      setTrackingInput('');
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id) => api.post(`/seller/marketplace/orders/${id}/release-escrow`),
    onSuccess: () => {
      qc.invalidateQueries(['marketplace-seller-orders']);
      qc.invalidateQueries(['marketplace-seller-order', selectedId]);
      qc.invalidateQueries(['dashboard']);
    },
  });

  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/seller/marketplace/orders/${id}/dispute`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries(['marketplace-seller-orders']);
      qc.invalidateQueries(['marketplace-seller-order', selectedId]);
      qc.invalidateQueries(['dashboard']);
      setShowDispute(false);
      setDisputeReason('');
    },
  });

  const { data: logisticsProviders = [] } = useQuery({
    queryKey: ['logistics-providers'],
    queryFn: () => api.get('/logistics/providers').then((r) => r.data?.data || []),
    enabled: showLogistics && !!selectedId,
    staleTime: 60_000,
  });

  const requestLogisticsMutation = useMutation({
    mutationFn: (payload) => api.post('/logistics/deliveries/request', payload),
    onSuccess: () => {
      qc.invalidateQueries(['marketplace-seller-orders']);
      qc.invalidateQueries(['marketplace-seller-order', selectedId]);
      qc.invalidateQueries(['tenant-deliveries']);
      qc.invalidateQueries(['dashboard']);
      setShowLogistics(false);
      setLogisticsNotes('');
      setLogisticsCompanyId('');
      setLogisticsFee('1500');
    },
  });

  if (!tenant?.isMarketplaceSeller) {
    return (
      <div className="space-y-5 animate-fade-in max-w-lg">
        <div className="page-header">
          <h1 className="page-title">Marketplace orders</h1>
          <p className="page-subtitle">Fulfillment for Cosmos Market</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
          <p className="font-semibold mb-2">Marketplace selling is off for this business</p>
          <p className="text-amber-800 mb-3">Enable marketplace on products and ensure your tenant is flagged as a marketplace seller.</p>
          <Link to="/products" className="text-amber-950 font-bold underline inline-flex items-center gap-1">
            Go to Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const orders = listRes?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketplace orders</h1>
          <p className="page-subtitle">Paid orders containing your listings — ship, track, escrow</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending payment</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PROCESSING">Processing</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="DISPUTED">Disputed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-1">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-indigo-600" /> Your orders
          </div>
          {isLoading && <div className="p-6 text-center text-slate-400 text-sm"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}
          {!isLoading && orders.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">No orders yet</div>
          )}
          {!isLoading && orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { setSelectedId(o.id); setTrackingInput(o.trackingNumber || ''); }}
              className={cn(
                'w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition',
                selectedId === o.id && 'bg-indigo-50',
              )}
            >
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-slate-900 text-sm">{o.orderNumber}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getStatusColor(o.status))}>{o.status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{formatDate(o.createdAt)}</div>
              <div className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(o.sellerNetTotal)} <span className="text-slate-400 font-normal">your net</span></div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedId && (
            <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
              Select an order to manage fulfillment
            </div>
          )}
          {selectedId && detail && (
            <>
              <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                <div className="flex flex-wrap justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{detail.orderNumber}</h2>
                    <p className="text-sm text-slate-500">Buyer: {detail.buyerName} · {detail.buyerEmail}</p>
                  </div>
                  <span className={cn('h-fit px-3 py-1 rounded-full text-xs font-bold', getStatusColor(detail.status))}>{detail.status}</span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4">
                  <EscrowTimeline order={detail} sellerPayout={detail.sellerPayout} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Your net (this order)</div>
                    <div className="text-xl font-bold text-emerald-700">{formatCurrency(detail.sellerNetTotal)}</div>
                  </div>
                  {detail.trackingNumber && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Tracking</div>
                      <div className="font-mono font-semibold text-slate-800">{detail.trackingNumber}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {detail.paymentStatus === 'SUCCESS' && detail.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ id: detail.id, status: 'PROCESSING' })}
                      disabled={statusMutation.isPending}
                      className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                      Mark processing
                    </button>
                  )}
                  {detail.paymentStatus === 'SUCCESS' &&
                    ['CONFIRMED', 'PROCESSING'].includes(detail.status) &&
                    !['DISPUTED', 'CANCELLED', 'REFUNDED'].includes(detail.status) && (
                    <button
                      type="button"
                      onClick={() => setShowLogistics(true)}
                      className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold px-4 py-2 rounded-lg"
                    >
                      <Truck className="w-4 h-4 text-indigo-600" />
                      Book delivery
                    </button>
                  )}
                  {detail.paymentStatus === 'SUCCESS' && detail.status === 'PROCESSING' && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tracking (optional)</label>
                        <input
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-48"
                          placeholder="AWB / tracking #"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({
                            id: detail.id,
                            status: 'SHIPPED',
                            trackingNumber: trackingInput.trim() || undefined,
                          })}
                        disabled={statusMutation.isPending}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                        Mark shipped
                      </button>
                    </div>
                  )}
                  {detail.status === 'DELIVERED' && detail.escrowStatus === 'HELD' && (
                    <button
                      type="button"
                      onClick={() => releaseMutation.mutate(detail.id)}
                      disabled={releaseMutation.isPending}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {releaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Release escrow (single-seller orders)
                    </button>
                  )}
                  {!['DELIVERED', 'CANCELLED', 'REFUNDED', 'DISPUTED'].includes(detail.status) && (
                    <button
                      type="button"
                      onClick={() => setShowDispute(true)}
                      className="inline-flex items-center gap-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 text-sm font-semibold px-4 py-2 rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4" /> Open dispute
                    </button>
                  )}
                </div>

                {(statusMutation.isError || releaseMutation.isError || disputeMutation.isError || requestLogisticsMutation.isError) && (
                  <p className="text-sm text-red-600 mb-2">
                    {statusMutation.error?.response?.data?.error ||
                      releaseMutation.error?.response?.data?.error ||
                      disputeMutation.error?.response?.data?.error ||
                      requestLogisticsMutation.error?.response?.data?.error ||
                      'Action failed'}
                  </p>
                )}

                {detail.sellerPayout?.status === 'FAILED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                    <div className="font-semibold">Payout failed</div>
                    {detail.sellerPayout?.errorMessage && (
                      <div className="text-xs mt-1 text-red-600">{detail.sellerPayout.errorMessage}</div>
                    )}
                    <p className="text-xs mt-2">Contact support if this issue persists.</p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Your lines</h3>
                  <ul className="space-y-2 text-sm">
                    {(detail.sellerLines || []).map((line) => (
                      <li key={line.id} className="flex justify-between py-2 border-b border-slate-50">
                        <span>{line.productName} × {line.quantity}</span>
                        <span className="font-semibold">{formatCurrency(line.sellerNet)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {(detail.deliveries || []).length > 0 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Linked deliveries</h3>
                    <ul className="text-sm space-y-1">
                      {detail.deliveries.map((d) => (
                        <li key={d.id} className="flex justify-between">
                          <span className="font-mono text-xs">{d.trackingNumber}</span>
                          <span className={cn('text-xs font-bold', getStatusColor(d.status))}>{d.status}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/shipments" className="text-xs text-indigo-600 font-semibold mt-2 inline-block hover:underline">
                      View all shipments →
                    </Link>
                  </div>
                )}
              </div>

              {showDispute && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDispute(false)}>
                  <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-bold text-slate-900 mb-2">Open dispute</h3>
                    <p className="text-sm text-slate-500 mb-3">Describe the issue. The order will be marked DISPUTED and escrow frozen for platform review.</p>
                    <textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-28 mb-4"
                      placeholder="Reason…"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" className="px-4 py-2 text-sm font-semibold text-slate-600" onClick={() => setShowDispute(false)}>Cancel</button>
                      <button
                        type="button"
                        disabled={!disputeReason.trim() || disputeMutation.isPending}
                        onClick={() => disputeMutation.mutate({ id: detail.id, reason: disputeReason })}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                      >
                        {disputeMutation.isPending ? 'Saving…' : 'Submit dispute'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showLogistics && detail && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !requestLogisticsMutation.isPending && setShowLogistics(false)}>
                  <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-bold text-slate-900 mb-1">Book delivery</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Creates a logistics shipment with buyer details from this order. Tracking syncs to the order and buyers can get email updates when the courier updates status.
                    </p>
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Partner (optional)</label>
                        <select
                          value={logisticsCompanyId}
                          onChange={(e) => setLogisticsCompanyId(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="">Any / unassigned</option>
                          {(logisticsProviders || []).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}{p.city ? ` — ${p.city}` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Delivery fee (NGN)</label>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={logisticsFee}
                          onChange={(e) => setLogisticsFee(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes (optional)</label>
                        <textarea
                          value={logisticsNotes}
                          onChange={(e) => setLogisticsNotes(e.target.value)}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Pickup instructions, fragile, etc."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-semibold text-slate-600"
                        disabled={requestLogisticsMutation.isPending}
                        onClick={() => setShowLogistics(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={requestLogisticsMutation.isPending}
                        onClick={() =>
                          requestLogisticsMutation.mutate({
                            orderId: detail.id,
                            companyId: logisticsCompanyId || undefined,
                            deliveryFee: parseFloat(logisticsFee) || 1500,
                            notes: logisticsNotes.trim() || undefined,
                          })}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {requestLogisticsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                        Create shipment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
