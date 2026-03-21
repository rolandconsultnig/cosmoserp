import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Shield, ShoppingBag, Star } from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useCartStore from '../store/cartStore';
import Seo from '../components/Seo';
import { getSiteUrl } from '../lib/siteConfig';

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
            className={cn('text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95', added ? 'bg-green-500 text-white' : 'btn-cart')}>
            {added ? '✓' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StorefrontPage() {
  const { tenantId } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['storefront', tenantId],
    queryFn: () => api.get(`/marketplace/stores/${tenantId}`).then((r) => r.data.data),
  });

  const seller = data?.seller;
  const listings = data?.listings || [];

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-sm text-slate-500">Loading store...</div>;
  }

  if (isError || !seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Store not found</h1>
        <p className="text-sm text-gray-500 mt-2">This seller store may be unavailable.</p>
      </div>
    );
  }

  const storeName = seller.tradingName || seller.businessName || 'Seller';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Seo
        title={`${storeName} — Official store`}
        description={`Shop products from ${storeName} on Cosmos Market. KYC-verified seller, secure payments, nationwide delivery.`}
        canonicalPath={`/store/${tenantId}`}
        type="website"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: storeName,
          url: `${getSiteUrl() || 'https://cosmoserp.com.ng'}/store/${tenantId}`,
        }}
      />
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{seller.tradingName || seller.businessName}</h1>
            <p className="text-sm text-gray-500 mt-1">Official seller storefront</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              <span>{seller.city || 'Nigeria'}{seller.state ? `, ${seller.state}` : ''}</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700">
            <Shield className="w-3.5 h-3.5" />
            KYC Verified Seller
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="section-title">Products by this seller</h2>
        <span className="text-sm text-gray-500">{listings.length} item{listings.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {listings.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
