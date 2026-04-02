import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api from '../lib/api';

const MKT_RESET_EMAIL_KEY = 'cosmos_mkt_reset_email';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) return;
    const stored = sessionStorage.getItem(MKT_RESET_EMAIL_KEY);
    if (stored) setEmail(stored);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      if (token) {
        await api.post('/marketplace/auth/reset-password', { token, password });
      } else {
        const normalized = email.trim().toLowerCase();
        if (!normalized || !code.trim()) {
          setError('Email and 6-digit code are required.');
          setLoading(false);
          return;
        }
        await api.post('/marketplace/auth/reset-password', {
          email: normalized,
          code: code.trim(),
          password,
        });
        sessionStorage.removeItem(MKT_RESET_EMAIL_KEY);
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code. Request a new reset.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-gray-900">Password reset</h1>
          <p className="text-sm text-gray-500 mt-2">Redirecting you to sign in…</p>
        </div>
      </div>
    );
  }

  const otpMode = !token;

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-6 h-6 text-brand-600" />
          <h1 className="text-xl font-bold text-gray-900">Reset password</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          {otpMode
            ? 'Enter the 6-digit code from your email and your new password.'
            : 'Use the link from your email to set a new password.'}
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {otpMode && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Verification code</label>
                <input
                  className="input tracking-widest"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">New password</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Confirm password</label>
            <input
              className="input"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          <Link to="/forgot-password" className="text-brand-600 hover:underline font-semibold">Request new code</Link>
          <span className="mx-2 text-gray-300">·</span>
          <Link to="/login" className="text-brand-600 hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
