import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import api from '../lib/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Missing reset token. Please use the link from your email.');
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
      await api.post('/marketplace/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired link. Request a new reset.');
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

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Enter your new password (min 8 characters).</p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {token ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> New password
              </label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">Confirm password</label>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        ) : null}

        <p className="text-sm text-gray-600 mt-4">
          <Link to="/forgot-password" className="text-brand-600 hover:underline font-semibold">Request new link</Link>
          {' · '}
          <Link to="/login" className="text-brand-600 hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
