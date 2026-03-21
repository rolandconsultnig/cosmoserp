import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Shield, ShoppingCart, Lock } from 'lucide-react';
import useCartStore from '../store/cartStore';
import { formatCurrency } from '../lib/utils';
import Seo from '../components/Seo';

export default function CartPage() {
  const { items, updateQty, removeItem, clear } = useCartStore();
  const navigate = useNavigate();

  const subtotal  = items.reduce((s, i) => s + parseFloat(i.sellingPrice) * i.quantity, 0);
  const vat       = subtotal * 0.075;
  const total     = subtotal + vat;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Seo title="Shopping cart" description="Your Cosmos Market cart is empty." canonicalPath="/cart" noindex />
        <div className="w-24 h-24 bg-brand-50 border-2 border-brand-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-12 h-12 text-brand-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-7 text-sm">Discover products from thousands of verified Nigerian businesses</p>
        <Link to="/products" className="btn-cart px-7 py-3 rounded-xl inline-flex items-center gap-2 font-bold text-sm shadow-sm">
          <ShoppingBag className="w-4 h-4" /> Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
      <Seo title="Shopping cart" description="Review items in your Cosmos Market cart before checkout." canonicalPath="/cart" noindex />
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
        Shopping Cart
        <span className="text-base font-normal text-gray-400">({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Cart items ── */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4 hover:border-brand-200 transition-colors">
              {/* Image */}
              <Link to={`/products/${item.id}`} className="w-24 h-24 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-10 h-10 text-gray-200" />
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-brand-600 font-semibold mb-0.5">
                  {item.seller?.tradingName || item.seller?.businessName}
                </div>
                <Link to={`/products/${item.id}`}
                  className="font-semibold text-gray-900 text-sm hover:text-brand-700 transition-colors line-clamp-2 leading-snug">
                  {item.name}
                </Link>
                <div className="text-sm font-bold price mt-1.5">
                  {formatCurrency(item.sellingPrice)}
                  {item.unit && item.unit !== 'piece' && (
                    <span className="text-xs text-gray-400 font-normal ml-1">/{item.unit}</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  {/* Qty controls */}
                  <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(parseFloat(item.sellingPrice) * item.quantity)}
                    </span>
                    <button onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Cart actions */}
          <div className="flex justify-between items-center pt-1">
            <Link to="/products" className="text-sm text-brand-600 hover:text-brand-800 font-medium hover:underline">
              ← Continue Shopping
            </Link>
            <button onClick={clear} className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline">
              Clear Cart
            </button>
          </div>
        </div>

        {/* ── Order summary ── */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Order Summary</h2>

            <div className="space-y-2.5 text-sm border-b border-gray-100 pb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT (7.5%)</span>
                <span className="font-semibold text-gray-900">{formatCurrency(vat)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div className="flex justify-between text-base font-extrabold text-gray-900">
              <span>Estimated Total</span>
              <span className="price text-lg">{formatCurrency(total)}</span>
            </div>

            <button onClick={() => navigate('/checkout')}
              className="w-full btn-buy py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Secured by Cosmos Escrow
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ background: '#EEF2FF' }} className="rounded-2xl border border-brand-100 p-4 space-y-2.5">
            {[
              { icon: Shield, text: 'Payments secured by Cosmos Escrow' },
              { icon: Shield, text: 'NRS tax receipt for every purchase' },
              { icon: Shield, text: 'All sellers are KYC-verified' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                <Icon className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" /> {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
