import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, MapPin, Loader2, Copy, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['customer-order', id],
    queryFn: () => api.get(`/marketplace/customer/orders/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <CustomerAccountLayout active="orders">
        <div className="py-12 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading order…
        </div>
      </CustomerAccountLayout>
    );
  }

  const order = data;
  if (!order) {
    return (
      <CustomerAccountLayout active="orders">
        <div className="py-12 text-center">
          <p className="text-gray-500 mb-4">Order not found.</p>
          <Link to="/account/orders" className="btn-buy py-2.5 px-5 rounded-xl font-semibold text-sm">Back to orders</Link>
        </div>
      </CustomerAccountLayout>
    );
  }

  const deliveryAddress = order.deliveryAddress && (typeof order.deliveryAddress === 'string'
    ? order.deliveryAddress
    : order.deliveryAddress?.address || [order.deliveryAddress?.city, order.deliveryAddress?.state].filter(Boolean).join(', '));

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <CustomerAccountLayout active="orders">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <Link to="/account/orders" className="text-gray-500 hover:text-gray-700 text-sm">Orders</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">{order.orderNumber}</span>
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <div>
            <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Order Number</div>
            <div className="flex items-center gap-2">
              <div className="font-extrabold text-gray-900 text-lg">{order.orderNumber}</div>
              <button
                type="button"
                onClick={() => copy(order.orderNumber)}
                className="btn-ghost inline-flex items-center gap-1"
                title="Copy order number"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
            {order.trackingNumber && (
              <div className="text-xs text-gray-500 mt-1">
                Tracking: <span className="font-semibold text-gray-700">{order.trackingNumber}</span>
              </div>
            )}
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${
            order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
            order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {order.status}
          </span>
        </div>

        <div className="space-y-3 mb-5">
          {(order.lines || []).map((line) => (
            <div key={line.id} className="flex items-center justify-between text-sm">
              <div className="flex-1 min-w-0 mr-4">
                <span className="font-medium text-gray-900">{line.productName}</span>
                <span className="text-gray-400 ml-2 text-xs">×{line.quantity}</span>
              </div>
              <span className="font-bold text-gray-900 flex-shrink-0">{formatCurrency(line.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT (7.5%)</span>
            <span>{formatCurrency(order.vatAmount)}</span>
          </div>
          {parseFloat(order.shippingCost) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>{formatCurrency(order.shippingCost)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-gray-900 border-t border-gray-100 pt-2">
            <span>Total</span>
            <span className="text-base">{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        {deliveryAddress && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <MapPin className="w-3.5 h-3.5 text-brand-500" /> Delivery
            </div>
            <div className="text-sm text-gray-900 font-semibold">{order.buyerName}</div>
            <div className="text-sm text-gray-500">{deliveryAddress}</div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          <Link to="/account/support" className="btn-outline inline-flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <Package className="w-4 h-4" /> Get help
          </Link>
          <Link to="/products" className="btn-outline inline-flex items-center gap-2 py-2 px-4 rounded-xl text-sm font-semibold">
            <ExternalLink className="w-4 h-4" /> Continue shopping
          </Link>
        </div>
      </div>

      <Link to="/account/orders" className="btn-outline py-2.5 px-5 rounded-xl font-semibold text-sm inline-block">
        ← Back to orders
      </Link>
    </CustomerAccountLayout>
  );
}
