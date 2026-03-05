import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Receipt, Banknote, CreditCard, Smartphone, X,
  ChevronLeft, ChevronRight, Eye, Ban, Printer, Clock,
  Package, User, Filter, Calendar,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

const PAY_ICONS = { CASH: Banknote, CARD: CreditCard, TRANSFER: Smartphone, SPLIT: CreditCard };
const STATUS_STYLE = {
  COMPLETED: { bg: 'rgba(16,185,129,0.12)', color: '#34D399', border: 'rgba(16,185,129,0.25)' },
  VOIDED: { bg: 'rgba(239,68,68,0.12)', color: '#F87171', border: 'rgba(239,68,68,0.25)' },
  REFUNDED: { bg: 'rgba(251,191,36,0.12)', color: '#FCD34D', border: 'rgba(251,191,36,0.25)' },
};

export default function POSSalesHistoryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showVoidModal, setShowVoidModal] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sales', page, search, statusFilter, methodFilter, dateFrom, dateTo],
    queryFn: () => api.get('/pos/sales', {
      params: {
        page, limit,
        search: search || undefined,
        status: statusFilter || undefined,
        paymentMethod: methodFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      },
    }).then((r) => r.data),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/pos/sales/${id}/void`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-sales'] });
      qc.invalidateQueries({ queryKey: ['pos-stats'] });
      setShowVoidModal(null);
      setVoidReason('');
      setSelectedSale(null);
    },
  });

  const sales = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main list */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.30)' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search receipt # or customer…"
              className="w-full pl-9 pr-4 py-2 text-[12px] rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.80)' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-[12px] rounded-xl focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-[12px] rounded-xl focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
          >
            <option value="">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="TRANSFER">Transfer</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-[12px] rounded-xl focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
          />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-[12px] rounded-xl focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}
          />

          <div className="flex-1" />
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.30)' }}>
            {total} sale{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <Receipt className="w-12 h-12 mb-3" style={{ color: 'rgba(255,255,255,0.12)' }} />
              <p className="text-[14px] font-semibold" style={{ color: 'rgba(255,255,255,0.40)' }}>No sales found</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {search ? `No results for "${search}"` : 'Sales will appear here after processing'}
              </p>
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <th className="text-left px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Receipt</th>
                  <th className="text-left px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Customer</th>
                  <th className="text-left px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Cashier</th>
                  <th className="text-left px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Payment</th>
                  <th className="text-left px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Status</th>
                  <th className="text-right px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Amount</th>
                  <th className="text-right px-5 py-3 font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => {
                  const sty = STATUS_STYLE[sale.status] || STATUS_STYLE.COMPLETED;
                  const PayIcon = PAY_ICONS[sale.paymentMethod] || Banknote;
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-3">
                        <span className="font-mono font-bold text-white">{sale.receiptNumber}</span>
                      </td>
                      <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {sale.customerName || sale.customer?.name || 'Walk-in'}
                      </td>
                      <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {sale.cashier?.firstName} {sale.cashier?.lastName}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          <PayIcon className="w-3.5 h-3.5" /> {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: sty.bg, color: sty.color, border: `1px solid ${sty.border}` }}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn('font-bold tabular-nums', sale.status === 'VOIDED' ? 'text-red-400 line-through' : 'text-emerald-400')}>
                          {formatCurrency(sale.totalAmount)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <div>{formatDate(sale.createdAt)}</div>
                        <div className="text-[10px]">{formatTime(sale.createdAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-30 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)' }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-30 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)' }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale detail panel */}
      {selectedSale && (
        <div
          className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden border-l"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div>
              <p className="text-[14px] font-black text-white">{selectedSale.receiptNumber}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {formatDate(selectedSale.createdAt)} at {formatTime(selectedSale.createdAt)}
              </p>
            </div>
            <button onClick={() => setSelectedSale(null)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              {(() => {
                const sty = STATUS_STYLE[selectedSale.status] || STATUS_STYLE.COMPLETED;
                return (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: sty.bg, color: sty.color, border: `1px solid ${sty.border}` }}>
                    {selectedSale.status}
                  </span>
                );
              })()}
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                via {selectedSale.paymentMethod}
              </span>
            </div>

            {/* Customer & Cashier */}
            <div className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span className="text-[12px] text-white font-medium">
                  {selectedSale.customerName || selectedSale.customer?.name || 'Walk-in Customer'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.30)' }} />
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Cashier: {selectedSale.cashier?.firstName} {selectedSale.cashier?.lastName}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
                Items ({selectedSale.lines?.length || 0})
              </p>
              <div className="space-y-2">
                {(selectedSale.lines || []).map((line, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg p-2.5"
                    style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{line.productName}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        {Number(line.quantity)}× {formatCurrency(line.unitPrice)}
                        {line.sku && <span className="ml-1 font-mono">({line.sku})</span>}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold text-emerald-400 tabular-nums flex-shrink-0">
                      {formatCurrency(line.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl p-3 space-y-1.5 text-[12px]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {Number(selectedSale.discountAmount) > 0 && (
                <div className="flex justify-between" style={{ color: '#818CF8' }}>
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(selectedSale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span>VAT (7.5%)</span>
                <span className="tabular-nums">{formatCurrency(selectedSale.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-[15px] pt-2 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#34D399' }}>
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(selectedSale.totalAmount)}</span>
              </div>
              {selectedSale.paymentMethod === 'CASH' && Number(selectedSale.amountTendered) > 0 && (
                <>
                  <div className="flex justify-between text-[11px] pt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span>Tendered</span>
                    <span className="tabular-nums">{formatCurrency(selectedSale.amountTendered)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]" style={{ color: '#34D399' }}>
                    <span>Change</span>
                    <span className="tabular-nums">{formatCurrency(selectedSale.changeDue)}</span>
                  </div>
                </>
              )}
            </div>

            {selectedSale.notes && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Notes</p>
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{selectedSale.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t px-5 py-3 flex gap-2 flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Printer className="w-3.5 h-3.5" /> Reprint
            </button>
            {selectedSale.status === 'COMPLETED' && (
              <button
                onClick={() => setShowVoidModal(selectedSale)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#F87171', border: '1px solid rgba(239,68,68,0.20)' }}
              >
                <Ban className="w-3.5 h-3.5" /> Void Sale
              </button>
            )}
          </div>
        </div>
      )}

      {/* Void confirmation modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.10)' }}>
            <div className="px-6 py-5">
              <h3 className="text-[16px] font-black text-white mb-1">Void Sale?</h3>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                This will void receipt <strong className="text-white">{showVoidModal.receiptNumber}</strong> for {formatCurrency(showVoidModal.totalAmount)}. This action cannot be undone.
              </p>
              <div className="mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Reason
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this sale being voided?"
                  className="w-full px-3 py-2 text-[12px] rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.80)' }}
                />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => { setShowVoidModal(null); setVoidReason(''); }}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => voidMutation.mutate({ id: showVoidModal.id, reason: voidReason })}
                disabled={voidMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                {voidMutation.isPending ? 'Voiding…' : 'Void Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
