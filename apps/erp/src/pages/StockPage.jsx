import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Search, Warehouse, AlertTriangle, TrendingUp, Loader2, ArrowRight,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | low | out

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'inventory-valuation'],
    queryFn: () => api.get('/reports/inventory-valuation').then((r) => r.data.data),
  });

  const products = data?.products || [];
  const totals = data?.totals || {};

  const rows = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && String(p.sku).toLowerCase().includes(q))
      );
    }
    if (filter === 'low') list = list.filter((p) => p.lowStock && !p.outOfStock);
    if (filter === 'out') list = list.filter((p) => p.outOfStock);
    return list;
  }, [products, search, filter]);

  const lowCount = products.filter((p) => p.lowStock && !p.outOfStock).length;
  const outCount = products.filter((p) => p.outOfStock).length;

  if (error?.response?.status === 403) {
    return (
      <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        <h1 className="text-lg font-bold">Stock & valuation</h1>
        <p className="text-sm mt-2">
          Your role does not include inventory valuation. Ask an Owner, Admin, Accountant, or Warehouse user to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-600" />
            Stock & valuation
          </h1>
          <p className="page-subtitle">
            Unified view across warehouses — quantities, cost and retail value, reorder alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            Products <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/warehouses"
            className="inline-flex items-center gap-1 text-sm font-semibold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800"
          >
            Warehouses <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Cost value (on hand)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.costValue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Retail value (on hand)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.sellingValue || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Landed value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totals.landedValue || 0)}</p>
        </div>
      </div>

      {lowCount > 0 || outCount > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {outCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200">
              <AlertTriangle className="w-4 h-4" /> {outCount} out of stock
            </span>
          )}
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
              <TrendingUp className="w-4 h-4" /> {lowCount} at or below reorder point
            </span>
          )}
        </div>
      ) : null}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product name…"
            className="input pl-9 w-full"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'low', 'out'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
                filter === k
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              )}
            >
              {k === 'all' ? 'All' : k === 'low' ? 'Low stock' : 'Out of stock'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading inventory…
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600 uppercase">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Reorder</th>
                  <th className="px-4 py-3 text-right">Cost value</th>
                  <th className="px-4 py-3 text-right">Retail value</th>
                  <th className="px-4 py-3">Warehouses</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className={cn(
                      'border-b border-slate-100',
                      p.outOfStock && 'bg-red-50/50',
                      p.lowStock && !p.outOfStock && 'bg-amber-50/40'
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{p.totalQuantity ?? p.totalQty}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums">{p.reorderPoint}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.costValue)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(p.retailValue ?? p.sellingValue)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {(p.warehouses || []).map((sl) => (
                        <span key={sl.id || `${sl.warehouseId}-${sl.productId}`} className="inline-flex items-center gap-0.5 mr-2">
                          <Warehouse className="w-3 h-3 inline" />
                          {sl.warehouse?.name || '—'}: {sl.quantity ?? 0}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-slate-500 text-sm">No rows match your filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
