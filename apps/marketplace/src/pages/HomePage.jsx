import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, Shield, Truck, CreditCard, Star, ArrowRight, ShoppingBag, Award, Users } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import useCartStore from '../store/cartStore';
import Seo from '../components/Seo';
import { getSiteUrl } from '../lib/siteConfig';

/* Hero carousel: Unsplash CDN only (Wikimedia is blocked by OpaqueResponseBlocking in some browsers). */
const HERO_SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1920&q=85',
    alt: 'Urban skyline — modern business and commerce',
  },
  {
    src: 'https://images.unsplash.com/photo-1722442746061-054e1cb47540?w=1920&q=85',
    alt: 'Abuja, Nigeria — Federal Capital city streets and skyline',
  },
  {
    src: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1920&q=85',
    alt: 'Lagos, Nigeria — coastal city, boats and metropolitan shoreline',
  },
  {
    src: 'https://images.unsplash.com/photo-1744907895363-d351aa6019ef?w=1920&q=85',
    alt: 'Lagos, Nigeria — Lekki–Ikoyi Link Bridge and lagoon cityscape',
  },
  {
    src: 'https://images.unsplash.com/photo-1637299394104-70932260f868?w=1920&q=85',
    alt: 'Kano, Nigeria — urban streets, commerce and northern city life',
  },
];

const CATEGORIES = [
  { name: 'Electronics', icon: '💻' },
  { name: 'Fashion & Apparel', icon: '👗' },
  { name: 'Food & Beverages', icon: '🍱' },
  { name: 'Agriculture', icon: '🌾' },
  { name: 'Building & Construction', icon: '🏗️' },
  { name: 'Health & Beauty', icon: '💊' },
  { name: 'Automobile', icon: '🚗' },
  { name: 'Industrial Equipment', icon: '⚙️' },
];

const TRUST_ITEMS = [
  { icon: Shield, title: 'KYC-Verified Sellers', sub: 'All sellers are TIN-registered' },
  { icon: CreditCard, title: 'Cosmos Escrow', sub: 'Funds held until delivery confirmed' },
  { icon: Truck, title: 'Nationwide Delivery', sub: 'GIG, Sendbox & Kwik logistics' },
  { icon: Award, title: 'NRS Tax Receipts', sub: 'IRN-stamped on every order' },
];

function StarRow({ rating, count }) {
  const ratingValue = Number(rating);
  if (!Number.isFinite(ratingValue) || ratingValue <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-3 h-3 ${s <= Math.round(ratingValue) ? 'star-fill' : 'star-empty'}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500">{ratingValue.toFixed(1)}</span>
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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="w-14 h-14 text-gray-300" />
          )}
        </div>
      </Link>
      <div className="p-3 flex flex-col flex-1">
        <div className="text-xs text-indigo-600 font-medium mb-0.5 truncate">
          {product.seller?.id ? (
            <Link to={`/store/${product.seller.id}`} className="hover:underline">
              {product.seller?.tradingName || product.seller?.businessName}
            </Link>
          ) : (
            product.seller?.tradingName || product.seller?.businessName
          )}
        </div>
        <Link to={`/products/${product.id}`}>
          <h3 className="text-sm text-gray-900 leading-snug line-clamp-2 hover:text-indigo-700 font-medium">
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
              <div className="text-xs text-gray-400">per {product.unit}</div>
            )}
          </div>
          <button
            onClick={handleAdd}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              added ? 'bg-green-600 text-white' : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
            }`}
          >
            {added ? '✓ Added' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 skeleton w-2/3" />
        <div className="h-3.5 skeleton w-full" />
        <div className="h-3.5 skeleton w-3/4" />
        <div className="flex justify-between mt-3">
          <div className="h-4 skeleton w-1/3" />
          <div className="h-7 w-16 skeleton rounded" />
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

  const featuredList = featured?.data || [];
  const newList = newArrivals?.data || [];
  const popularList = popular?.data || [];

  return (
    <div>
      <Seo
        fullTitle="Cosmos Market — Buy from Nigerian Businesses"
        description="Shop verified Nigerian sellers with secure escrow, nationwide delivery, and NRS tax receipts. Electronics, fashion, food, agriculture, and more."
        canonicalPath="/"
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Cosmos Market',
          url: getSiteUrl() || 'https://cosmoserp.com.ng',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${getSiteUrl() || 'https://cosmoserp.com.ng'}/products?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* Hero: Amazon-style image carousel (scroll right to left) with search overlay */}
      <section className="relative w-full overflow-hidden bg-gray-900" style={{ minHeight: '380px' }}>
        <div
          className="hero-carousel-track hero-carousel-track--5 absolute flex flex-shrink-0"
          style={{
            width: `${HERO_SLIDES.length * 100}%`,
            height: '100%',
            minHeight: '380px',
            left: 0,
            top: 0,
          }}
        >
          {HERO_SLIDES.map((slide, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-full"
              style={{ width: `${100 / HERO_SLIDES.length}%` }}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-full object-cover"
                style={{ minHeight: '380px' }}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center px-4 py-10 z-10"
          style={{ minHeight: '380px' }}
        >
          <p className="text-amber-300 text-sm font-semibold mb-2">
            NRS-Compliant · KYC-Verified Sellers
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-3">
            Nigeria's Premier<br />Business Marketplace
          </h1>
          <p className="text-white/95 text-center text-sm sm:text-base max-w-xl mb-6">
            Discover millions of products from KYC-verified SMEs. Secure escrow payments, fast nationwide delivery, tax-compliant receipts.
          </p>
          <form onSubmit={handleSearch} className="w-full max-w-2xl">
            <div className="flex rounded overflow-hidden shadow-lg bg-white">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for products, brands, categories…"
                className="flex-1 px-4 py-3 text-gray-900 text-sm focus:outline-none"
              />
              <button type="submit" className="bg-amber-400 hover:bg-amber-500 px-5 flex items-center justify-center text-gray-900">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Electronics', 'Fashion', 'Agriculture', 'Building'].map((t) => (
              <Link
                key={t}
                to={`/products?category=${encodeURIComponent(t)}`}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded border border-white/30 transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUST_ITEMS.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{title}</div>
                  <div className="text-xs text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Promo links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/products?sort=popular"
            className="bg-gray-800 text-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <span className="font-semibold">Today's Deals</span>
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </Link>
          <Link
            to="/products"
            className="bg-gray-800 text-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <span className="font-semibold">End to End Delivery (E2ED)</span>
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </Link>
          <Link
            to="/services/call-center"
            className="bg-[#123524] text-white rounded-lg p-4 flex items-center justify-between hover:bg-[#184a33] transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-300" /> Call Center Services
            </span>
            <ArrowRight className="w-5 h-5 text-amber-300" />
          </Link>
          <Link
            to="/products?sort=newest"
            className="bg-gray-800 text-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <span className="font-semibold">New Arrivals</span>
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </Link>
          <Link
            to="/partners-login"
            className="bg-gray-800 text-white rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
          >
            <span className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Partners Login
            </span>
            <ArrowRight className="w-5 h-5 text-amber-400" />
          </Link>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Shop by Category</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {CATEGORIES.map(({ name, icon }) => (
              <Link
                key={name}
                to={`/products?category=${encodeURIComponent(name)}`}
                className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-medium text-gray-700 leading-tight">{name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Featured Products</h2>
            <Link to="/products" className="text-sm text-indigo-600 hover:underline font-medium flex items-center gap-1">
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredList.length === 0
              ? [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
              : featuredList.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Popular */}
        {popularList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Popular Now</h2>
              <Link to="/products?sort=popular" className="text-sm text-indigo-600 hover:underline font-medium flex items-center gap-1">
                More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {popularList.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* New Arrivals */}
        {newList.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">New Arrivals</h2>
              <Link to="/products?sort=newest" className="text-sm text-indigo-600 hover:underline font-medium flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {newList.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Sell CTA */}
        <section className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Sell on Cosmos Market</h2>
          <p className="text-gray-300 text-sm mb-4 max-w-lg mx-auto">
            List your products from your Cosmos ERP. Reach millions of customers with KYC verification and NRS-compliant receipts.
          </p>
          <a
            href="https://erp.cosmosng.com/register"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Register Your Business <ArrowRight className="w-4 h-4" />
          </a>
        </section>
      </div>
    </div>
  );
}
