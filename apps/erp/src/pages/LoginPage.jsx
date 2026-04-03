import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { LOGO_URL } from '../lib/branding';
import api from '../lib/api';

function randomBytes(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function b64ToBuf(base64url) {
  const base64 = String(base64url || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function bufToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const { login, setSession } = useAuthStore();
  const navigate = useNavigate();

  const isSecureContext = useMemo(() => window.isSecureContext || window.location.hostname === 'localhost', []);

  useEffect(() => {
    let active = true;
    async function detectBiometric() {
      try {
        const supported =
          typeof window.PublicKeyCredential !== 'undefined' &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
          isSecureContext;
        if (!supported) return;
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (active) setBioReady(Boolean(available));
      } catch {
        if (active) setBioReady(false);
      }
    }
    detectBiometric();
    return () => {
      active = false;
    };
  }, [isSecureContext]);

  const onLoginSuccess = (data) => {
    const role = data?.user?.role;
    if (role === 'FIELD_AGENT') navigate('/field-agent');
    else if (role === 'CRM_MANAGER') navigate('/crm');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      onLoginSuccess(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!bioReady || bioLoading) return;
    setError('');
    setBioLoading(true);
    try {
      if (!email) {
        setError('Enter your email to use passkey sign-in.');
        return;
      }

      const { data: optRes } = await api.post('/auth/webauthn/authenticate/options', { email });
      const options = optRes?.options;
      if (!options) {
        setError('Could not start passkey sign-in.');
        return;
      }

      const publicKey = {
        ...options,
        challenge: b64ToBuf(options.challenge),
        allowCredentials: Array.isArray(options.allowCredentials)
          ? options.allowCredentials.map((c) => ({
              ...c,
              id: b64ToBuf(c.id),
            }))
          : undefined,
      };

      const cred = await navigator.credentials.get({ publicKey });
      if (!cred) {
        setError('No credential returned.');
        return;
      }

      const assertion = {
        id: cred.id,
        rawId: bufToB64(cred.rawId),
        type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults?.() || {},
        response: {
          authenticatorData: bufToB64(cred.response.authenticatorData),
          clientDataJSON: bufToB64(cred.response.clientDataJSON),
          signature: bufToB64(cred.response.signature),
          userHandle: cred.response.userHandle ? bufToB64(cred.response.userHandle) : null,
        },
      };

      const { data } = await api.post('/auth/webauthn/authenticate/verify', { email, response: assertion });
      await setSession(data);
      onLoginSuccess(data);
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        setError('Biometric sign-in was cancelled or timed out.');
      } else if (err?.name === 'NotSupportedError') {
        setError('Biometric sign-in is not supported on this device/browser.');
      } else {
        setError(err?.response?.data?.error || 'Biometric sign-in failed. Use email and password.');
      }
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(59,130,246,0.22),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-10">
        <section className="hidden lg:block">
          <div className="max-w-xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Trusted ERP for modern Nigerian businesses
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Operate smarter with <span className="text-sky-300">Mixtio</span>
            </h1>
            <p className="mt-4 text-sm leading-6 text-blue-100/95">
              Manage finance, inventory, payroll, CRM, and operations from one secure workspace built for scale.
            </p>

            <div className="mt-8 space-y-3 text-sm">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                Secure access with role-based controls and auditability.
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                Optional biometric verification for supported devices.
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                Optimized UX for desktop, field, and mobile teams.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <img src={LOGO_URL} alt="Mixtio logo" className="h-10 w-auto object-contain" />
              <div>
                <div className="text-lg font-bold leading-tight text-slate-900">Mixtio</div>
                <div className="text-xs text-slate-500">Business Operating Platform</div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to continue to your workspace.</p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Work email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-10 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || bioLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              disabled={!bioReady || loading || bioLoading}
              onClick={handleBiometricLogin}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {bioLoading ? 'Verifying biometrics...' : 'Use biometrics'}
            </button>
            {!bioReady && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Biometric sign-in is available on secure supported devices and browsers.
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-500">
                New business?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:underline">
                  Register here
                </Link>
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                <span>Support and on-boarding staff use the same secure sign-in.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
