import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck, Eye, EyeOff, Loader2, Shield, Building2, User, InfoIcon,
  MapPin, Clock3, CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/?$/, '') : '';
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path.startsWith('/') ? path : `/${path}`}` : `/api${path.startsWith('/') ? path : `/${path}`}`);

export default function LogisticsLoginPage() {
  const [mode, setMode] = useState('agent'); // 'agent' | 'company'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'agent' ? '/logistics/agents/login' : '/logistics/companies/login';
      const res = await fetch(apiUrl(endpoint), {
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

      navigate(mode === 'company' ? '/logistics/company' : '/logistics/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/CosmosERP.png" alt="Cosmos ERP" className="h-9 w-9 rounded-md object-cover border border-slate-200" />
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Cosmos ERP</p>
              <p className="text-xs text-slate-500 mt-1 leading-none">Logistics Portal</p>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Shield className="w-3.5 h-3.5" />
              Secure Sign-In
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
              <Truck className="w-3.5 h-3.5" />
              Operations Access
            </div>

            <h1 className="mt-5 text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Logistics control in one place
            </h1>

            <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed max-w-md">
              Sign in as a delivery agent or logistics company to manage dispatch, monitor active deliveries, and keep teams aligned.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: MapPin, text: 'Route and dispatch coordination' },
                { icon: Clock3, text: 'Live status and timeline updates' },
                { icon: CheckCircle2, text: 'Proof-of-delivery workflows' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <item.icon className="w-4 h-4 text-slate-700" />
                  <p className="text-sm text-slate-700">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 text-xs text-slate-500 border-t border-slate-200 pt-4">
              Need account setup? Contact your logistics administrator.
            </div>
          </section>

          <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <img src="/CosmosERP.png" alt="Cosmos ERP" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Portal Login</h2>
                  <p className="text-sm text-slate-500 mt-1">Sign in with your registered credentials</p>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-8">
              <div className="mb-7">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Login as</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'agent', label: 'Delivery Agent', icon: User, desc: 'Individual delivery partner' },
                    { id: 'company', label: 'Logistics Company', icon: Building2, desc: 'Fleet or enterprise account' },
                  ].map(({ id, label, icon: Icon, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setMode(id); setError(''); setShowHint(null); }}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                        mode === id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${mode === id ? 'text-white' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-semibold text-sm">{label}</div>
                        <div className={`text-xs mt-0.5 ${mode === id ? 'text-slate-200' : 'text-slate-500'}`}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Login failed</p>
                    <p className="text-xs mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      {mode === 'agent' ? 'Agent Email' : 'Company Email'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHint(showHint === 'email' ? null : 'email')}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <InfoIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {showHint === 'email' && (
                    <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      Use the email address registered with your {mode === 'agent' ? 'delivery agent' : 'company'} account.
                    </div>
                  )}

                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowHint(showHint === 'password' ? null : 'password')}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <InfoIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {showHint === 'password' && (
                    <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      Enter the password created during account registration.
                    </div>
                  )}

                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 text-white disabled:opacity-60 bg-slate-900 hover:bg-slate-800"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Access Logistics Portal'
                  )}
                </button>
              </form>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm border-t border-slate-200 pt-5">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-600">
                  New partner?{' '}
                  <Link to="/logistics-register" className="text-slate-900 font-semibold hover:underline">
                    Register now
                  </Link>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-600">
                  Need ERP access?{' '}
                  <Link to="/login" className="text-slate-900 font-semibold hover:underline">
                    Go to ERP login
                  </Link>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                © {new Date().getFullYear()} Roland Consult · Cosmos ERP Logistics
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
