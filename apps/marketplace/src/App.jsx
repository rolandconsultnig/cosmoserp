import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StorefrontPage from './pages/StorefrontPage';
import LogisticsPartnersPage from './pages/LogisticsPartnersPage';
import PartnersLoginPage from './pages/PartnersLoginPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import CustomerOrdersPage from './pages/CustomerOrdersPage';
import CustomerOrderDetailPage from './pages/CustomerOrderDetailPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import useShopperAuthStore from './store/shopperAuthStore';

// When user hits /erp/* on the marketplace, redirect once: /erp/partners-login -> /partners-login; others -> ERP app
function RedirectToErp() {
  const { pathname, search } = useLocation();
  const didRedirect = useRef(false);
  useEffect(() => {
    if (didRedirect.current) return;
    const target = pathname === '/erp/partners-login'
      ? window.location.origin + '/partners-login' + search
      : (import.meta.env.VITE_ERP_URL || (window.location.port === '5174' ? 'http://localhost:3060' : window.location.origin)) + pathname + search;
    if (target === window.location.href) return; // avoid same-URL reload loop
    didRedirect.current = true;
    window.location.replace(target);
  }, [pathname, search]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-gray-500">Redirecting…</p>
    </div>
  );
}

function RequireShopper({ children }) {
  const isAuthenticated = useShopperAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/erp/*" element={<RedirectToErp />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ListingsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/store/:tenantId" element={<StorefrontPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/partners-login" element={<PartnersLoginPage />} />
          <Route path="/logistics" element={<LogisticsPartnersPage />} />
          <Route path="/cart" element={<RequireShopper><CartPage /></RequireShopper>} />
          <Route path="/checkout" element={<RequireShopper><CheckoutPage /></RequireShopper>} />
          <Route path="/order/confirmation/:orderId" element={<RequireShopper><OrderConfirmationPage /></RequireShopper>} />
          <Route path="/account" element={<RequireShopper><CustomerAccountPage /></RequireShopper>} />
          <Route path="/account/orders" element={<RequireShopper><CustomerOrdersPage /></RequireShopper>} />
          <Route path="/account/orders/:id" element={<RequireShopper><CustomerOrderDetailPage /></RequireShopper>} />
          <Route path="/account/profile" element={<RequireShopper><CustomerProfilePage /></RequireShopper>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
