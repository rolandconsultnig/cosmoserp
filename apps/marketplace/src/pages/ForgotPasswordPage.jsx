import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import api from '../lib/api';

const MKT_RESET_EMAIL_KEY = 'cosmos_mkt_reset_email';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      await api.post('/marketplace/auth/forgot-password', { email: normalized });
      sessionStorage.setItem(MKT_RESET_EMAIL_KEY, normalized);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Enter your email and we’ll send a 6-digit code to reset your password.</p>

        {sent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4 space-y-3">
            <p>If that email exists, a reset code has been sent. Check your inbox (and spam).</p>
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="w-full btn-buy py-3 rounded-xl font-bold text-sm"
            >
              Enter code &amp; new password
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
                {loading ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          </>
        )}

        <p className="text-sm text-gray-600 mt-4">
          <Link to="/login" className="text-brand-600 hover:underline font-semibold">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
