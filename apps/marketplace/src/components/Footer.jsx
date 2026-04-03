import { Link } from 'react-router-dom';
import { LOGO_URL } from '../lib/branding';
import { Shield, CreditCard, Truck, ChevronUp } from 'lucide-react';

const SHOP_LINKS  = ['All Products', 'Electronics', 'Fashion', 'Food & Beverages', 'Agriculture', 'Health & Beauty'];
const SELL_LINKS  = [
  { label: 'Seller Dashboard',    href: '/erp' },
  { label: 'Register Your Business', href: '/erp/register' },
  { label: 'Call Center Services', href: '/services/call-center' },
  { label: 'Seller Guidelines',   href: '#' },
  { label: 'Logistics Partners',  href: '/partners-login' },
  { label: 'NRS Compliance',      href: '#' },
];
const HELP_LINKS = [
  { label: 'Track shipment', to: '/track' },
  { label: 'Returns & Refunds', href: '#' },
  { label: 'Shipping Policy', href: '#' },
  { label: 'Customer Protection', href: '#' },
  { label: 'Contact Support', href: '#' },
];

export default function Footer() {
  return (
    <footer className="mt-12">
      {/* Back-to-top bar */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{ background: '#312E81' }}
        className="w-full py-3 text-center text-white/80 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-brand-800">
        <ChevronUp className="w-4 h-4" />
        Back to top
      </button>

      {/* Main footer */}
      <div style={{ background: '#1E1B4B' }} className="text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
            <img src={LOGO_URL} alt="Mixio Marketplace" className="h-[22px] md:h-[25px] lg:h-[27px] w-auto object-contain" />
                <div className="leading-none">
                  <div className="font-extrabold text-white text-base">Mixio</div>
                  <div className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest">Market</div>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Nigeria's verified B2B & B2C marketplace — connecting KYC-approved businesses with customers nationwide.
              </p>
              <div className="mt-4 text-xs text-gray-500">Powered by Roland Consult · 2025</div>
            </div>

            {/* Shop */}
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Shop</h3>
              <ul className="space-y-2.5 text-sm">
                {SHOP_LINKS.map((c) => (
                  <li key={c}>
                    <Link to={`/products?category=${encodeURIComponent(c === 'All Products' ? '' : c)}`}
                      className="text-gray-400 hover:text-amber-300 transition-colors">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sell */}
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Sell on Mixio</h3>
              <ul className="space-y-2.5 text-sm">
                {SELL_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith('/erp') ? (
                      <a href={href} className="text-gray-400 hover:text-amber-300 transition-colors">{label}</a>
                    ) : (
                      <Link to={href} className="text-gray-400 hover:text-amber-300 transition-colors">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Help</h3>
              <ul className="space-y-2.5 text-sm">
                {HELP_LINKS.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-gray-400 hover:text-amber-300 transition-colors">{l.label}</Link>
                    ) : (
                      <a href={l.href} className="text-gray-400 hover:text-amber-300 transition-colors">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust */}
            <div>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Trust & Safety</h3>
              <div className="space-y-3">
                {[
                  { icon: Shield,    text: 'NRS Tax-Compliant Receipts' },
                  { icon: CreditCard, text: 'Mixtio Escrow Payments' },
                  { icon: Truck,     text: 'GIG & Sendbox Logistics' },
                  { icon: Shield,    text: 'KYC-Verified Sellers' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-gray-400">
                    <Icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ background: '#0D0A2E' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <span>© 2025 Mixio Marketplace by Roland Consult. All rights reserved.</span>
            <div className="flex gap-5">
              <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-300 transition-colors">Cookie Preferences</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
