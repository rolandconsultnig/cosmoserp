import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import useShopperAuthStore from '../store/shopperAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useShopperAuthStore((s) => s.login);
  const resendVerification = useShopperAuthStore((s) => s.resendVerification);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const next = new URLSearchParams(location.search).get('next') || '/products';

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailNotVerified(null);
    setResendSuccess('');
    setLoading(true);
    try {
      const result = await login(form);
      if (!result.ok) {
        setError(result.error);
        if (result.code === 'EMAIL_NOT_VERIFIED') setEmailNotVerified(result.emailForResend || form.email);
        return;
      }
      navigate(next);
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    const email = emailNotVerified || form.email;
    if (!email) return;
    setResendLoading(true);
    setResendSuccess('');
    try {
      const result = await resendVerification(email);
      if (result.ok) setResendSuccess('Verification email sent. Check your inbox.');
      else setError(result.error);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer sign in</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in with your customer account to shop and checkout.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
            {emailNotVerified && (
              <button
                type="button"
                onClick={onResendVerification}
                disabled={resendLoading}
                className="block mt-2 text-brand-600 font-semibold hover:underline disabled:opacity-60"
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}
        {resendSuccess && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
            {resendSuccess}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input className="input" type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input className="input" type="password" value={form.password} onChange={update('password')} required />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">Sign In</button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          New customer?{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-semibold">
            Register as customer
          </Link>
        </p>
      </div>
    </div>
  );
}
