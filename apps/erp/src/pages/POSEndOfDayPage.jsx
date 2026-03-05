import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheck, Banknote, CreditCard, Smartphone, Receipt,
  TrendingUp, Clock, Ban, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';

const PAY_ICONS = { CASH: Banknote, CARD: CreditCard, TRANSFER: Smartphone, SPLIT: CreditCard };
const PAY_COLORS = { CASH: '#10B981', CARD: '#6366F1', TRANSFER: '#F59E0B', SPLIT: '#EC4899' };

export default function POSEndOfDayPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['pos-eod', date],
    queryFn: () => api.get('/pos/end-of-day', { params: { date } }).then((r) => r.data.data),
  });

  const d = data || {};
  const completed = d.completed || {};
  const voided = d.voided || {};
  const payments = d.paymentBreakdown || [];
  const hourly = d.hourlyBreakdown || [];

  const changeDate = (delta) => {
    const dt = new Date(date);
    dt.setDate(dt.getDate() + delta);
    setDate(dt.toISOString().split('T')[0]);
  };

  const isToday = date === new Date().toISOString().split('T')[0];

  const maxHourlyRevenue = Math.max(...hourly.map((h) => Number(h.revenue) || 0), 1);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            End of Day Report
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Daily sales summary and reconciliation
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-[13px] font-bold rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'white' }}
          />
          <button
            onClick={() => changeDate(1)}
            disabled={isToday}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
              style={{ background: 'rgba(16,185,129,0.10)', color: '#34D399', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border p-5" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Total Revenue</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">{formatCurrency(completed.total || 0)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {completed.count || 0} completed sale{(completed.count || 0) !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>VAT Collected</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">{formatCurrency(completed.vat || 0)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>7.5% output VAT</p>
            </div>

            <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Discounts Given</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">{formatCurrency(completed.discounts || 0)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>Total discount value</p>
            </div>

            <div className="rounded-xl border p-5"
              style={{ background: (voided.count || 0) > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.03)', borderColor: (voided.count || 0) > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>Voided</p>
              <p className={cn('text-2xl font-black mt-1 tabular-nums', (voided.count || 0) > 0 ? 'text-red-400' : 'text-white')}>
                {voided.count || 0}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                {formatCurrency(voided.total || 0)} voided
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payment breakdown */}
            <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Payment Breakdown
              </h2>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Banknote className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.12)' }} />
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>No transactions for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => {
                    const Icon = PAY_ICONS[p.method] || Banknote;
                    const color = PAY_COLORS[p.method] || '#10B981';
                    const pct = completed.total ? ((Number(p.total) / Number(completed.total)) * 100).toFixed(0) : 0;
                    return (
                      <div key={p.method}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                              <Icon className="w-3.5 h-3.5" style={{ color }} />
                            </div>
                            <div>
                              <span className="text-[12px] font-bold text-white">{p.method}</span>
                              <span className="text-[10px] ml-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                                {p.count} txn{p.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <span className="text-[13px] font-black tabular-nums" style={{ color }}>{formatCurrency(p.total || 0)}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Total line */}
                  <div className="pt-3 mt-3 border-t flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <span className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.50)' }}>Total</span>
                    <span className="text-[14px] font-black text-emerald-400 tabular-nums">{formatCurrency(completed.total || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Hourly breakdown */}
            <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Hourly Breakdown
              </h2>
              {hourly.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.12)' }} />
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.25)' }}>No hourly data available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {hourly.map((h) => {
                    const hr = Number(h.hour);
                    const label = hr === 0 ? '12 AM' : hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr - 12} PM`;
                    const pct = (Number(h.revenue) / maxHourlyRevenue) * 100;
                    return (
                      <div key={hr} className="flex items-center gap-3">
                        <span className="text-[11px] font-mono w-12 text-right flex-shrink-0" style={{ color: 'rgba(255,255,255,0.40)' }}>
                          {label}
                        </span>
                        <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <div
                            className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                            style={{ width: `${Math.max(pct, 3)}%`, background: 'linear-gradient(90deg, #059669, #10B981)' }}
                          >
                            {pct > 25 && (
                              <span className="text-[9px] font-bold text-white whitespace-nowrap">
                                {formatCurrency(h.revenue)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] w-8 text-right flex-shrink-0" style={{ color: 'rgba(255,255,255,0.30)' }}>
                          {h.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Reconciliation footer */}
          <div className="rounded-xl border p-5" style={{ background: 'rgba(16,185,129,0.03)', borderColor: 'rgba(16,185,129,0.12)' }}>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Day Summary
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Gross Sales</p>
                <p className="text-[16px] font-black text-white mt-1 tabular-nums">{formatCurrency(Number(completed.total || 0) + Number(completed.discounts || 0))}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Discounts</p>
                <p className="text-[16px] font-black mt-1 tabular-nums" style={{ color: '#818CF8' }}>-{formatCurrency(completed.discounts || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>VAT</p>
                <p className="text-[16px] font-black text-white mt-1 tabular-nums">{formatCurrency(completed.vat || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.30)' }}>Voided</p>
                <p className="text-[16px] font-black mt-1 tabular-nums" style={{ color: (voided.count || 0) > 0 ? '#F87171' : 'white' }}>
                  -{formatCurrency(voided.total || 0)}
                </p>
              </div>
              <div className="rounded-xl p-2" style={{ background: 'rgba(16,185,129,0.10)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Net Revenue</p>
                <p className="text-[18px] font-black text-emerald-400 mt-1 tabular-nums">{formatCurrency(completed.total || 0)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
