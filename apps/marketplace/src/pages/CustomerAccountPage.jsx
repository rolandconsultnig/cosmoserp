import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Package, ChevronRight } from 'lucide-react';
import useShopperAuthStore from '../store/shopperAuthStore';

export default function CustomerAccountPage() {
  const { customer, shopper, fetchMe, isAuthenticated } = useShopperAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (!isAuthenticated || !customer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Please sign in to view your account.</p>
        <Link to="/login?next=/account" className="btn-buy inline-block mt-4 py-2.5 px-5 rounded-xl font-semibold text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Account</h1>
      <p className="text-gray-500 text-sm mb-6">Manage your profile and orders</p>

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
            <User className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <div className="font-bold text-gray-900">{customer.fullName}</div>
            <div className="text-sm text-gray-500">{customer.email}</div>
            {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
          </div>
        </div>
        <Link
          to="/account/profile"
          className="inline-flex items-center gap-2 text-brand-600 font-medium text-sm hover:underline"
        >
          Edit profile <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Quick links</h2>
        <Link
          to="/account/orders"
          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-500" /> My Orders
          </span>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>
      </div>
    </div>
  );
}
