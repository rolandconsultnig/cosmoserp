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
import useShopperAuthStore from './store/shopperAuthStore';

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
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ListingsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/store/:tenantId" element={<StorefrontPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/logistics" element={<LogisticsPartnersPage />} />
          <Route path="/cart" element={<RequireShopper><CartPage /></RequireShopper>} />
          <Route path="/checkout" element={<RequireShopper><CheckoutPage /></RequireShopper>} />
          <Route path="/order/confirmation/:orderId" element={<RequireShopper><OrderConfirmationPage /></RequireShopper>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
