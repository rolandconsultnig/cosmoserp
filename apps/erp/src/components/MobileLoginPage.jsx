import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, EyeOff, Loader2, Headphones, Mail, Lock, Fingerprint, 
  Chrome, Smartphone, Menu, X, ChevronRight, Plus 
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import useAuthStore from '../store/authStore';
import { LOGO_URL } from '../lib/branding';

export default function MobileLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { login, biometricUnlock } = useAuthStore();
  const navigate = useNavigate();

  // Check for biometric support
  useEffect(() => {
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() !== 'web';
    if (isNative) {
      setBiometricAvailable(true);
      return;
    }

    if (typeof window.PublicKeyCredential !== 'undefined' && 'credentials' in navigator) {
      setBiometricAvailable(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await login(email, password);
      const role = data?.user?.role;
      
      // Role-based navigation with mobile-optimized routes
      if (role === 'FIELD_AGENT') {
        navigate('/field-agent');
      } else if (role === 'CRM_MANAGER') {
        navigate('/crm');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) return;

    try {
      setError('');
      setLoading(true);

      const me = await biometricUnlock();
      const role = me?.user?.role;
      if (role === 'FIELD_AGENT') {
        navigate('/field-agent');
      } else if (role === 'CRM_MANAGER') {
        navigate('/crm');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err?.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 mobile-safe-area">
      {/* Background pattern with mobile optimization */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
             backgroundSize: '32px 32px' 
           }} 
      />

      {/* Mobile Header */}
      <div className="relative z-10 pt-12 pb-8 px-6">
        <div className="text-center">
          {/* Logo with mobile optimization */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-lg">
              <img src={LOGO_URL} alt="Cosmos ERP" className="h-12 w-auto" />
            </div>
          </div>
          
          {/* Mobile-optimized typography */}
          <h1 className="mobile-heading-fluid text-white text-center mb-3">
            Welcome Back
          </h1>
          <p className="text-blue-100 text-center text-lg mobile-text-fluid">
            Sign in to your Nigerian business
          </p>
        </div>
      </div>

      {/* Mobile Form Card */}
      <div className="relative z-10">
        <div className="bg-white rounded-t-3xl shadow-2xl min-h-screen px-6 py-8">
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-4 text-sm mb-6 mobile-slide-down">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Email Input with mobile optimization */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="mobile-input-with-icon">
                <Mail className="icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mobile-input"
                  placeholder="Enter your email"
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            {/* Password Input with mobile optimization */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="mobile-input-with-icon">
                <Lock className="icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mobile-input pr-16"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 mobile-touch-target"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Biometric & Forgot Password Row */}
            <div className="flex items-center justify-between py-3">
              {biometricAvailable && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mobile-touch-target p-2 rounded-lg hover:bg-blue-50 mobile-transition"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span className="text-sm font-medium">Use fingerprint</span>
                </button>
              )}
              
              {/* Always show Forgot Password prominently */}
              <Link 
                to="/forgot-password" 
                className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 mobile-touch-target p-2 rounded-lg hover:bg-blue-50 mobile-transition"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm">Forgot password?</span>
              </Link>
            </div>

            {/* Mobile-optimized Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mobile-btn-primary w-full flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Social Login Section */}
          <div className="mt-8">
            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-2xl hover:bg-gray-50 hover:border-gray-400 mobile-transition">
                <Chrome className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-semibold">Google</span>
              </button>
              
              <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-2xl hover:bg-gray-50 hover:border-gray-400 mobile-transition">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold">Microsoft</span>
              </button>
            </div>
          </div>

          {/* Register Link - Enhanced */}
          <div className="mt-6 text-center bg-blue-50 p-4 rounded-2xl">
            <p className="text-gray-700 text-sm font-medium mb-3">
              🇳🇬 New to CosmosERP?
            </p>
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 mobile-transition mobile-touch-target"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Account</span>
            </Link>
          </div>

          {/* Forgot Password - Enhanced */}
          <div className="mt-4 text-center">
            <Link 
              to="/forgot-password" 
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 mobile-touch-target py-2"
            >
              <Lock className="w-4 h-4" />
              <span>Forgot your password?</span>
            </Link>
          </div>

          {/* Mobile App Features */}
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-4 rounded-2xl">
              <Smartphone className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-gray-700 font-medium">Mobile POS</p>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl">
              <Headphones className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-gray-700 font-medium">24/7 Support</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl">
              <Fingerprint className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-gray-700 font-medium">Secure Login</p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Credentials Helper (for development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 z-20">
          <p className="text-xs text-yellow-800 font-medium mb-2">Demo Credentials:</p>
          <p className="text-xs text-yellow-700">Email: demo@cosmoserp.ng</p>
          <p className="text-xs text-yellow-700">Password: demo123</p>
        </div>
      )}
    </div>
  );
}
