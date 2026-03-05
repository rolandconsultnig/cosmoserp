import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Eye, EyeOff, Loader2 } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@lagostrading.ng');
  const [password, setPassword] = useState('Demo@12345');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg leading-tight">Cosmos ERP</div>
              <div className="text-xs text-slate-500">Nigerian Business Management</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to your business account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@company.ng"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              New business?{' '}
              <Link to="/register" className="text-blue-600 font-medium hover:underline">Register here</Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-4 bg-blue-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-700 mb-1">Demo Credentials</div>
            <div className="text-xs text-blue-600">📧 demo@lagostrading.ng</div>
            <div className="text-xs text-blue-600">🔑 Demo@12345</div>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2024 Roland Consult · Cosmos ERP · NRS Compliant Platform
        </p>
      </div>
    </div>
  );
}
