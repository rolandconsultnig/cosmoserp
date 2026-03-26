import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import { LOGO_URL } from '../lib/branding';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="Cosmos ERP" className="h-10 w-auto object-contain" />
            <div>
              <div className="font-bold text-slate-900 text-lg leading-tight">Cosmos ERP</div>
              <div className="text-xs text-slate-500">Reset your password</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h1>
          <p className="text-slate-500 text-sm mb-6">Enter your email and we’ll send you a link to reset your password.</p>

          {sent ? (
            <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm mb-4">
              If that email exists, a reset link has been sent. Check your inbox (and spam).
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <Link to="/login" className="text-blue-600 font-medium hover:underline text-sm">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
