import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Loader2, ChevronRight, Search } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'DISPUTED', label: 'Disputed' },
];

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders', page, status],
    queryFn: () => api.get('/marketplace/customer/orders', { params: { page, limit: 10, status: status || undefined } }).then((r) => r.data),
  });

  const orders = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = meta.totalPages || 1;

  const filteredOrders = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((o) => String(o.orderNumber || '').toLowerCase().includes(query));
  }, [orders, q]);

  return (
    <CustomerAccountLayout active="orders">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">My Orders</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-8 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">You haven’t placed any orders yet.</p>
          <Link to="/products" className="btn-buy inline-block py-2.5 px-5 rounded-xl font-semibold text-sm">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Status</label>
                <select
                  className="select mt-1"
                  value={status}
                  onChange={(e) => { setPage(1); setStatus(e.target.value); }}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value || 'all'} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Search</label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className="input pl-10"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Order number (e.g. MKT-000123)"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Search only affects this page of results.</p>
              </div>
            </div>
          </div>

          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              to={`/account/orders/${order.id}`}
              className="card p-4 block hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900">{order.orderNumber}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
          {filteredOrders.length === 0 && (
            <div className="card p-6 text-center text-sm text-gray-600">
              No orders match your search on this page.
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </CustomerAccountLayout>
  );
}
