import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Banknote, CreditCard, Smartphone, TrendingUp,
  Receipt, Package, Users, Zap, Clock,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

const PAY_ICONS = { CASH: Banknote, CARD: CreditCard, TRANSFER: Smartphone, SPLIT: CreditCard };
const PAY_COLORS = { CASH: '#10B981', CARD: '#6366F1', TRANSFER: '#F59E0B', SPLIT: '#EC4899' };

function StatCard({ title, value, sub, icon: Icon, color, highlight }) {
  return (
    <div
      className={cn('rounded-xl border p-5 transition-all', highlight ? 'border-emerald-500/30' : '')}
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: highlight ? undefined : 'rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{title}</p>
          <p className={cn('text-2xl font-black mt-1', highlight ? 'text-emerald-400' : 'text-white')}>{value}</p>
          {sub && <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function POSDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['pos-stats'],
    queryFn: () => api.get('/pos/stats').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const s = data || {};
  const today = s.today || {};
  const month = s.month || {};

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 rounded-lg w-64" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Sales Dashboard</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Welcome back, {user?.firstName}. Here's your shift overview.
          </p>
        </div>
        <button
          onClick={() => navigate('/pos/terminal')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 16px rgba(16,185,129,0.30)' }}
        >
          <Zap className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={today.sales || 0}
          sub="Transactions completed"
          icon={ShoppingCart}
          color="#10B981"
          highlight
        />
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(today.revenue || 0)}
          sub="Gross sales amount"
          icon={TrendingUp}
          color="#34D399"
          highlight
        />
        <StatCard
          title="Monthly Sales"
          value={month.sales || 0}
          sub="This month total"
          icon={Receipt}
          color="#6366F1"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(month.revenue || 0)}
          sub="This month total"
          icon={Banknote}
          color="#8B5CF6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Payment methods breakdown */}
        <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white mb-4">Payment Methods Today</h2>
          {(s.paymentMethods || []).length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No sales yet today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(s.paymentMethods || []).map((m) => {
                const Icon = PAY_ICONS[m.method] || Banknote;
                const color = PAY_COLORS[m.method] || '#10B981';
                return (
                  <div key={m.method} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-white">{m.method}</span>
                        <span className="text-[12px] font-bold text-emerald-400 tabular-nums">{formatCurrency(m.total || 0)}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>{m.count} transaction{m.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products today */}
        <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white mb-4">Top Products Today</h2>
          {(s.topProducts || []).length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No products sold yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {(s.topProducts || []).slice(0, 7).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: i < 3 ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.08)' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{p.productName}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {Number(p.quantitySold).toFixed(0)} sold
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-emerald-400 tabular-nums flex-shrink-0">
                    {formatCurrency(p.revenue || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cashier performance */}
        <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white mb-4">Cashier Performance Today</h2>
          {(s.cashierStats || []).length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No cashier activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(s.cashierStats || []).map((c, i) => (
                <div key={c.cashierId} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: i === 0 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                  >
                    {(c.name || '??').split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white truncate">{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {c.sales} sale{c.sales !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-[12px] font-bold text-emerald-400 tabular-nums flex-shrink-0">
                    {formatCurrency(c.revenue || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="rounded-xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-bold text-white">Recent Sales</h2>
          <button onClick={() => navigate('/pos/history')} className="text-emerald-400 text-[12px] font-bold hover:underline">
            View all →
          </button>
        </div>
        {(s.recentSales || []).length === 0 ? (
          <div className="p-8 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>No sales recorded yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {(s.recentSales || []).map((sale) => (
              <div key={sale.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: sale.status === 'VOIDED' ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)' }}>
                  <Receipt className="w-4 h-4" style={{ color: sale.status === 'VOIDED' ? '#EF4444' : '#10B981' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white">{sale.receiptNumber}</span>
                    {sale.status === 'VOIDED' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">VOID</span>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                    {sale.cashier?.firstName} {sale.cashier?.lastName} · {sale.lines?.length || 0} item{(sale.lines?.length || 0) !== 1 ? 's' : ''} · {sale.paymentMethod}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-black text-emerald-400 tabular-nums">{formatCurrency(sale.totalAmount)}</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    <Clock className="w-3 h-3 inline mr-0.5" />
                    {new Date(sale.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
