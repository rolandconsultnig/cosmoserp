import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Headphones, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.16),transparent_35%),radial-gradient(circle_at_85%_0%,rgba(37,99,235,0.24),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md lg:grid-cols-2">
          <section className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-blue-900 via-blue-800 to-sky-700 p-10 text-white lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Enterprise-ready Nigerian business platform
              </div>
              <h2 className="mt-6 text-3xl font-semibold leading-tight">
                Welcome to
                {' '}
                <span className="text-sky-200">CosmosERP</span>
              </h2>
              <p className="mt-4 max-w-md text-sm text-blue-100">
                Manage operations, finance, HR, and customer workflows from a single secure workspace.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-sky-200" />
                Secure sign-in with role-based access control
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <Headphones className="h-4 w-4 shrink-0 text-emerald-200" />
                Support and on-boarding agents use the same login
              </div>
            </div>
          </section>

          <section className="bg-white p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex items-center gap-3">
                <img src={LOGO_URL} alt="CosmosERP logo" className="h-8 w-auto object-contain sm:h-9" />
                <div>
                  <div className="text-lg font-bold leading-tight text-slate-900">CosmosERP</div>
                  <div className="text-xs text-slate-500">Business Operating Platform</div>
                </div>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Sign in</h1>
              <p className="mt-1 text-sm text-slate-500">Access your ERP workspace securely.</p>

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Work email</label>
                  <input
                    id="erp-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">Password</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Signing in...' : 'Sign in to CosmosERP'}
                </button>
              </form>

              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden />
                  <p>
                    Support or on-boarding staff can sign in with their Cosmos staff email and password.
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                <p className="text-sm text-slate-500">
                  New business?
                  {' '}
                  <Link to="/register" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
