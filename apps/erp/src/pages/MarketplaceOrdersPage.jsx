import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store, Loader2, Package, Truck, AlertTriangle, ShieldCheck, ChevronRight, Check,
} from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { formatCurrency, formatDate, getStatusColor, getEscrowBadgeClass, cn } from '../lib/utils';

/** Vertical steps: payment → prepare → ship → delivered → escrow (labels match seller actions). */
function buildSellerOrderTimeline(detail) {
  const paid = detail.paymentStatus === 'SUCCESS';
  const st = detail.status;
  const esc = detail.escrowStatus;
  const disputed = st === 'DISPUTED' || esc === 'DISPUTED';
  const refunded = st === 'REFUNDED' || esc === 'REFUNDED';
  const cancelled = st === 'CANCELLED';

  const steps = [];

  steps.push({
    key: 'payment',
    title: 'Payment captured',
    subtitle: paid
      ? detail.paidAt
        ? `Paid ${formatDate(detail.paidAt)}`
        : 'Successful — you can fulfill'
      : 'Fulfillment unlocks after payment succeeds',
    state: paid ? 'complete' : 'current',
    actionHint: paid ? null : 'No fulfillment actions until paid',
  });

  let prepState = 'upcoming';
  let prepSub = 'Use “Mark processing” when you start packing';
  if (!paid) {
    prepState = 'blocked';
    prepSub = 'Waiting for payment';
  } else if (['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(st)) {
    prepState = 'complete';
    prepSub = 'Processing started';
  } else if (st === 'CONFIRMED') {
    prepState = 'current';
  } else if (cancelled || refunded) {
    prepState = 'blocked';
    prepSub = cancelled ? 'Order cancelled' : 'Order refunded';
  } else if (disputed) {
    prepState = 'blocked';
    prepSub = 'Dispute opened — see escrow';
  }
  steps.push({
    key: 'prep',
    title: 'Preparing',
    subtitle: prepSub,
    state: prepState,
    actionHint: paid && st === 'CONFIRMED' ? 'Eligible: Mark processing' : null,
  });

  let shipState = 'upcoming';
  let shipSub = 'Use “Mark shipped” (tracking optional)';
  if (!paid) {
    shipState = 'blocked';
    shipSub = 'Waiting for payment';
  } else if (['SHIPPED', 'DELIVERED'].includes(st)) {
    shipState = 'complete';
    shipSub = detail.trackingNumber ? `Tracking: ${detail.trackingNumber}` : 'Marked shipped';
  } else if (st === 'PROCESSING') {
    shipState = 'current';
  } else if (st === 'CONFIRMED') {
    shipSub = 'Mark processing first';
  } else if (cancelled || refunded || disputed) {
    shipState = 'blocked';
    shipSub = '—';
  }
  steps.push({
    key: 'ship',
    title: 'Shipped',
    subtitle: shipSub,
    state: shipState,
    actionHint: paid && st === 'PROCESSING' ? 'Eligible: Mark shipped' : null,
  });

  let delState = 'upcoming';
  let delSub = 'Courier / logistics marks delivered (or platform sync)';
  if (!paid) {
    delState = 'blocked';
  } else if (st === 'DELIVERED') {
    delState = 'complete';
    delSub = detail.deliveredAt ? `Delivered ${formatDate(detail.deliveredAt)}` : 'Delivered to buyer';
  } else if (st === 'SHIPPED') {
    delState = 'current';
    delSub = 'In transit — waiting for delivery confirmation';
  } else if (cancelled || refunded) {
    delState = 'blocked';
    delSub = '—';
  } else if (disputed) {
    delState = 'blocked';
    delSub = '—';
  }
  steps.push({
    key: 'delivered',
    title: 'Delivered',
    subtitle: delSub,
    state: delState,
    actionHint: null,
  });

  let escState = 'upcoming';
  let escSub = 'Funds stay protected until release after delivery';
  let escHint = null;
  if (disputed) {
    escState = 'warning';
    escSub = 'Escrow disputed — platform review';
    escHint = 'Release not available';
  } else if (refunded) {
    escState = 'complete';
    escSub = 'Refunded to buyer';
  } else if (esc === 'RELEASED') {
    escState = 'complete';
    escSub = 'Released — record only; settle payouts per your process';
  } else if (esc === 'HELD') {
    if (st === 'DELIVERED') {
      if (detail.isMultiSeller) {
        escState = 'warning';
        escSub = `Multi-seller cart (${detail.sellerTenantCount ?? '?'} sellers)`;
        escHint = 'Release escrow only from the platform admin console';
      } else {
        escState = 'current';
        escSub = 'Eligible to release escrow on this order';
        escHint = 'Eligible: Release escrow';
      }
    } else {
      escSub = 'Available only when order is DELIVERED and escrow is HELD';
      escHint = st !== 'DELIVERED' ? 'Wait for delivery confirmation' : null;
    }
  } else if (cancelled) {
    escState = 'blocked';
    escSub = '—';
  }
  steps.push({
    key: 'escrow',
    title: 'Escrow',
    subtitle: `${esc} · ${escSub}`,
    state: escState,
    actionHint: escHint,
  });

  return steps;
}

function timelineDotClass(state) {
  if (state === 'complete') return 'bg-emerald-500 text-white border-emerald-600';
  if (state === 'current') return 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-200';
  if (state === 'warning') return 'bg-amber-500 text-white border-amber-600';
  if (state === 'blocked') return 'bg-slate-200 text-slate-400 border-slate-300';
  return 'bg-white text-slate-300 border-slate-200';
}

function timelineLineClass(state) {
  if (state === 'complete') return 'bg-emerald-200';
  if (state === 'current' || state === 'warning') return 'bg-indigo-200';
  return 'bg-slate-100';
}

function ReleaseEscrowButton({ detail, releaseMutation }) {
  if (detail.status !== 'DELIVERED' || detail.escrowStatus !== 'HELD') return null;
  const canRelease = detail.paymentStatus === 'SUCCESS' && !detail.isMultiSeller;
  const releaseTitle = !canRelease
    ? detail.isMultiSeller
      ? 'This order includes multiple sellers. Release escrow from the platform admin console.'
      : 'Payment must be successful before releasing escrow.'
    : undefined;
  return (
    <button
      type="button"
      onClick={() => canRelease && releaseMutation.mutate(detail.id)}
      disabled={releaseMutation.isPending || !canRelease}
      title={releaseTitle}
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50',
        canRelease
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
          : 'bg-slate-200 text-slate-600 cursor-not-allowed',
      )}
    >
      {releaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
      Release escrow
    </button>
  );
}

function SellerOrderTimeline({ detail }) {
  const steps = buildSellerOrderTimeline(detail);
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Order &amp; escrow progress</h3>
      <ol className="space-y-0">
        {steps.map((s, i) => (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0 w-7">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold shrink-0',
                  timelineDotClass(s.state),
                )}
              >
                {s.state === 'complete' ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('w-0.5 flex-1 min-h-[12px] my-0.5', timelineLineClass(s.state))} />
              )}
            </div>
            <div className={cn('pb-4', i === steps.length - 1 && 'pb-0')}>
              <div className="text-sm font-bold text-slate-900">{s.title}</div>
              <p className="text-xs text-slate-600 mt-0.5">{s.subtitle}</p>
              {s.actionHint && (
                <p className="text-[11px] font-semibold text-indigo-700 mt-1">{s.actionHint}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

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
    enabled: !!tenant?.id,
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

  const orders = listRes?.data || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Marketplace orders &amp; escrow</h1>
          <p className="page-subtitle">Fulfillment, buyer-protected payments, and escrow release for your listings</p>
        </div>
      </div>

      {!tenant?.isMarketplaceSeller && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold mb-1">Marketplace selling is not enabled for this business</p>
            <p className="text-amber-800">Turn on marketplace on products and ask your administrator to flag this tenant as a marketplace seller to receive orders here.</p>
          </div>
          <Link to="/products" className="shrink-0 text-amber-950 font-bold underline inline-flex items-center gap-1">
            Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

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
              <div className="flex justify-between items-start gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{o.orderNumber}</span>
                <span className="flex flex-wrap gap-1 justify-end">
                  {o.paymentStatus === 'SUCCESS' && o.escrowStatus && (
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getEscrowBadgeClass(o.escrowStatus))}>
                      Escrow {o.escrowStatus}
                    </span>
                  )}
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getStatusColor(o.status))}>{o.status}</span>
                </span>
              </div>
              {o.isMultiSeller && (
                <div className="text-[10px] font-semibold text-amber-800 mt-1">Multi-seller order — escrow via admin</div>
              )}
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
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getStatusColor(detail.paymentStatus))}>
                        Payment {detail.paymentStatus}
                      </span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', getEscrowBadgeClass(detail.escrowStatus))}>
                        Escrow {detail.escrowStatus}
                      </span>
                      {detail.isMultiSeller && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                          {detail.sellerTenantCount} sellers on order
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn('h-fit px-3 py-1 rounded-full text-xs font-bold', getStatusColor(detail.status))}>{detail.status}</span>
                </div>

                <div className="mb-4">
                  <SellerOrderTimeline detail={detail} />
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
                  <ReleaseEscrowButton detail={detail} releaseMutation={releaseMutation} />
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
