import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Star, Shield, Truck, ArrowLeft, Plus, Minus, ShoppingBag, Loader2, ChevronRight, CheckCircle, Package } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useCartStore from '../store/cartStore';
import useShopperAuthStore from '../store/shopperAuthStore';

function StarPicker({ value, onChange, size = 'w-6 h-6' }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}>
          <Star className={cn(size, 'transition-colors', s <= value ? 'star-fill' : 'star-empty fill-gray-200')} />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty,    setQty]    = useState(1);
  const [tab,    setTab]    = useState('description');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useShopperAuthStore((s) => s.isAuthenticated);
  const shopper = useShopperAuthStore((s) => s.shopper);

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/marketplace/listings/${id}`).then((r) => r.data.data),
  });

  const reviewMutation = useMutation({
    mutationFn: (d) => api.post(`/marketplace/listings/${id}/reviews`, d),
    onSuccess: () => { setReviewForm({ rating: 5, comment: '' }); setReviewError(''); },
    onError:   (e) => setReviewError(e.response?.data?.error || 'Failed to submit review'),
  });

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/products/${id}`)}`);
      return;
    }
    addItem(data, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-8">
          <div className="aspect-square skeleton rounded-2xl" />
          <div className="space-y-4">
            <div className="h-6 skeleton w-1/2" />
            <div className="h-8 skeleton w-3/4" />
            <div className="h-4 skeleton w-1/4" />
            <div className="h-10 skeleton w-1/3" />
            <div className="h-4 skeleton w-full" />
            <div className="h-4 skeleton w-2/3" />
          </div>
          <div className="card p-5 space-y-4">
            <div className="h-10 skeleton" />
            <div className="h-12 skeleton rounded-xl" />
            <div className="h-12 skeleton rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const product = data;
  if (!product) return (
    <div className="text-center py-24 text-gray-400">
      <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-200" />
      <p className="text-xl font-semibold text-gray-500">Product not found</p>
      <Link to="/products" className="mt-4 inline-block text-brand-600 hover:underline text-sm">← Back to Products</Link>
    </div>
  );

  const totalStock = (product.stockLevels || []).reduce((s, sl) => s + sl.quantity, 0);
  const inStock    = totalStock > 0;
  const reviews    = product.reviews || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
        <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-brand-600 transition-colors">Products</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-800 font-medium truncate max-w-[240px]">{product.name}</span>
      </nav>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-6 mb-8">
        {/* ── Col 1: Product image ── */}
        <div>
          <div className="aspect-square bg-white rounded-2xl border border-gray-200 shadow-card flex items-center justify-center overflow-hidden sticky top-24">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag className="w-28 h-28 text-gray-200" />
            )}
          </div>
        </div>

        {/* ── Col 2: Product info ── */}
        <div className="space-y-4">
          {/* Seller */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.seller?.id ? (
              <Link to={`/store/${product.seller.id}`} className="text-brand-600 font-semibold text-sm hover:underline">
                {product.seller?.tradingName || product.seller?.businessName}
              </Link>
            ) : (
              <span className="text-brand-600 font-semibold text-sm">
                {product.seller?.tradingName || product.seller?.businessName}
              </span>
            )}
            <span className="badge-green flex items-center gap-1">
              <Shield className="w-3 h-3" /> KYC Verified
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
          {product.sku && <div className="text-xs text-gray-400">SKU: {product.sku}</div>}

          {/* Rating */}
          {product.avgRating > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={cn('w-4 h-4', s <= Math.round(product.avgRating) ? 'star-fill' : 'star-empty')} />
                ))}
              </div>
              <span className="text-sm font-semibold text-brand-600">
                {parseFloat(product.avgRating).toFixed(1)}
              </span>
              <span className="text-sm text-gray-400">({reviews.length} ratings)</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold price">{formatCurrency(product.sellingPrice)}</span>
            {product.unit !== 'piece' && (
              <span className="text-gray-400 text-base">per {product.unit}</span>
            )}
          </div>

          {/* Stock */}
          <div className={cn('inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full', inStock ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200')}>
            {inStock ? (
              <><CheckCircle className="w-3.5 h-3.5" /> {totalStock} in stock</>
            ) : (
              <><Package className="w-3.5 h-3.5" /> Out of stock</>
            )}
          </div>

          {/* Description preview */}
          {product.description && (
            <div className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
              <div className="font-semibold text-gray-900 mb-1.5">About this product</div>
              <p className="line-clamp-4 whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Trust badges */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-brand-800">
              <Truck className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Nationwide delivery via GIG, Sendbox & Kwik</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-800">
              <Shield className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>Payments secured by Paystack escrow</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-800">
              <Shield className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>NRS-compliant tax receipt on every order</span>
            </div>
          </div>
        </div>

        {/* ── Col 3: Buy box ── */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="card p-5 space-y-4 border-2 border-brand-100">
            <div className="text-2xl font-extrabold price">{formatCurrency(product.sellingPrice)}</div>

            {/* Delivery note */}
            <div className="text-xs text-gray-600 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              <Truck className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>FREE delivery on orders above ₦50,000. Nationwide coverage.</span>
            </div>

            {/* Stock status */}
            <div className={cn('text-sm font-bold', inStock ? 'text-green-600' : 'text-red-500')}>
              {inStock ? `In Stock (${totalStock} units)` : 'Currently Unavailable'}
            </div>

            {/* Qty picker */}
            {inStock && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Qty:</span>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-gray-900 text-sm">{qty}</span>
                  <button onClick={() => setQty(Math.min(totalStock, qty + 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-2.5">
              <button onClick={handleAddToCart} disabled={!inStock}
                className={cn('w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm',
                  addedToCart ? 'bg-green-500 text-white' : 'btn-cart')}>
                <ShoppingCart className="w-4 h-4" />
                {addedToCart ? 'Added to Cart!' : 'Add to Cart'}
              </button>
              <button onClick={() => {
                if (!isAuthenticated) {
                  navigate(`/login?next=${encodeURIComponent(`/products/${id}`)}`);
                  return;
                }
                addItem(product, qty);
                navigate('/checkout');
              }} disabled={!inStock}
                className="w-full btn-buy py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                Buy Now
              </button>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-green-500" /> Secure transaction
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand-500" /> Ships from verified seller
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs: Description / Reviews ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[['description', 'Product Description'], ['reviews', `Reviews (${reviews.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn('px-6 py-4 text-sm font-semibold transition-colors', tab === key
                ? 'text-brand-700 border-b-2 border-brand-600 bg-brand-50/50'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'description' && (
            product.description
              ? <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
              : <p className="text-gray-400 text-sm">No description provided by the seller.</p>
          )}

          {tab === 'reviews' && (
            <div>
              {/* Review list */}
              {reviews.length === 0 && (
                <p className="text-gray-400 text-sm mb-6">No reviews yet. Be the first to share your experience!</p>
              )}
              <div className="space-y-5 mb-8">
                {reviews.map((r) => (
                  <div key={r.id} className="flex gap-4 pb-5 border-b border-gray-100 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                      {(r.buyerName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{r.buyerName || 'Anonymous'}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'star-fill' : 'star-empty')} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-NG')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Write review */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-4">Write a Review</h3>
                {reviewError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm mb-3">{reviewError}</div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Rating</label>
                    <StarPicker value={reviewForm.rating} onChange={(s) => setReviewForm((f) => ({ ...f, rating: s }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Review</label>
                    <textarea rows={3} value={reviewForm.comment}
                      onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                      placeholder="Share your experience with this product…"
                      className="input resize-none" />
                  </div>
                  <button onClick={() => {
                    if (!isAuthenticated) {
                      setReviewError('Please sign in or register before submitting a review.');
                      navigate(`/login?next=${encodeURIComponent(`/products/${id}`)}`);
                      return;
                    }
                    reviewMutation.mutate({
                      ...reviewForm,
                      buyerName: shopper?.fullName,
                      buyerEmail: shopper?.email,
                    });
                  }}
                    disabled={reviewMutation.isPending || !reviewForm.comment}
                    className="btn-buy px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold">
                    {reviewMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Submit Review
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
