import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, ShoppingBag, X, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useCartStore from '../store/cartStore';

const CATEGORIES = [
  'Electronics', 'Fashion & Apparel', 'Food & Beverages', 'Agriculture',
  'Building & Construction', 'Health & Beauty', 'Automobile', 'Industrial Equipment', 'Office Supplies',
];

const SORT_OPTIONS = [
  ['',           'Featured'],
  ['price_asc',  'Price: Low to High'],
  ['price_desc', 'Price: High to Low'],
  ['newest',     'Newest Arrivals'],
  ['popular',    'Most Popular'],
];

function StarRow({ rating, count }) {
  if (!rating || rating <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'star-fill' : 'star-empty'}`} />
      ))}
      <span className="text-xs text-gray-500 ml-0.5">{parseFloat(rating).toFixed(1)}</span>
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
    <div className="card-hover overflow-hidden flex flex-col group bg-white">
      <Link to={`/products/${product.id}`} className="block">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100 relative">
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
            <div className="price text-sm font-bold">{formatCurrency(product.sellingPrice)}</div>
            {product.unit !== 'piece' && <div className="text-[11px] text-gray-400">per {product.unit}</div>}
          </div>
          <button onClick={handleAdd}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
              added ? 'bg-green-500 text-white' : 'btn-cart'
            }`}>
            {added ? '✓' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-3.5 space-y-2">
        <div className="h-2.5 skeleton w-1/2" />
        <div className="h-3.5 skeleton w-full" />
        <div className="h-3.5 skeleton w-3/4" />
        <div className="flex justify-between mt-2">
          <div className="h-4 skeleton w-1/3" />
          <div className="h-7 w-16 skeleton rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search,   setSearch]   = useState(searchParams.get('search')   || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort,     setSort]     = useState(searchParams.get('sort')     || '');
  const [page,     setPage]     = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['listings', page, search, category, sort],
    queryFn: () => api.get('/marketplace/listings', {
      params: { page, limit: 20, search: search || undefined, category: category || undefined, sort: sort || undefined },
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const products = data?.data || [];

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    const p = {};
    if (search)   p.search   = search;
    if (category) p.category = category;
    if (sort)     p.sort     = sort;
    setSearchParams(p);
  };

  const setAndResetPage = (fn) => { fn(); setPage(1); };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-5">
        <Link to="/" className="hover:text-brand-600">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-gray-800 font-medium">{category || 'All Products'}</span>
        {data?.pagination && (
          <span className="ml-2 text-gray-400">({data.pagination.total} results)</span>
        )}
      </nav>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{category || 'All Products'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Sort (desktop) */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-medium">Sort:</span>
            {SORT_OPTIONS.map(([val, label]) => (
              <button key={val} onClick={() => setAndResetPage(() => setSort(val))}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', sort === val
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600')}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {(category || search) && (
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-500 font-medium">Filters:</span>
          {category && (
            <button onClick={() => setAndResetPage(() => setCategory(''))}
              className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-brand-100 transition-colors">
              {category} <X className="w-3 h-3" />
            </button>
          )}
          {search && (
            <button onClick={() => setAndResetPage(() => setSearch(''))}
              className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-brand-100 transition-colors">
              "{search}" <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-5">
        {/* ── Sidebar ── */}
        <aside className={cn('flex-shrink-0 w-56 space-y-4', showFilters ? 'block' : 'hidden sm:block')}>
          {/* Search */}
          <form onSubmit={applySearch} className="card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 bg-gray-50" />
            </div>
          </form>

          {/* Categories */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Department</h3>
            <div className="space-y-0.5">
              <button onClick={() => setAndResetPage(() => setCategory(''))}
                className={cn('w-full text-left text-sm px-3 py-2 rounded-lg transition-colors', !category ? 'filter-active' : 'filter-passive')}>
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setAndResetPage(() => setCategory(cat))}
                  className={cn('w-full text-left text-sm px-3 py-2 rounded-lg transition-colors truncate', category === cat ? 'filter-active' : 'filter-passive')}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort (mobile/sidebar) */}
          <div className="card p-4 sm:hidden">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Sort By</h3>
            <div className="space-y-0.5">
              {SORT_OPTIONS.map(([val, label]) => (
                <button key={val} onClick={() => setAndResetPage(() => setSort(val))}
                  className={cn('w-full text-left text-sm px-3 py-2 rounded-lg transition-colors', sort === val ? 'filter-active' : 'filter-passive')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Product grid ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile search */}
          <form onSubmit={applySearch} className="mb-4 sm:hidden">
            <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="flex-1 px-4 py-2.5 text-sm bg-white focus:outline-none" />
              <button type="submit" className="bg-amber-400 px-4 flex items-center">
                <Search className="w-4 h-4 text-navy" />
              </button>
            </div>
          </form>

          {/* Results count */}
          {data?.pagination && (
            <div className="text-sm text-gray-500 mb-3">
              Showing <span className="font-semibold text-gray-900">{products.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{data.pagination.total}</span> results
              {search && <> for <span className="font-semibold text-brand-600">"{search}"</span></>}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading && [...Array(12)].map((_, i) => <Skeleton key={i} />)}
            {!isLoading && products.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-400">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="font-semibold text-gray-500 text-lg">No products found</p>
                <p className="text-sm mt-1">Try different keywords or browse categories</p>
                <Link to="/products" className="mt-4 inline-block btn-cart px-5 py-2.5">Browse All Products</Link>
              </div>
            )}
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {/* Pagination */}
          {data?.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 btn-outline disabled:opacity-40">
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(data.pagination.totalPages, 7))].map((_, i) => {
                  const pg = i + 1;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={cn('w-9 h-9 rounded-xl text-sm font-semibold transition-colors', pg === page
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600')}>
                      {pg}
                    </button>
                  );
                })}
              </div>
              <button disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 btn-outline disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
