import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Zap, Lock, Mail, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail]       = useState('sam@afrinict.net');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }   = useAuthStore();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #08091A 0%, #0F1235 40%, #0A0C1F 100%)' }}
    >
      {/* ── Ambient glow orbs ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600, height: 600,
          top: '-20%', left: '-10%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          animation: 'orb 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500,
          bottom: '-15%', right: '-5%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          animation: 'orb 15s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300, height: 300,
          top: '40%', right: '25%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          animation: 'orb 20s ease-in-out infinite',
        }}
      />

      {/* ── Subtle dot grid ── */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── Card ── */}
      <div className="relative w-full max-w-[420px] animate-slide-up">
        {/* Top glow ring behind card */}
        <div
          className="absolute -inset-1 rounded-3xl opacity-30 blur-xl pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        />

        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* Gradient header strip */}
          <div
            className="h-1.5 w-full"
            style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)' }}
          />

          <div className="p-8">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-11 h-11 rounded-[13px] flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-[17px] leading-tight tracking-tight">
                  Cosmos Admin
                </div>
                <div className="text-[12px] text-slate-400 font-medium">Roland Consult Platform</div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-tight">
                Super Admin Portal
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Restricted access — authorised personnel only
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sam@afrinict.net"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm
                               text-slate-900 placeholder:text-slate-400 bg-slate-50/50
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500
                               focus:bg-white transition-all duration-150"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-11 py-2.5 text-sm
                               text-slate-900 placeholder:text-slate-400 bg-slate-50/50
                               focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500
                               focus:bg-white transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold
                           rounded-xl py-3 text-sm transition-all duration-150 mt-2 disabled:opacity-60"
                style={{
                  background: loading ? '#818cf8' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  boxShadow: loading ? 'none' : '0 2px 8px rgba(79,70,229,0.35), 0 8px 24px rgba(79,70,229,0.18)',
                }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In to Portal'}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[12px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
              <span>256-bit encrypted · Roland Consult proprietary system</span>
            </div>
          </div>
        </div>

        <p className="text-center text-white/25 text-[12px] mt-5">
          © {new Date().getFullYear()} Roland Consult · Cosmos ERP Platform
        </p>
      </div>
    </div>
  );
}
