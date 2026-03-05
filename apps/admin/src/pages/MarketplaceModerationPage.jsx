import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, CheckCircle, XCircle, Eye, Loader2, Package,
  Star, Tag, ShoppingCart, TrendingUp, Clock, AlertCircle,
  Filter, ChevronDown, Grid3X3, List, ArrowUpRight, Truck,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatCurrency, getStatusColor, cn } from '../lib/utils';

/* ── Amazon colour tokens ───────────────────────────────── */
const AZ = {
  orange:      '#FF9900',
  orangeHover: '#E68900',
  orangeDark:  '#C96D00',
  navy:        '#131A22',
  navyMid:     '#232F3E',
  teal:        '#008296',
  tealLight:   '#00A8B4',
  cream:       '#FEBD69',
  creamLight:  '#FFF3CD',
};

/* ── Status config ────────────────────────────────────────── */
const STATUS_CONFIG = {
  PENDING:  { label: 'Pending Review', bg: '#FFF8E7', border: '#FEBD69', text: '#854D0E', dot: AZ.cream },
  APPROVED: { label: 'Live',           bg: '#F0FFF4', border: '#86EFAC', text: '#14532D', dot: '#22C55E' },
  REJECTED: { label: 'Rejected',       bg: '#FFF1F2', border: '#FCA5A5', text: '#7F1D1D', dot: '#EF4444' },
};

const STATUS_TABS = [
  { value: 'PENDING',  label: 'Pending Review', icon: Clock },
  { value: 'APPROVED', label: 'Live Listings',  icon: CheckCircle },
  { value: 'REJECTED', label: 'Rejected',       icon: XCircle },
  { value: '',         label: 'All Listings',   icon: Grid3X3 },
];

/* ── Mini star component ──────────────────────────────────── */
function Stars({ n = 4 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={cn('w-3 h-3', i < n ? 'fill-current text-[#FF9900]' : 'text-slate-300')} />
      ))}
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl p-4 flex items-center gap-4 border border-slate-100"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)' }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-black text-slate-900 tracking-tight leading-none">{value}</p>
        <p className="text-[12px] font-semibold text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Product listing card ─────────────────────────────────── */
function ListingCard({ listing, onApprove, onReject, isPending }) {
  const status = listing.marketplaceStatus || 'PENDING';
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden flex flex-col group transition-all duration-200"
      style={{
        border: '1px solid #E7E7E7',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = AZ.orange; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#E7E7E7'; }}
    >
      {/* ── Image area ── */}
      <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 h-48 flex items-center justify-center overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <Package className="w-14 h-14 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-medium">No image</span>
          </div>
        )}

        {/* Status badge — top right */}
        <div
          className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: cfg.dot }} />
          {cfg.label}
        </div>

        {/* Category badge — top left */}
        {listing.category && (
          <div
            className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: AZ.navyMid, color: '#fff' }}
          >
            {listing.category?.name}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Seller */}
        <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide mb-1 truncate">
          {listing.tenant?.tradingName || listing.tenant?.businessName}
        </p>

        {/* Product name */}
        <h3 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-[#0066C0] transition-colors">
          {listing.name}
        </h3>

        {/* Stars */}
        <div className="flex items-center gap-1.5 mb-2">
          <Stars n={Math.floor(Math.random() * 2) + 3} />
          <span className="text-[11px] text-[#0066C0] font-semibold">
            ({Math.floor(Math.random() * 800) + 12})
          </span>
        </div>

        {/* Price + unit */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-[11px] text-slate-500 align-top">₦</span>
          <span className="text-[22px] font-black text-slate-900 tracking-tight leading-none">
            {(listing.sellingPrice || 0).toLocaleString()}
          </span>
          {listing.unit && (
            <span className="text-[12px] text-slate-400">/{listing.unit}</span>
          )}
        </div>

        {/* SKU + meta */}
        {listing.sku && (
          <p className="text-[11px] text-slate-400 font-mono mb-2">SKU: {listing.sku}</p>
        )}

        {listing.description && (
          <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed mb-3 flex-1">
            {listing.description}
          </p>
        )}

        <p className="text-[11px] text-slate-400 mt-auto">
          Listed: {formatDate(listing.marketplaceListedAt || listing.updatedAt)}
        </p>
      </div>

      {/* ── Action footer ── */}
      <div className="px-4 pb-4 pt-2 flex flex-col gap-2 border-t border-slate-100 mt-0">
        <div className="flex gap-2">
          {status !== 'APPROVED' && (
            <button
              onClick={onApprove}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-black transition-all disabled:opacity-60 active:scale-95"
              style={{
                background: `linear-gradient(180deg, #F7CA45 0%, ${AZ.orange} 100%)`,
                color: AZ.navy,
                border: `1px solid ${AZ.orangeDark}`,
                boxShadow: `0 2px 6px rgba(255,153,0,0.30)`,
              }}
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Approve &amp; Publish
            </button>
          )}
          {status !== 'REJECTED' && (
            <button
              onClick={onReject}
              disabled={isPending}
              className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-[12px] font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          )}
        </div>
        <a
          href={`/products/${listing.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#0066C0] hover:bg-blue-50 transition-colors border border-slate-200"
        >
          <Eye className="w-3.5 h-3.5" /> Full Preview
        </a>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function MarketplaceModerationPage() {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [viewMode, setViewMode]         = useState('grid');
  const [page, setPage]                 = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-marketplace-listings', page, search, statusFilter],
    queryFn: () =>
      api.get('/admin/marketplace/listings', {
        params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: mktStats } = useQuery({
    queryKey: ['admin-marketplace-stats'],
    queryFn: () => api.get('/admin/marketplace/stats').then((r) => r.data.data).catch(() => ({})),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ listingId, action, reason }) =>
      api.post(`/admin/marketplace/listings/${listingId}/moderate`, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-marketplace-listings']);
      qc.invalidateQueries(['admin-marketplace-stats']);
    },
  });

  const handleApprove = (listingId) => moderateMutation.mutate({ listingId, action: 'approve' });
  const handleReject  = (listingId) => {
    const reason = window.prompt('Rejection reason (optional):');
    moderateMutation.mutate({ listingId, action: 'reject', reason: reason || '' });
  };

  const listings = data?.data || [];

  return (
    <div className="space-y-0 animate-fade-in">

      {/* ════════════════════════════════════════════════════
          Amazon-style header bar
      ════════════════════════════════════════════════════ */}
      <div
        className="-mx-6 -mt-6 px-6 pt-6 pb-5 mb-6"
        style={{ background: `linear-gradient(180deg, ${AZ.navy} 0%, ${AZ.navyMid} 100%)` }}
      >
        {/* Top row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: AZ.orange }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: AZ.navy }} />
            </div>
            <div>
              <h1 className="text-[20px] font-black text-white tracking-tight leading-tight">
                Marketplace Moderation
              </h1>
              <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
                Cosmos ERP Marketplace · Review &amp; approve product listings
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Total count pill */}
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold"
            style={{ background: 'rgba(255,255,255,0.10)', color: AZ.cream }}
          >
            <Tag className="w-3.5 h-3.5" />
            {(data?.pagination?.total || 0).toLocaleString()} Total Listings
          </div>
        </div>

        {/* Search bar — Amazon style */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products, sellers, SKU, categories…"
              className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-white
                         focus:outline-none focus:ring-2 placeholder:text-slate-400"
              style={{ '--tw-ring-color': AZ.orange }}
            />
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-black transition-all"
            style={{ background: AZ.orange, color: AZ.navy }}
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review',     value: mktStats?.pending  || 0, color: AZ.cream,    icon: Clock },
            { label: 'Live Listings',      value: mktStats?.approved || 0, color: '#4ADE80',   icon: CheckCircle },
            { label: 'Rejected',           value: mktStats?.rejected || 0, color: '#F87171',   icon: XCircle },
            { label: 'Gross Marketplace Value', value: formatCurrency(mktStats?.gmv || 0), color: AZ.orange, icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
              <div className="min-w-0">
                <div className="text-[18px] font-black leading-none" style={{ color }}>
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
                <div className="text-[11px] font-medium mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          Tab bar + view toggle
      ════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        {/* Status tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60">
          {STATUS_TABS.map(({ value, label, icon: Icon }) => {
            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setPage(1); }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all duration-150"
                style={isActive
                  ? { background: AZ.navy, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }
                  : { color: '#64748b' }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* View mode */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-2 rounded-lg transition-all', viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600')}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-2 rounded-lg transition-all', viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          Grid / List view
      ════════════════════════════════════════════════════ */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {isLoading && [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse border border-slate-100">
              <div className="h-48 bg-slate-100" />
              <div className="p-4 space-y-2.5">
                <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
                <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                <div className="h-6 bg-slate-100 rounded-lg w-1/3" />
              </div>
            </div>
          ))}

          {!isLoading && listings.length === 0 && (
            <div className="col-span-full text-center py-24">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${AZ.orange}15` }}
              >
                <ShoppingCart className="w-10 h-10" style={{ color: AZ.orange }} />
              </div>
              <p className="text-[16px] font-bold text-slate-600">No listings found</p>
              {statusFilter === 'PENDING' && (
                <p className="text-[13px] text-slate-400 mt-1">All listings are reviewed — check back soon</p>
              )}
            </div>
          )}

          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onApprove={() => handleApprove(listing.id)}
              onReject={() => handleReject(listing.id)}
              isPending={moderateMutation.isPending}
            />
          ))}
        </div>
      ) : (
        /* ── List view ── */
        <div className="bg-white rounded-xl overflow-hidden border border-slate-200"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: AZ.navyMid }}>
                  {['Product', 'Seller', 'Category', 'Price', 'Status', 'Listed', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: AZ.cream }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-slate-100 rounded-full" /></td>
                    ))}
                  </tr>
                ))}
                {!isLoading && listings.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400">No listings found</td></tr>
                )}
                {listings.map((listing) => {
                  const status = listing.marketplaceStatus || 'PENDING';
                  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={listing.id}
                      className="border-b border-slate-50 transition-colors"
                      style={{ cursor: 'default' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFBF2'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100">
                            {listing.imageUrl
                              ? <img src={listing.imageUrl} alt="" className="w-full h-full object-cover" />
                              : <Package className="w-5 h-5 text-slate-300" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-[13px] truncate max-w-[180px]">{listing.name}</div>
                            {listing.sku && <div className="text-[11px] text-slate-400 font-mono">{listing.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] font-semibold text-teal-700">
                          {listing.tenant?.tradingName || listing.tenant?.businessName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {listing.category && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ background: AZ.navyMid, color: '#fff' }}>
                            {listing.category?.name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[15px] font-black text-slate-900">
                          {formatCurrency(listing.sellingPrice)}
                        </span>
                        {listing.unit && <span className="text-[11px] text-slate-400 ml-1">/{listing.unit}</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-slate-400">{formatDate(listing.marketplaceListedAt || listing.updatedAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {status !== 'APPROVED' && (
                            <button
                              onClick={() => handleApprove(listing.id)}
                              disabled={moderateMutation.isPending}
                              className="flex items-center gap-1 text-[12px] font-black px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
                              style={{ background: AZ.orange, color: AZ.navy }}
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {status !== 'REJECTED' && (
                            <button
                              onClick={() => handleReject(listing.id)}
                              disabled={moderateMutation.isPending}
                              className="flex items-center gap-1 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {data?.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[13px] text-slate-500 font-medium">
            Page <strong className="text-slate-700">{page}</strong> of{' '}
            <strong className="text-slate-700">{data.pagination.totalPages}</strong>
            {' '}· {(data.pagination.total || 0).toLocaleString()} listings
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="page-btn">← Prev</button>
            <button disabled={!data.pagination.hasMore} onClick={() => setPage((p) => p + 1)}
              className="page-btn">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
