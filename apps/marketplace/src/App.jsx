import { Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import useShopperAuthStore from './store/shopperAuthStore';
import VisitTracker from './components/VisitTracker';

const HomePage = lazy(() => import('./pages/HomePage'));
const ListingsPage = lazy(() => import('./pages/ListingsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const StorefrontPage = lazy(() => import('./pages/StorefrontPage'));
const LogisticsPartnersPage = lazy(() => import('./pages/LogisticsPartnersPage'));
const PartnersLoginPage = lazy(() => import('./pages/PartnersLoginPage'));
const CustomerAccountPage = lazy(() => import('./pages/CustomerAccountPage'));
const CustomerOrdersPage = lazy(() => import('./pages/CustomerOrdersPage'));
const CustomerEscrowPage = lazy(() => import('./pages/CustomerEscrowPage'));
const CustomerOrderDetailPage = lazy(() => import('./pages/CustomerOrderDetailPage'));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage'));
const CustomerSupportPage = lazy(() => import('./pages/CustomerSupportPage'));
const CustomerWalletPage = lazy(() => import('./pages/CustomerWalletPage'));
const CustomerSecurityPage = lazy(() => import('./pages/CustomerSecurityPage'));
const CustomerAddressesPage = lazy(() => import('./pages/CustomerAddressesPage'));
const CustomerTransportationPage = lazy(() => import('./pages/CustomerTransportationPage'));
const CustomerTrackGoodsPage = lazy(() => import('./pages/CustomerTrackGoodsPage'));
const PublicTrackPage = lazy(() => import('./pages/PublicTrackPage'));
const CustomerBudgetPage = lazy(() => import('./pages/CustomerBudgetPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const VerifyEmailSentPage = lazy(() => import('./pages/VerifyEmailSentPage'));
const CallCenterPage = lazy(() => import('./pages/CallCenterPage'));

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

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <VisitTracker />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/erp/*" element={<RedirectToErp />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ListingsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/store/:tenantId" element={<StorefrontPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/verify-email-sent" element={<VerifyEmailSentPage />} />
            <Route path="/services/call-center" element={<CallCenterPage />} />
            <Route path="/partners-login" element={<PartnersLoginPage />} />
            <Route path="/logistics" element={<LogisticsPartnersPage />} />
            <Route path="/track" element={<PublicTrackPage />} />
            <Route path="/track/:code" element={<PublicTrackPage />} />
            <Route path="/cart" element={<RequireShopper><CartPage /></RequireShopper>} />
            <Route path="/checkout" element={<RequireShopper><CheckoutPage /></RequireShopper>} />
            <Route path="/order/confirmation/:orderId" element={<RequireShopper><OrderConfirmationPage /></RequireShopper>} />
            <Route path="/account" element={<RequireShopper><CustomerAccountPage /></RequireShopper>} />
            <Route path="/account/orders" element={<RequireShopper><CustomerOrdersPage /></RequireShopper>} />
            <Route path="/account/escrow" element={<RequireShopper><CustomerEscrowPage /></RequireShopper>} />
            <Route path="/account/orders/:id" element={<RequireShopper><CustomerOrderDetailPage /></RequireShopper>} />
            <Route path="/account/profile" element={<RequireShopper><CustomerProfilePage /></RequireShopper>} />
            <Route path="/account/security" element={<RequireShopper><CustomerSecurityPage /></RequireShopper>} />
            <Route path="/account/addresses" element={<RequireShopper><CustomerAddressesPage /></RequireShopper>} />
            <Route path="/account/support" element={<RequireShopper><CustomerSupportPage /></RequireShopper>} />
            <Route path="/account/wallet" element={<RequireShopper><CustomerWalletPage /></RequireShopper>} />
            <Route path="/account/transportation" element={<RequireShopper><CustomerTransportationPage /></RequireShopper>} />
            <Route path="/account/track-goods" element={<RequireShopper><CustomerTrackGoodsPage /></RequireShopper>} />
            <Route path="/account/budget" element={<RequireShopper><CustomerBudgetPage /></RequireShopper>} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
