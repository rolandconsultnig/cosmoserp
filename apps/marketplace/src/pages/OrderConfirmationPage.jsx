import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, Shield, Home, Loader2, MapPin, Receipt } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get(`/marketplace/orders/${orderId}`).then((r) => r.data.data),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
        <p className="text-sm text-gray-400 mt-3">Loading your order…</p>
      </div>
    );
  }

  const order = data;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-green-50 border-4 border-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 text-sm">Thank you for shopping on Cosmos Market. Your order has been placed successfully.</p>
      </div>

      {/* Order details card */}
      {order && (
        <div className="card p-5 mb-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
            <div>
              <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">Order Number</div>
              <div className="font-extrabold text-gray-900 text-lg">{order.orderNumber}</div>
            </div>
            <span className="badge-green text-xs px-3 py-1">{order.status}</span>
          </div>

          {/* Items */}
          <div className="space-y-3 mb-5">
            {(order.lines || order.items || []).map((line) => (
              <div key={line.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0 mr-4">
                  <span className="font-medium text-gray-900">{line.productName || line.product?.name}</span>
                  <span className="text-gray-400 ml-2 text-xs">×{line.quantity}</span>
                </div>
                <span className="font-bold text-gray-900 flex-shrink-0">{formatCurrency(line.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT (7.5%)</span>
              <span>{formatCurrency(order.vatAmount)}</span>
            </div>
            {(parseFloat(order.shippingCost || order.shippingAmount) || 0) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shippingCost || order.shippingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-gray-900 border-t border-gray-100 pt-2">
              <span>Total Paid</span>
              <span className="price text-base">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5 text-brand-500" /> Delivery To
              </div>
              <div className="text-sm text-gray-900 font-semibold">{order.buyerName}</div>
              <div className="text-sm text-gray-500">
                {typeof order.deliveryAddress === 'string'
                  ? order.deliveryAddress
                  : order.deliveryAddress?.address || [order.deliveryAddress?.city, order.deliveryAddress?.state].filter(Boolean).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NRS Tax Receipt notice */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
        <Receipt className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-brand-900 text-sm">NRS Tax Receipt Issued</div>
          <div className="text-brand-700 text-xs mt-0.5 leading-relaxed">
            An NRS-compliant electronic receipt with Invoice Reference Number (IRN) has been sent to your email address.
          </div>
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex gap-3">
        <Link to="/" className="flex-1 btn-outline py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
          <Home className="w-4 h-4" /> Back to Home
        </Link>
        <Link to="/products" className="flex-1 btn-buy py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
          <Package className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>
    </div>
  );
}
