import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Shield, Loader2, CreditCard, ShoppingBag, Lock, MapPin, User, Phone, Mail, FileText } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/cartStore';
import useShopperAuthStore from '../store/shopperAuthStore';

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
];

function Field({ icon: Icon, label, required, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-brand-500" />}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clear } = useCartStore();
  const shopper = useShopperAuthStore((s) => s.shopper);
  const [form, setForm] = useState({
    buyerName: shopper?.fullName || '',
    buyerEmail: shopper?.email || '',
    buyerPhone: shopper?.phone || '',
    buyerAddress: '',
    buyerCity: '', buyerState: 'Lagos', deliveryInstructions: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const subtotal  = items.reduce((s, i) => s + parseFloat(i.sellingPrice) * i.quantity, 0);
  const vat       = subtotal * 0.075;
  const total     = subtotal + vat;

  const orderMutation = useMutation({
    mutationFn: async (payload) => {
      const { data: order } = await api.post('/marketplace/orders', payload);
      const orderId = order.data.id;
      const { data: payment } = await api.post(`/marketplace/orders/${orderId}/pay`);
      return { order: order.data, payment: payment.data };
    },
    onSuccess: ({ order, payment }) => {
      clear();
      if (payment?.authorizationUrl) {
        window.location.href = payment.authorizationUrl;
      } else {
        navigate(`/order/confirmation/${order.id}`);
      }
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to place order. Please try again.'),
  });

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-14 h-14 text-gray-200 mx-auto mb-5" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Nothing to checkout</h2>
        <Link to="/products" className="text-brand-600 font-medium hover:underline text-sm">Browse products →</Link>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.buyerName || !form.buyerEmail || !form.buyerPhone || !form.buyerAddress) {
      return setError('Please fill in all required fields.');
    }
    orderMutation.mutate({
      ...form,
      items: items.map((i) => ({ listingId: i.id, quantity: i.quantity })),
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <Link to="/cart" className="text-brand-600 hover:text-brand-800 text-sm font-medium">← Cart</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-extrabold text-gray-900">Checkout</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Delivery info */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" /> Delivery Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field icon={User} label="Full Name" required>
                    <input required value={form.buyerName} onChange={set('buyerName')} className="input" placeholder="e.g. Chukwuemeka Obi" />
                  </Field>
                </div>
                <Field icon={Mail} label="Email Address" required>
                  <input type="email" required value={form.buyerEmail} onChange={set('buyerEmail')} className="input" placeholder="you@example.com" />
                </Field>
                <Field icon={Phone} label="Phone Number" required>
                  <input required value={form.buyerPhone} onChange={set('buyerPhone')} className="input" placeholder="08012345678" />
                </Field>
                <div className="sm:col-span-2">
                  <Field icon={MapPin} label="Delivery Address" required>
                    <input required value={form.buyerAddress} onChange={set('buyerAddress')} className="input" placeholder="Street, house number, area" />
                  </Field>
                </div>
                <Field label="City">
                  <input value={form.buyerCity} onChange={set('buyerCity')} className="input" placeholder="e.g. Lagos" />
                </Field>
                <Field label="State">
                  <select value={form.buyerState} onChange={set('buyerState')} className="select">
                    {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field icon={FileText} label="Delivery Instructions">
                    <textarea rows={2} value={form.deliveryInstructions} onChange={set('deliveryInstructions')}
                      className="input resize-none"
                      placeholder="Landmark, gate color, preferred delivery time…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-600" /> Payment Method
              </h2>
              <div style={{ borderColor: '#4338CA' }} className="border-2 rounded-2xl p-4 flex items-center gap-4 bg-brand-50">
                <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 text-sm">Cosmos Secure Payment</div>
                  <div className="text-xs text-gray-500 mt-0.5">Card, bank transfer, USSD. Funds held in escrow until delivery confirmed.</div>
                </div>
                <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Order summary ── */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Items list */}
              <div className="space-y-3 max-h-56 overflow-y-auto mb-4 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 line-clamp-1">{item.name}</div>
                      <div className="text-xs text-gray-500">×{item.quantity} @ {formatCurrency(item.sellingPrice)}</div>
                    </div>
                    <div className="text-xs font-bold text-gray-900 flex-shrink-0">
                      {formatCurrency(parseFloat(item.sellingPrice) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (7.5%)</span><span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Shipping</span><span>Calculated next</span>
                </div>
                <div className="flex justify-between font-extrabold text-gray-900 border-t border-gray-100 pt-2 text-base">
                  <span>Total</span>
                  <span className="price">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Pay button */}
              <button type="submit" disabled={orderMutation.isPending}
                className="w-full mt-5 btn-buy py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-60">
                {orderMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><Lock className="w-4 h-4" /> Pay {formatCurrency(total)} Securely</>
                }
              </button>

              <div className="text-center text-[11px] text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secured by Cosmos Escrow · NRS receipt will be issued
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
