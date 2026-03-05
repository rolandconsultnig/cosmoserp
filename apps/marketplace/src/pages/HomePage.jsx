import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, Shield, Truck, CreditCard, Star, ArrowRight, ShoppingBag, Zap, Tag, Award, Store } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, truncate } from '../lib/utils';
import useCartStore from '../store/cartStore';

const CATEGORIES = [
  { name: 'Electronics',            icon: '💻', bg: '#EEF2FF', border: '#C7D2FE' },
  { name: 'Fashion & Apparel',      icon: '👗', bg: '#FDF2F8', border: '#F9A8D4' },
  { name: 'Food & Beverages',       icon: '🍱', bg: '#FFFBEB', border: '#FCD34D' },
  { name: 'Agriculture',            icon: '🌾', bg: '#F0FDF4', border: '#86EFAC' },
  { name: 'Building & Construction',icon: '🏗️', bg: '#FFF7ED', border: '#FDBA74' },
  { name: 'Health & Beauty',        icon: '💊', bg: '#FAF5FF', border: '#D8B4FE' },
  { name: 'Automobile',             icon: '🚗', bg: '#F0F9FF', border: '#7DD3FC' },
  { name: 'Industrial Equipment',   icon: '⚙️', bg: '#FEF2F2', border: '#FCA5A5' },
];

const TRUST_ITEMS = [
  { icon: Shield,    title: 'KYC-Verified Sellers',     sub: 'All sellers are TIN-registered' },
  { icon: CreditCard,title: 'Paystack Escrow',          sub: 'Funds held until delivery confirmed' },
  { icon: Truck,     title: 'Nationwide Delivery',      sub: 'GIG, Sendbox & Kwik logistics' },
  { icon: Award,     title: 'NRS Tax Receipts',         sub: 'IRN-stamped on every order' },
];

function StarRow({ rating, count }) {
  if (!rating || rating <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1,2,3,4,5].map((s) => (
          <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'star-fill' : 'star-empty'}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500">{parseFloat(rating).toFixed(1)}</span>
      {count > 0 && <span className="text-xs text-gray-400">({count})</span>}
    </div>
  );
}

function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const handleAdd = (e) => {
    e.preventDefault();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };
  return (
    <div className="card-hover flex flex-col overflow-hidden group bg-white">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <ShoppingBag className="w-14 h-14 text-gray-200" />
          )}
        </div>
      </Link>
      <div className="p-3.5 flex flex-col flex-1">
        <div className="text-[11px] text-brand-600 font-semibold mb-0.5 truncate">
          {product.seller?.tradingName || product.seller?.businessName}
        </div>
        <Link to={`/products/${product.id}`}>
          <h3 className="text-sm text-gray-900 leading-snug line-clamp-2 hover:text-brand-700 transition-colors font-medium">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1.5">
          <StarRow rating={product.avgRating} count={product.reviewCount} />
        </div>
        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <div className="price text-base">{formatCurrency(product.sellingPrice)}</div>
            {product.unit !== 'piece' && (
              <div className="text-[11px] text-gray-400">per {product.unit}</div>
            )}
          </div>
          <button onClick={handleAdd}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
              added ? 'bg-green-500 text-white' : 'btn-cart'
            }`}>
            {added ? '✓ Added' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3.5 space-y-2">
        <div className="h-2.5 skeleton w-2/3" />
        <div className="h-3.5 skeleton w-full" />
        <div className="h-3.5 skeleton w-3/4" />
        <div className="flex justify-between mt-3">
          <div className="h-4 skeleton w-1/3" />
          <div className="h-7 w-16 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: featured } = useQuery({
    queryKey: ['listings-featured'],
    queryFn: () => api.get('/marketplace/listings', { params: { limit: 8, featured: true } }).then((r) => r.data),
  });
  const { data: newArrivals } = useQuery({
    queryKey: ['listings-new'],
    queryFn: () => api.get('/marketplace/listings', { params: { limit: 8, sort: 'newest' } }).then((r) => r.data),
  });
  const { data: popular } = useQuery({
    queryKey: ['listings-popular'],
    queryFn: () => api.get('/marketplace/listings', { params: { limit: 4, sort: 'popular' } }).then((r) => r.data),
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  const featuredList  = featured?.data  || [];
  const newList       = newArrivals?.data || [];
  const popularList   = popular?.data    || [];

  return (
    <div className="animate-fade-in">
      {/* ── Hero Banner ── */}
      <section style={{ background: 'linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4338CA 100%)' }}
        className="relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-cta/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1.5 text-amber-300 text-xs font-semibold mb-5">
                <Zap className="w-3.5 h-3.5" /> NRS-Compliant · KYC-Verified Sellers
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-5">
                Nigeria's Premier<br />
                <span className="text-amber-400">Business Marketplace</span>
              </h1>
              <p className="text-white/95 text-lg mb-8 max-w-md leading-relaxed">
                Discover millions of products from KYC-verified SMEs. Secure escrow payments, fast nationwide delivery, tax-compliant receipts.
              </p>
              <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
                <div className="flex-1 flex rounded-xl overflow-hidden shadow-xl">
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for products, brands, categories…"
                    className="flex-1 px-4 py-3.5 text-sm text-gray-900 bg-white focus:outline-none" />
                  <button type="submit" className="bg-amber-400 hover:bg-amber-300 px-5 flex items-center">
                    <Search className="w-5 h-5 text-navy" />
                  </button>
                </div>
              </form>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Electronics', 'Fashion', 'Agriculture', 'Building'].map((t) => (
                  <Link key={t} to={`/products?category=${encodeURIComponent(t)}`}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-3 py-1.5 rounded-full transition-colors border border-white/10">
                    {t}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right stat tiles */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { value: '10,000+', label: 'Verified Sellers',     color: 'bg-amber-400/20 border-amber-400/30',   text: 'text-amber-300' },
                { value: '500K+',   label: 'Products Listed',      color: 'bg-cta/20 border-cta/30',               text: 'text-orange-300' },
                { value: '99.2%',   label: 'Buyer Satisfaction',   color: 'bg-green-400/20 border-green-400/30',   text: 'text-green-300' },
                { value: '37',      label: 'States Covered',       color: 'bg-purple-400/20 border-purple-400/30', text: 'text-purple-300' },
              ].map(({ value, label, color, text }) => (
                <div key={label} className={`${color} border rounded-2xl p-5 backdrop-blur-sm`}>
                  <div className={`text-3xl font-extrabold ${text}`}>{value}</div>
                  <div className="text-white/70 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-brand-100">
                  <Icon className="w-4.5 h-4.5 text-brand-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">{title}</div>
                  <div className="text-[11px] text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ── Today's Deals promo cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { bg: '#1E1B4B', accent: '#FBBF24', icon: '⚡', title: "Today's Deals", sub: 'Limited-time prices on top products', link: '/products?sort=popular' },
            { bg: '#065F46', accent: '#34D399', icon: '🚚', title: 'Free Delivery',  sub: 'On orders over ₦50,000 nationwide',  link: '/products' },
            { bg: '#7C2D12', accent: '#FB923C', icon: '🏷️', title: 'New Arrivals',   sub: 'Fresh stock added daily from sellers', link: '/products?sort=newest' },
          ].map(({ bg, accent, icon, title, sub, link }) => (
            <Link key={title} to={link}
              style={{ background: bg }}
              className="rounded-2xl p-5 flex items-center gap-4 hover:opacity-90 transition-opacity group">
              <div className="text-4xl">{icon}</div>
              <div className="flex-1">
                <div style={{ color: accent }} className="font-bold text-base">{title}</div>
                <div className="text-white/70 text-xs mt-0.5">{sub}</div>
              </div>
              <ArrowRight style={{ color: accent }} className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </section>

        {/* ── Categories ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Shop by Category</h2>
            <Link to="/products" className="section-link">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map(({ name, icon, bg, border }) => (
              <Link key={name} to={`/products?category=${encodeURIComponent(name)}`}
                style={{ background: bg, borderColor: border }}
                className="border rounded-2xl p-3 text-center hover:scale-105 hover:shadow-card transition-all cursor-pointer">
                <div className="text-2xl sm:text-3xl mb-1.5">{icon}</div>
                <div className="text-[10px] sm:text-xs font-semibold text-gray-700 leading-tight">{name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Featured Products ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-brand-600" />
              <h2 className="section-title">Featured Products</h2>
            </div>
            <Link to="/products" className="section-link">See all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredList.length === 0
              ? [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
              : featuredList.map((p) => <ProductCard key={p.id} product={p} />)
            }
          </div>
        </section>

        {/* ── Popular Now (wider cards) ── */}
        {popularList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-cta" />
                <h2 className="section-title">Popular Now</h2>
              </div>
              <Link to="/products?sort=popular" className="section-link">More <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {popularList.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── New Arrivals ── */}
        {newList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-green-600" />
                <h2 className="section-title">New Arrivals</h2>
              </div>
              <Link to="/products?sort=newest" className="section-link">See all <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newList.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── Sell CTA Banner ── */}
        <section style={{ background: 'linear-gradient(135deg,#1E1B4B 0%,#4338CA 100%)' }}
          className="rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1 text-amber-300 text-xs font-semibold mb-4">
              <Store className="w-3.5 h-3.5" /> For Businesses
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Start Selling on Cosmos Market</h2>
            <p className="text-brand-200 mb-6 max-w-lg mx-auto">Toggle marketplace on your ERP product listings. Manage orders from your Cosmos ERP dashboard. Reach millions of buyers.</p>
            <a href="https://erp.cosmosng.com/register"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-navy font-bold px-7 py-3.5 rounded-xl transition-colors text-sm shadow-lg">
              Register Your Business <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
