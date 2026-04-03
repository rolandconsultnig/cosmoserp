import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search, Package, Plus, Minus, User, UserCheck,
  CreditCard, Banknote, Smartphone, CheckCircle, Printer,
  RotateCcw, X, ShoppingCart, Tag, Percent, Hash,
  ChevronDown, Loader2, AlertCircle, Zap, Receipt, FileText, Mail, MessageCircle, Camera,
  Star, Award, QrCode, Menu, WifiIcon, WifiOffIcon, Bell, Filter, Grid3x3, List,
  ArrowLeft, MoreVertical, BarChart3, Settings
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

/* Mobile POS Constants */
const VAT_RATE = 0.075;
const MOBILE_BREAKPOINT = 768;

/* Mobile Color Palettes for Product Cards */
const MOBILE_CARD_PALETTES = [
  { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', iconBg: '#DBEAFE' },
  { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A', iconBg: '#DCFCE7' },
  { bg: '#FFF7ED', border: '#FED7AA', icon: '#EA580C', iconBg: '#FFEDD5' },
  { bg: '#FDF4FF', border: '#E9D5FF', icon: '#9333EA', iconBg: '#F3E8FF' },
  { bg: '#FFF1F2', border: '#FECDD3', icon: '#E11D48', iconBg: '#FFE4E6' },
  { bg: '#F0FDFA', border: '#99F6E4', icon: '#0D9488', iconBg: '#CCFBF1' },
];

function getMobilePalette(str = '') {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MOBILE_CARD_PALETTES[h % MOBILE_CARD_PALETTES.length];
}

export default function MobilePOSScreen() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const cartItemsRef = useRef([]);

  // Mock data for demonstration
  const [products] = useState([
    { id: 1, name: 'Nigerian Rice', price: 25000, stock: 50, category: 'Food', image: null },
    { id: 2, name: 'Dangote Cement', price: 4500, stock: 100, category: 'Building', image: null },
    { id: 3, name: 'Glo Recharge Card', price: 100, stock: 200, category: 'Services', image: null },
    { id: 4, name: 'Indomie Noodles', price: 500, stock: 150, category: 'Food', image: null },
    { id: 5, name: 'Peak Milk', price: 1200, stock: 80, category: 'Food', image: null },
    { id: 6, name: 'Coca-Cola', price: 200, stock: 120, category: 'Beverages', image: null },
  ]);

  const [cartItems, setCartItems] = useState([]);

  // Categories for mobile filter
  const categories = ['All', 'Food', 'Building', 'Services', 'Beverages', 'Electronics'];

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;

  // Cart management functions
  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    // Show cart feedback on mobile
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== productId));
    } else {
      setCartItems(prev => prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // Mobile POS Layout
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mobile-safe-area">
      
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="mobile-touch-target p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg text-gray-900">Point of Sale</h1>
              <p className="text-xs text-gray-500">Mixtio ERP Mobile</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Online Status Indicator */}
            <button className={`mobile-touch-target p-2 rounded-lg ${
              isOnline ? 'text-green-600' : 'text-orange-500'
            }`}>
              {isOnline ? <WifiIcon className="w-5 h-5" /> : <WifiOffIcon className="w-5 h-5" />}
            </button>
            
            {/* Notifications */}
            <button className="mobile-touch-target p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-5 h-5 text-gray-600" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>
            
            {/* User Menu */}
            <button className="mobile-touch-target p-2 hover:bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mobile-input pl-10 pr-12"
            placeholder="Search products..."
            autoFocus
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
            <Camera className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`mobile-touch-target px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500">
            {filteredProducts.length} products found
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* Products Grid/List */}
        <div className="flex-1 p-4 pb-24 lg:pb-4">
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="mobile-pos-grid">
              {filteredProducts.map(product => {
                const palette = getMobilePalette(product.name);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="mobile-pos-product group"
                    style={{ backgroundColor: palette.bg, borderColor: palette.border }}
                  >
                    {/* Product Image/Icon */}
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center" 
                         style={{ backgroundColor: palette.iconBg }}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <Package className="w-6 h-6" style={{ color: palette.icon }} />
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="text-center">
                      <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600">
                        {product.name}
                      </h3>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(product.price)}
                      </p>
                      
                      {/* Stock Status */}
                      {product.stock < 10 && (
                        <p className="text-xs text-orange-500 mt-1 font-medium">
                          Only {product.stock} left
                        </p>
                      )}
                      
                      {/* Add to Cart Indicator */}
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 text-blue-600 mx-auto" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-3">
              {filteredProducts.map(product => {
                const palette = getMobilePalette(product.name);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-500 hover:shadow-md mobile-transition flex items-center gap-4"
                  >
                    {/* Product Image/Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" 
                         style={{ backgroundColor: palette.bg, borderColor: palette.border, borderWidth: '2px' }}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <Package className="w-6 h-6" style={{ color: palette.icon }} />
                      )}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(product.price)}
                        </p>
                        {product.stock < 10 && (
                          <p className="text-xs text-orange-500 font-medium">
                            Only {product.stock} left
                          </p>
                        )}
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {product.category}
                        </span>
                      </div>
                    </div>
                    
                    {/* Add Button */}
                    <div className="flex items-center">
                      <Plus className="w-5 h-5 text-blue-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Sidebar */}
      <div className={`mobile-pos-cart ${isCartOpen ? 'open' : ''}`}>
        {/* Cart Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg">Current Sale</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="mobile-touch-target p-1 hover:bg-blue-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm opacity-90">
            {new Date().toLocaleDateString('en-NG', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Cart Items */}
        <div className="max-h-64 overflow-y-auto">
          {cartItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm">Add products to start selling</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <p className="text-gray-500 text-sm">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center mobile-touch-target"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center mobile-touch-target"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (7.5%)</span>
            <span className="font-medium">{formatCurrency(vat)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>

          {/* Payment Buttons */}
          {cartItems.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button className="mobile-btn-primary flex items-center justify-center gap-2 bg-green-600">
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button className="mobile-btn-primary flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>
              </div>
              
              <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 mobile-transition">
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Transfer & Other Options</span>
                </div>
              </button>

              <button
                onClick={clearCart}
                className="w-full py-2 text-red-600 text-sm font-medium hover:text-red-700"
              >
                Clear Cart
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="lg:hidden mobile-fab"
        style={{ bottom: cartItems.length > 0 ? '88px' : '24px' }}
      >
        <ShoppingCart className="w-6 h-6" />
        {cartItems.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        )}
      </button>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden mobile-bottom-nav">
        <button className="mobile-bottom-nav-item active">
          <Zap className="w-5 h-5" />
          <span>POS</span>
        </button>
        <button className="mobile-bottom-nav-item">
          <Package className="w-5 h-5" />
          <span>Products</span>
        </button>
        <button className="mobile-bottom-nav-item">
          <FileText className="w-5 h-5" />
          <span>Sales</span>
        </button>
        <button className="mobile-bottom-nav-item">
          <BarChart3 className="w-5 h-5" />
          <span>Reports</span>
        </button>
        <button className="mobile-bottom-nav-item">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <>
          <div className="mobile-overlay open" onClick={() => setIsMenuOpen(false)} />
          <div className="mobile-slide-menu open">
            {/* Menu content would go here */}
            <div className="p-4">
              <h2 className="font-bold text-lg mb-4">Menu</h2>
              {/* Menu items */}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
