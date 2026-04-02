import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react';
import api from '../lib/api';

const ADMIN_RESET_EMAIL_KEY = 'cosmos_admin_reset_email';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) return;
    const stored = sessionStorage.getItem(ADMIN_RESET_EMAIL_KEY);
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
        await api.post('/auth/admin/reset-password', { token, password });
      } else {
        const normalized = email.trim().toLowerCase();
        if (!normalized || !code.trim()) {
          setError('Email and 6-digit code are required.');
          setLoading(false);
          return;
        }
        await api.post('/auth/admin/reset-password', {
          email: normalized,
          code: code.trim(),
          password,
        });
        sessionStorage.removeItem(ADMIN_RESET_EMAIL_KEY);
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Request a new code from Forgot password.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, #08091A 0%, #0F1235 40%, #0A0C1F 100%)' }}>
        <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden p-8" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 32px 80px rgba(0,0,0,0.50)' }}>
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h1 className="text-xl font-bold text-slate-900">Password reset</h1>
            <p className="text-slate-500 text-sm mt-2">Redirecting you to sign in…</p>
          </div>
        </div>
      </div>
    );
  }

  const otpMode = !token;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, #08091A 0%, #0F1235 40%, #0A0C1F 100%)' }}>
      <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden p-8" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 32px 80px rgba(0,0,0,0.50)' }}>
        <div className="h-1.5 w-full -mx-8 -mt-8 mb-6" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-[13px] flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-[17px]">Cosmos Admin</div>
            <div className="text-[12px] text-slate-400">Set new password</div>
          </div>
        </div>
        <h1 className="text-[24px] font-bold text-slate-900 mb-1">Set new password</h1>
        <p className="text-sm text-slate-500 mb-6">
          {otpMode
            ? 'Enter the 6-digit code from your email, then choose a new password.'
            : 'Enter your new password (min 8 characters).'}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {otpMode && (
            <>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Verification code</label>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm tracking-widest text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="6-digit code"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-sm disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-sm">
          <Link to="/forgot-password" className="text-indigo-600 font-medium hover:underline">Request new code</Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
