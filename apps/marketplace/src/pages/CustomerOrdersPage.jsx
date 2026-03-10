import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Loader2, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['customer-orders', page],
    queryFn: () => api.get('/marketplace/customer/orders', { params: { page, limit: 10 } }).then((r) => r.data),
  });

  const orders = data?.data || [];
  const meta = data?.meta || {};
  const totalPages = meta.totalPages || 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
          {orders.map((order) => (
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
    </div>
  );
}
