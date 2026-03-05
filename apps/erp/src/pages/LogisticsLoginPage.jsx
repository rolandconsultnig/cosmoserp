import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Eye, EyeOff, Loader2, Shield, Building2, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5133/api';

export default function LogisticsLoginPage() {
  const [mode, setMode] = useState('agent'); // 'agent' | 'company'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'agent' ? '/logistics/agents/login' : '/logistics/companies/login';
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Store logistics auth
      localStorage.setItem('logistics_token', data.data.token);
      localStorage.setItem('logistics_type', mode);
      if (mode === 'agent') {
        localStorage.setItem('logistics_agent', JSON.stringify(data.data.agent));
      } else {
        localStorage.setItem('logistics_company', JSON.stringify(data.data.company));
      }

      navigate('/logistics/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
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
            style={{ background: 'linear-gradient(135deg, #0052CC 0%, #6366F1 60%, #8B5CF6 100%)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-black text-xl leading-tight">Logistics Portal</div>
                <div className="text-blue-200 text-xs">Cosmos ERP — Delivery Partner Access</div>
              </div>
            </div>
            <p className="text-blue-100 text-sm">
              Sign in to manage deliveries, track shipments, and view your earnings.
            </p>
          </div>

          <div className="px-8 py-6">
            {/* Mode toggle */}
            <div className="flex gap-2 mb-5 bg-slate-100 rounded-xl p-1">
              {[
                { id: 'agent', label: 'Delivery Agent', icon: User },
                { id: 'company', label: 'Company', icon: Building2 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setMode(id); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    mode === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-start gap-2">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {mode === 'agent' ? 'Agent Email' : 'Company Email'}
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'agent' ? 'agent@logistics.ng' : 'admin@logistics.ng'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
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
                style={{ background: 'linear-gradient(135deg, #0052CC, #6366F1)' }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-400">
                New logistics partner?{' '}
                <Link to="/logistics-register" className="text-blue-600 hover:underline font-medium">
                  Register here →
                </Link>
              </p>
              <p className="text-xs text-slate-400">
                Need ERP access?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in to ERP →
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4 opacity-70">
          © {new Date().getFullYear()} Roland Consult · Cosmos ERP Platform
        </p>
      </div>
    </div>
  );
}
