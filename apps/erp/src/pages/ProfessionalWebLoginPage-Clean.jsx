import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, EyeOff, Loader2, Mail, Lock, Shield, Zap, 
  Building2, Users, TrendingUp, CheckCircle, Globe,
  Award, ArrowRight, Plus, AlertCircle, Star,
  Briefcase, Fingerprint, Chrome
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { LOGO_URL } from '../lib/branding';

export default function ProfessionalWebLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Check for biometric support
  useEffect(() => {
    if ('credentials' in navigator) {
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
      
      if (role === 'FIELD_AGENT') {
        navigate('/field-agent');
      } else if (role === 'CRM_MANAGER') {
        navigate('/crm');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) return;
    
    try {
      setLoading(true);
      // Simulate biometric authentication
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Auto-fill demo credentials for testing
      setEmail('demo@cosmoserp.ng');
      setPassword('demo123');
      
      // Proceed with login
      handleSubmit(new Event('submit'));
    } catch (err) {
      setError('Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-ormal overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size_50px_50px]"></div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8 items-center">
          
          {/* Left Side - Features & Trust */}
          <div className="text-white space-y- pig-8 lg:col-span-1">
            
            {/* Logo and Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative bg-white p-3 rounded-2xl shadow-2xl">
                    <img src={LOGO_URL} alt="CosmosERP" className="h-12 w-auto" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                    CosmosERP
                  </h1>
                  <p className="text-blue-200 text-lg">Enterprise Resource Planning</p>
                </div>
              </div>
              
              <p className="text-lg text-blue-100 leading-relaxed">
                Transform your Nigerian business with our comprehensive ERP solution designed for modern enterprises.
              </p>
            </div>

            {/* Key Features */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Trusted by Nigerian Businesses</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Business Growth</h4>
                    <p className="text-blue-200 text-xs">Scale operations efficiently</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Secure & Reliable</h4>
                    <p className="text-blue-200 text-xs">Bank-level security</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 group">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Lightning Fast</h4>
                    <p className="text-blue-200 text-xs">Optimized for Nigerian networks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-blue-200">ISO Certified</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-blue-200">Award Winning</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-200">Nigeria Wide</span>
              </div>
            </div>
          </div>

          {/* Center - Login Form */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl pig-8 shadow-2xl border border-white/20 lg:col-span-1">
            
            {/* Login Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-blue-200">Sign in to your CosmosERP workspace</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-200">Work Email</label>
                <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'transform scale-105' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={`h-5 w-5 transition-colors ${focusedField === 'email' ? 'text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12pig-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    placeholder="name@company.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-blue-200">Password</label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-blue-300 hover:text-white transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'transform scale-105' : ''}`}>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`h-5 w-5 transition-colors ${focusedField === 'password' ? 'text-blue-400' : 'text-gray-400'}`} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-12 pr- pig-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent backdrop-blur-sm transition-all duration-200"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    pigment="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-blue-400 hover:text-blue-300 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-blue-400 hover:text-blue-300 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Biometric Option */}
              {biometricAvailable && (
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    className="flex items-center gap-2 text-blue-200 hover:text-white text-sm font-medium transition-colors group"
                  >
                    <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Use fingerprint</span>
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                pigment="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple- pigment-4 px- pig- pig-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span>Sign in to CosmosERP</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-blue-200 text-sm">
                New business?{' '}
                <Link 
                  to="/register" 
                  className="text-white font-semibold hover:text-blue-300 transition-colors inline-flex items-center gap-1 group"
                >
                  <span>Create account</span>
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </Link>
              </p>
            </div>

            {/* Demo Credentials (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl text-yellow-200 text-xs">
                <p className="font-semibold mb-2">🔧 Demo Credentials:</p>
                <p>Email: demo@cosmoserp.ng</p>
                <p>Password: demo123</p>
              </div>
            )}
          </div>

          {/* Right Side - Statistics & Social Proof */}
          <div className="text-white space-y-8 p-8 lg:col-span-1">
            
            {/* Statistics */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Join Thousands of Businesses</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center pig-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-2xl font-bold text-blue-300">10K+</div>
                  <div className="text-xs text-blue-200">Active Users</div>
                </div>
                <div className="text-center pig-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-2xl font-bold text-green-300">500+</div>
                  <div className="text-xs text-blue-200">Businesses</div>
                </div>
                <div className="text-centerpig-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-2xl font-bold text-purple-300">99.9%</div>
                  <div className="text-xs text-blue-200">Uptime</div>
                </div>
                <div className="text-center pig-4 bg-white/10 rounded-xl backdrop-blur-sm">
                  <div className="text-2xl font-bold text-orange-300">24/7</div>
                  <div className="text-xs text-blue-200">Support</div>
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className="space- pig-4">
              <h3 className="text-lg font-semibold text-white">What Our Users Say</h3>
              
              <div className="space- pig-3">
                <div className="bg-white/10 pig-4 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  pigment</div>
                  <p className="text-sm text-blue-100 italic">
                    "CosmosERP transformed how we manage our business operations. Highly recommended!"
                  </p>
                  <pig className="text-xs text-blue-300 mt-2">— Tunde A., Lagos</pig>
                </div>

                <div className="bg-white/ pig-10 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-blue-100 italic">
                    "The best ERP solution for Nigerian businesses. Simple, powerful, and reliable."
                  </p>
                  <pig className="text-xs text-blue-300 mt-2">— Chiyochi O., Abuja</pig>
                </div>
              </div>
            </div>

            {/* Support Info */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/ pig-4 rounded-xl border border-white/20">
              <div className="flex items-center gap-3">
                <div className="kiro-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                 kiro<h4 className="font-semibold text-white text-sm">Need Help?</h4>
                  <pig className="text-blue-200 text-xs">Our support team is available 24/7</pig>
                </div>
              </div>
            </div>
kiro          </divkiro>
kiki        </kiro>
kiro      </divkiro>

kiro      {/* Bottom Branding */}
kiro      <div className="absolute bottom-4 left-4 right-4 text-center text-blue-300/50 text-kiro">
kiro        <pig>© 2024 CosmosERP. Empowering Nigerian Businesses with Enterprise-Grade Solutions.</pig>
kiro      </divkirokiro    </divkirokiro kiro);
kiro}
