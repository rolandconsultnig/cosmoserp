import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, Package, History,
  CalendarCheck, Zap, Search, ChevronRight,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';
import { useState } from 'react';

/* Pro-POS style dashboard: products available for selection, stats strip, quick actions */

function ProductTile({ product, onClick }) {
  const stock = product.totalStock ?? product.stockQuantity ?? product.stock ?? null;
  const out = stock !== null && stock <= 0;

  return (
    <button
      type="button"
      onClick={() => !out && onClick(product)}
      disabled={out}
      className={cn(
        'rounded-xl border-2 border-slate-200 bg-white text-left transition-all overflow-hidden',
        'hover:border-emerald-400 hover:shadow-md active:scale-[0.98]',
        out && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className="h-14 bg-slate-100 flex items-center justify-center">
        <Package className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{formatCurrency(product.sellingPrice)}</p>
        {stock !== null && (
          <p className={cn('text-[10px] mt-0.5', out ? 'text-red-500' : 'text-slate-400')}>
            {out ? 'Out of stock' : `${stock} in stock`}
          </p>
        )}
      </div>
    </button>
  );
}

export default function POSDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['pos-stats'],
    queryFn: () => api.get('/pos/stats').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['pos-products-dashboard', search],
    queryFn: () =>
      api.get('/products', { params: { limit: 100, search: search || undefined, isActive: true } }).then((r) => r.data),
    staleTime: 60000,
  });

  const s = statsData || {};
  const today = s.today || {};
  const products = productsData?.data || [];

  const handleProductSelect = (product) => {
    navigate('/pos/terminal', { state: { addProductId: product.id } });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100">
      {/* Stats strip — compact, pro-POS style */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Sales</p>
              <p className="text-lg font-bold text-slate-900 tabular-nums">{statsLoading ? '—' : (today.sales ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Today&apos;s Revenue</p>
              <p className="text-lg font-bold text-emerald-700 tabular-nums">
                {statsLoading ? '—' : formatCurrency(today.revenue ?? 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => navigate('/pos/terminal')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-[0.98]"
        >
          <Zap className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* Main: product grid + right panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left — product catalog */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white rounded-tl-xl border-r border-t border-slate-200">
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <span className="text-xs text-slate-500 tabular-nums">{products.length} products</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {productsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-100 overflow-hidden animate-pulse">
                    <div className="h-14 bg-slate-100" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-4/5" />
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-500">No products found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {search ? `No results for "${search}"` : 'Add products in the Products module'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {products.map((p) => (
                  <ProductTile key={p.id} product={p} onClick={handleProductSelect} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — quick actions (pro-POS style) */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 p-4 bg-slate-100">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/pos/terminal')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> New Sale</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/pos/history')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              >
                <span className="flex items-center gap-2"><History className="w-4 h-4" /> Sales History</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/pos/end-of-day')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
              >
                <span className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> End of Day</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Payment Methods Today</h2>
            {(s.paymentMethods || []).length === 0 ? (
              <p className="text-xs text-slate-400">No sales yet today</p>
            ) : (
              <div className="space-y-2">
                {(s.paymentMethods || []).map((m) => (
                  <div key={m.method} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{m.method}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(m.total || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recent</h2>
            <button
              onClick={() => navigate('/pos/history')}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              View recent sales →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
