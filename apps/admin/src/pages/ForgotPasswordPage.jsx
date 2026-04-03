import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Zap, Mail } from 'lucide-react';
import api from '../lib/api';

const ADMIN_RESET_EMAIL_KEY = 'cosmos_admin_reset_email';

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
      await api.post('/auth/admin/forgot-password', { email: normalized });
      sessionStorage.setItem(ADMIN_RESET_EMAIL_KEY, normalized);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #08091A 0%, #0F1235 40%, #0A0C1F 100%)' }}
    >
      <div className="relative w-full max-w-[420px]">
        <div
          className="relative rounded-2xl overflow-hidden p-8"
          style={{
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          <div className="h-1.5 w-full -mx-8 -mt-8 mb-6" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }} />
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-[17px]">Mixtio Admin</div>
              <div className="text-[12px] text-slate-400">Reset your password</div>
            </div>
          </div>
          <h1 className="text-[24px] font-bold text-slate-900 mb-1">Forgot password?</h1>
          <p className="text-sm text-slate-500 mb-6">Enter your admin email and we’ll send a 6-digit reset code.</p>

          {sent ? (
            <div className="rounded-xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm mb-4 space-y-3">
              <p>If that email exists, a reset code has been sent. Check your inbox (and spam).</p>
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-sm"
                style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}
              >
                Enter code &amp; new password
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset code'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link to="/login" className="text-indigo-600 font-medium hover:underline text-sm">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
