import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Phone, User, CheckCircle2, Loader } from 'lucide-react';
import api from '../lib/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Registration flow state
  const [step, setStep] = useState(1); // 1: Name+Email, 2: OTP Verification, 3: Password+Phone
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  
  const next = new URLSearchParams(location.search).get('next') || '/products';

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!form.email || !form.email.trim()) {
      setError('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Send OTP via email
      await api.post('/marketplace/auth/register/send-otp', {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
      });

      setStep(2);
      setOtpResendCountdown(60);
      
      // Countdown timer for resend
      const interval = setInterval(() => {
        setOtpResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to send OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.otp || !form.otp.trim()) {
      setError('OTP is required.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/marketplace/auth/verify-email', {
        email: form.email.trim().toLowerCase(),
        token: form.otp.trim(),
      });

      // OTP verified, move to password step
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/marketplace/auth/register/complete', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });

      if (response.data?.accessToken) {
        // Store token in localStorage or auth store
        localStorage.setItem('marketplace_token', response.data.accessToken);
        navigate(next);
      } else {
        setError('Registration completed but token not received');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Enter Full Name & Email
  if (step === 1) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Shop on Cosmos Marketplace</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleSendOtp}>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name *
              </label>
              <input
                className="input"
                value={form.fullName}
                onChange={update('fullName')}
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email *
              </label>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="your@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" /> Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>

          <p className="text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Verify Email</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            We sent an OTP to <strong>{form.email}</strong>
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleVerifyOtp}>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">Enter OTP Code *</label>
              <input
                className="input text-center text-xl tracking-widest"
                value={form.otp}
                onChange={update('otp')}
                placeholder="000000"
                maxLength="6"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the 6-digit code. It expires in 5 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" /> Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>
          </form>

          <button
            onClick={handleSendOtp}
            disabled={otpResendCountdown > 0 || loading}
            className="w-full mt-3 px-4 py-2 text-sm text-brand-600 hover:text-brand-700 disabled:text-gray-400 font-medium"
          >
            {otpResendCountdown > 0 ? `Resend OTP in ${otpResendCountdown}s` : 'Resend OTP'}
          </button>

          <button
            onClick={() => {
              setStep(1);
              setError('');
            }}
            className="w-full mt-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            ← Use different email
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Password & Complete Registration
  if (step === 3) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-gray-900">Set Password</h1>
          <p className="text-sm text-gray-500 mt-1">Secure your account with a strong password</p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-5 space-y-4" onSubmit={handleCompleteRegistration}>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone (Optional)
              </label>
              <input
                className="input"
                value={form.phone}
                onChange={update('phone')}
                placeholder="+234..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Password *
              </label>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Min. 8 characters"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Confirm Password *
              </label>
              <input
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                placeholder="Confirm password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" /> Creating account...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Email: <strong>{form.email}</strong>
          </p>
        </div>
      </div>
    );
  }
}
