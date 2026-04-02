import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, MapPin, ChevronDown, User } from 'lucide-react';
import { useState } from 'react';
import useCartStore from '../store/cartStore';
import useShopperAuthStore from '../store/shopperAuthStore';
import { LOGO_URL } from '../lib/branding';

const CATEGORIES = [
  'All Departments', 'Electronics', 'Fashion & Apparel', 'Food & Beverages',
  'Agriculture', 'Building & Construction', 'Health & Beauty', 'Automobile', 'Industrial Equipment',
];

export default function Navbar() {
  const [search, setSearch]       = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate  = useNavigate();
  const items     = useCartStore((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const shopper = useShopperAuthStore((s) => s.shopper);
  const customer = useShopperAuthStore((s) => s.customer);
  const isAuthenticated = useShopperAuthStore((s) => s.isAuthenticated);
  const logout = useShopperAuthStore((s) => s.logout);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="sticky top-0 z-50 shadow-header">
      {/* ── Row 1: Logo · Search · Account · Cart ── */}
      <div style={{ background: 'linear-gradient(180deg,#1E1B4B 0%,#1A1845 100%)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-[60px]">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
              <img src={LOGO_URL} alt="Cosmos Market" className="h-[24px] md:h-[28px] lg:h-[30px] w-auto object-contain" />
              <div className="hidden sm:block leading-none">
                <div className="text-white font-extrabold text-base tracking-tight">Cosmos</div>
                <div className="text-amber-300 text-[10px] font-semibold uppercase tracking-widest">Market</div>
              </div>
            </Link>

            {/* Deliver to chip */}
            <div className="hidden lg:flex items-start gap-1 text-white/80 hover:text-white cursor-pointer group px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-amber-400" />
              <div className="leading-none">
                <div className="text-[10px] text-white/60">Deliver to</div>
                <div className="text-xs font-semibold group-hover:text-amber-300 transition-colors flex items-center gap-0.5">
                  Nigeria <ChevronDown className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 hidden sm:flex">
              <div className="flex w-full rounded-xl overflow-hidden shadow-md">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Cosmos Market…"
                  className="flex-1 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset"
                />
                <button type="submit"
                  className="bg-amber-400 hover:bg-amber-300 transition-colors px-4 flex items-center justify-center">
                  <Search className="w-5 h-5 text-navy" />
                </button>
              </div>
            </form>

            <div className="flex-1 sm:hidden" />

            {/* Account: when guest show Sign in + Register; when customer show Sign out */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  to="/account"
                  className="flex items-center gap-1 text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <div className="leading-none">
                    <div className="text-[10px] text-white/60">Hello, {shopper?.fullName?.split(' ')[0] || customer?.fullName?.split(' ')[0] || 'Customer'}</div>
                    <div className="text-xs font-semibold">My account</div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-white/70 hover:text-white text-xs font-medium px-2 py-1 rounded-lg hover:bg-white/10"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1">
                <Link
                  to="/register"
                  className="flex items-center gap-1 text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors text-xs font-semibold"
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-1 text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <User className="w-4 h-4 text-amber-400" />
                  <div className="leading-none">
                    <div className="text-[10px] text-white/60">Hello, Guest</div>
                    <div className="text-xs font-semibold">Sign in</div>
                  </div>
                </Link>
              </div>
            )}

            {/* Cart */}
            <Link to="/cart"
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors group">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-white group-hover:text-amber-300 transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-amber-400 text-navy text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span className="text-white font-semibold text-sm hidden sm:block">Cart</span>
            </Link>

            {/* Mobile hamburger */}
            <button className="sm:hidden text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search row */}
        {mobileOpen && (
          <div className="px-3 pb-3 sm:hidden space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/account" className="block py-2 text-amber-300 text-sm font-semibold" onClick={() => setMobileOpen(false)}>My account</Link>
                <button type="button" onClick={() => { logout(); setMobileOpen(false); navigate('/'); }} className="block py-2 text-white/80 text-sm">Sign out</button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/register" className="flex-1 text-center py-2 rounded-lg bg-white/10 text-amber-300 text-sm font-semibold" onClick={() => setMobileOpen(false)}>Register</Link>
                <Link to="/login" className="flex-1 text-center py-2 rounded-lg bg-amber-400 text-navy text-sm font-semibold" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </div>
            )}
            <form onSubmit={handleSearch} className="flex rounded-xl overflow-hidden shadow-md">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Cosmos Market…"
                className="flex-1 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none"
              />
              <button type="submit" className="bg-amber-400 px-4 flex items-center justify-center">
                <Search className="w-4 h-4 text-navy" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Row 2: Category navigation bar ── */}
      <nav style={{ background: '#312E81' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-1.5 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                to={`/products?category=${encodeURIComponent(cat === 'All Departments' ? '' : cat)}`}
                className="whitespace-nowrap text-white/85 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0">
                {cat}
              </Link>
            ))}
            <Link
              to="/services/call-center"
              className="whitespace-nowrap text-amber-200 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0"
            >
              Call Center Services
            </Link>
            <Link to="/products" className="whitespace-nowrap text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors flex-shrink-0 ml-auto">
              Today's Deals →
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
