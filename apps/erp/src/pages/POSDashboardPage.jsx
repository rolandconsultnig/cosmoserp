import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, Package, History,
  CalendarCheck, Zap, Search, ChevronRight, Star, Info,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';
import { useState, useEffect, useCallback } from 'react';
import { MAX_QUICK_PICKS, readQuickPickIdsFromStorage, writeQuickPickIdsToStorage } from '../lib/posQuickPicks';

/* Pro-POS style dashboard: products available for selection, stats strip, quick actions */

function ProductTile({ product, onSelect, isQuickPick, onToggleQuickPick }) {
  const stock = product.totalStock ?? product.stockQuantity ?? product.stock ?? null;
  const out = stock !== null && stock <= 0;
  const lastOne = stock !== null && stock === 1;
  const low = stock !== null && stock > 1 && stock <= (product.reorderPoint || 10);

  return (
    <div
      role="button"
      tabIndex={out ? -1 : 0}
      onClick={() => !out && onSelect(product)}
      onKeyDown={(e) => {
        if (out) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      className={cn(
        'relative rounded-xl border-2 border-slate-200 bg-white text-left transition-all overflow-hidden',
        'hover:border-emerald-400 hover:shadow-md active:scale-[0.98]',
        out && 'opacity-50 cursor-not-allowed',
        !out && 'cursor-pointer',
      )}
    >
      <button
        type="button"
        title={isQuickPick ? 'Remove from quick picks' : 'Add to quick picks'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleQuickPick(product.id);
        }}
        className={cn(
          'absolute top-1.5 left-1.5 z-10 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm',
          isQuickPick
            ? 'bg-amber-400 text-amber-950 hover:bg-amber-300'
            : 'bg-white/95 text-slate-400 hover:text-amber-600 border border-slate-200',
        )}
      >
        <Star className={cn('w-3.5 h-3.5', isQuickPick && 'fill-current')} strokeWidth={2} />
      </button>
      <div className="h-14 bg-slate-100 flex items-center justify-center">
        <Package className="w-7 h-7 text-slate-400" strokeWidth={1.5} />
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-semibold text-slate-800 leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{formatCurrency(product.sellingPrice)}</p>
        {stock !== null && (
          <p
            className={cn(
              'text-[10px] mt-0.5 font-semibold',
              out ? 'text-red-500'
                : lastOne ? 'text-rose-600'
                  : low ? 'text-amber-700'
                    : 'text-slate-400',
            )}
          >
            {out ? 'Out of stock' : lastOne ? 'Last in stock' : low ? `Low: ${stock}` : `${stock} in stock`}
          </p>
        )}
      </div>
    </div>
  );
}

export default function POSDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [quickPickIds, setQuickPickIds] = useState([]);

  useEffect(() => {
    setQuickPickIds(readQuickPickIdsFromStorage());
  }, []);

  useEffect(() => {
    writeQuickPickIdsToStorage(quickPickIds);
  }, [quickPickIds]);

  const toggleQuickPick = useCallback((productId) => {
    setQuickPickIds((prev) => {
      const idx = prev.indexOf(productId);
      if (idx >= 0) return prev.filter((id) => id !== productId);
      if (prev.length >= MAX_QUICK_PICKS) return prev;
      return [...prev, productId];
    });
  }, []);

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
  const quickPickProducts = quickPickIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

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
          <Zap className="w-4 h-4" /> Open sale terminal
        </button>
      </div>

      {/* Where full POS features live */}
      <div className="flex-shrink-0 mx-4 mt-2 mb-1 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-[12px] text-amber-950">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quick picks, loyalty keypad, cart &amp; checkout</span>
          {' '}
          are on <strong>New Sale</strong> (left menu) → opens the <strong>sale terminal</strong>.
          This dashboard mirrors quick picks &amp; stock badges; tap a product or quick pick to jump there with the item.
        </div>
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

          {/* Quick picks — same storage as terminal */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-slate-100 bg-amber-50/50">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Quick picks</span>
              <span className="text-[10px] text-slate-500">★ on tiles · opens terminal with item</span>
            </div>
            {quickPickProducts.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-0.5">Star products below — they appear here for one tap.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickPickProducts.map((p) => {
                  const st = p.totalStock ?? p.stockQuantity ?? p.stock ?? null;
                  const out = st !== null && st <= 0;
                  const lastOne = st === 1;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => !out && handleProductSelect(p)}
                      className={cn(
                        'flex-shrink-0 min-w-[96px] max-w-[130px] px-2 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-all',
                        out
                          ? 'opacity-40 border-slate-200'
                          : 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-sm',
                      )}
                    >
                      <span className="line-clamp-2 text-slate-800">{p.name}</span>
                      {lastOne && <span className="block text-[9px] text-rose-600 font-bold mt-0.5">Last</span>}
                    </button>
                  );
                })}
              </div>
            )}
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
                  <ProductTile
                    key={p.id}
                    product={p}
                    onSelect={handleProductSelect}
                    isQuickPick={quickPickIds.includes(p.id)}
                    onToggleQuickPick={toggleQuickPick}
                  />
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
