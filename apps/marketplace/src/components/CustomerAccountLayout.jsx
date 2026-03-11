import { Link, useLocation } from 'react-router-dom';
import { User, Package, Shield, MapPin, MessageCircle, Wallet, Bus, Truck } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', to: '/account', icon: User },
  { key: 'orders', label: 'Orders', to: '/account/orders', icon: Package },
  { key: 'profile', label: 'Profile', to: '/account/profile', icon: User },
  { key: 'security', label: 'Security', to: '/account/security', icon: Shield },
  { key: 'addresses', label: 'Addresses', to: '/account/addresses', icon: MapPin },
  { key: 'support', label: 'Support', to: '/account/support', icon: MessageCircle },
  { key: 'wallet', label: 'Wallet', to: '/account/wallet', icon: Wallet },
  { key: 'transport', label: 'Transportation', to: '/account/transportation', icon: Bus },
  { key: 'track', label: 'Track goods', to: '/account/track-goods', icon: Truck },
  { key: 'budget', label: 'Budget', to: '/account/budget', icon: Shield },
];

export default function CustomerAccountLayout({ active, children }) {
  const location = useLocation();

  const isActive = (item) => {
    if (active && item.key === active) return true;
    return location.pathname === item.to;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid gap-6 md:grid-cols-[240px,minmax(0,1fr)] items-start">
        <aside className="card p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Account
          </h2>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const activeItem = isActive(item);
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ' +
                    (activeItem
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section>
          {children}
        </section>
      </div>
    </div>
  );
}

