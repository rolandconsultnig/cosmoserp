import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Headphones } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { LOGO_URL } from '../lib/branding';

export default function LoginPage() {
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
            <img src={LOGO_URL} alt="Cosmos ERP" className="h-[23px] md:h-[26px] lg:h-[28px] w-auto object-contain" />
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
                id="erp-login-email"
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Email"
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
              <div className="text-right">
                <Link to="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline">Forgot password?</Link>
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

        </div>

        {/* Support & on-boarding staff: same ERP login — button centers attention below the card */}
        <div className="mt-6 flex flex-col items-center justify-center text-center px-2">
          <button
            type="button"
            onClick={() => {
              document.getElementById('erp-login-email')?.focus({ preventScroll: false });
              document.getElementById('erp-login-email')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white hover:bg-blue-50 text-slate-900 font-semibold text-sm px-6 py-3 shadow-lg border border-slate-200 transition-colors w-full max-w-sm"
          >
            <Headphones className="w-4 h-4 shrink-0 text-green-700" aria-hidden />
            Support &amp; On-boarding Agents — Sign in
          </button>
          <p className="text-blue-100/90 text-xs mt-2 max-w-md">
            Use your Cosmos staff email and password in the form above, then click <strong className="text-white">Sign In</strong>.
          </p>
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © 2024 Roland Consult · Cosmos ERP · NRS Compliant Platform
        </p>
      </div>
    </div>
  );
}
