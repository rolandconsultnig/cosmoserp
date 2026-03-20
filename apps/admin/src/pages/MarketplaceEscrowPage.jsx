import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Loader2, Banknote, Unlock, Package } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export default function MarketplaceEscrowPage() {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [activeId, setActiveId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-escrow'],
    queryFn: () => api.get('/admin/marketplace/escrow-orders', { params: { limit: 50 } }).then((r) => r.data),
  });

  const releaseMut = useMutation({
    mutationFn: ({ id, n }) => api.post(`/admin/marketplace/orders/${id}/release-escrow`, { note: n }),
    onSuccess: () => qc.invalidateQueries(['admin-marketplace-escrow']),
  });

  const payoutMut = useMutation({
    mutationFn: (id) => api.post(`/admin/marketplace/orders/${id}/payout-paystack`),
    onSuccess: () => qc.invalidateQueries(['admin-marketplace-escrow']),
  });

  const rows = data?.data || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-indigo-600" /> Marketplace escrow
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Delivered, paid orders with escrow still <strong>HELD</strong>. Release after dispute checks; Paystack transfers use each seller tenant&apos;s bank on file.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500 py-12">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
          No orders in this queue.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((o) => (
          <div
            key={o.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
          >
            <div className="flex flex-wrap justify-between gap-3 mb-3">
              <div>
                <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
                <div className="text-xs text-slate-500">{o.buyerEmail}</div>
                <div className="text-xs text-slate-400 mt-1">Delivered {o.deliveredAt ? formatDate(o.deliveredAt) : '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-800">{formatCurrency(o.totalAmount)}</div>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    o.isMultiSeller ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {o.sellerTenantCount} seller{o.sellerTenantCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 mb-3 space-y-1">
              {Object.entries(o.sellerTotals || {}).map(([tid, amt]) => (
                <div key={tid} className="flex justify-between border-b border-slate-50 py-1">
                  <span className="font-mono text-[10px] text-slate-400">{tid.slice(0, 8)}…</span>
                  <span className="font-semibold">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>

            {(o.sellerPayouts || []).length > 0 && (
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Paystack payouts</div>
                {(o.sellerPayouts || []).map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-[11px]">
                    <span className="font-mono text-slate-500">{p.tenantId.slice(0, 8)}…</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full font-bold',
                        p.status === 'SUCCESS' && 'bg-emerald-100 text-emerald-800',
                        p.status === 'FAILED' && 'bg-red-100 text-red-800',
                        p.status === 'REVERSED' && 'bg-amber-100 text-amber-900',
                        ['PENDING', 'SUBMITTED'].includes(p.status) && 'bg-blue-100 text-blue-800',
                      )}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeId === o.id && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional release note (audit)"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
              />
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveId(activeId === o.id ? null : o.id);
                  if (activeId !== o.id) setNote('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                {activeId === o.id ? 'Cancel note' : 'Add note'}
              </button>
              <button
                type="button"
                disabled={releaseMut.isPending}
                onClick={() => releaseMut.mutate({ id: o.id, n: note })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {releaseMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                Release escrow
              </button>
              <button
                type="button"
                disabled={payoutMut.isPending}
                onClick={() => payoutMut.mutate(o.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {payoutMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                Paystack payout (per seller)
              </button>
            </div>

            {(releaseMut.isError || payoutMut.isError) && (
              <p className="text-xs text-red-600 mt-2">
                {releaseMut.error?.response?.data?.error || payoutMut.error?.response?.data?.error}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-400 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Configure <code className="bg-slate-100 px-1 rounded">PAYSTACK_SECRET_KEY</code> and seller tenant bank details (account + sort/bank code).
      </div>
    </div>
  );
}
