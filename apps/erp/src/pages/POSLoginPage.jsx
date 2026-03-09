import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function POSLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      navigate('/pos/terminal');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div
            className="px-8 py-6 text-white"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 60%, #34D399 100%)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-black text-xl leading-tight">Point of Sale</div>
                <div className="text-emerald-100 text-xs">Cosmos ERP — Cashier Access</div>
              </div>
            </div>
            <p className="text-emerald-100 text-sm">
              Sign in to start selling. Manage sales, process payments, and print receipts.
            </p>
          </div>

          <div className="px-8 py-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Staff Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold rounded-xl py-2.5 text-sm transition-colors flex items-center justify-center gap-2 mt-2 text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Open Register'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-400">
                Need full ERP access?{' '}
                <Link to="/login" className="text-emerald-600 hover:underline font-medium">
                  Sign in to ERP →
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-emerald-200 text-xs mt-4 opacity-70">
          © {new Date().getFullYear()} Roland Consult · Cosmos ERP Platform
        </p>
      </div>
    </div>
  );
}
