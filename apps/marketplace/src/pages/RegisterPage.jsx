import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Phone, User, MapPin, Loader2 } from 'lucide-react';
import useShopperAuthStore from '../store/shopperAuthStore';

const NG_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const register = useShopperAuthStore((s) => s.register);
  const sendRegisterOtp = useShopperAuthStore((s) => s.sendRegisterOtp);
  const resendRegisterOtp = useShopperAuthStore((s) => s.resendRegisterOtp);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    otp: '',
    deliveryRecipientName: '',
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
  });
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  /** Server has MARKETPLACE_DISABLE_EMAIL_VERIFICATION — no OTP required */
  const [omitOtp, setOmitOtp] = useState(false);
  const next = new URLSearchParams(location.search).get('next') || '/products';

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const sendOtp = async () => {
    setError('');
    setHint('');
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError('Enter your email first, then request a code.');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await sendRegisterOtp(email);
      if (!result.ok) {
        setError(result.error || 'Could not send code.');
        return;
      }
      if (result.disabled) {
        setOmitOtp(true);
        setHint('Email verification is off on this server — you can register without a code.');
        return;
      }
      setCodeRequested(true);
      setHint('Check your inbox for a 6-digit code (valid up to 24 hours).');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setHint('');
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await resendRegisterOtp(email);
      if (!result.ok) {
        setError(result.error || 'Could not resend code.');
        return;
      }
      if (result.disabled) {
        setOmitOtp(true);
        return;
      }
      setHint('A new code was sent. Check your inbox.');
    } finally {
      setOtpLoading(false);
    }
  };

  const submit = async (e) => {
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
    if (!form.deliveryAddress.trim() || form.deliveryAddress.trim().length < 5) {
      setError('Enter a full delivery street address (at least 5 characters).');
      return;
    }
    if (!form.deliveryCity.trim()) {
      setError('Delivery city is required.');
      return;
    }
    if (!form.deliveryState) {
      setError('Delivery state is required.');
      return;
    }
    if (!omitOtp && !form.otp.trim()) {
      setError('Request an email code and enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        deliveryRecipientName: form.deliveryRecipientName,
        deliveryAddress: form.deliveryAddress,
        deliveryCity: form.deliveryCity,
        deliveryState: form.deliveryState,
        otp: form.otp,
        omitOtp,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer registration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verify your email with a one-time code, then complete your profile and delivery address.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {hint && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
            {hint}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name *
            </label>
            <input className="input" value={form.fullName} onChange={update('fullName')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email *
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 min-w-0"
                type="email"
                value={form.email}
                onChange={update('email')}
                required
              />
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpLoading}
                className="shrink-0 px-3 py-2.5 text-xs font-semibold rounded-xl border-2 border-brand-600 text-brand-600 hover:bg-brand-50 disabled:opacity-60 whitespace-nowrap"
              >
                {otpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Email code'}
              </button>
            </div>
            {codeRequested && !omitOtp && (
              <p className="mt-1.5 text-xs text-gray-500">
                Didn&apos;t get it?{' '}
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={otpLoading}
                  className="text-brand-600 font-semibold hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </p>
            )}
          </div>

          {!omitOtp && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email verification code *</label>
              <input
                className="input tracking-widest"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={form.otp}
                onChange={update('otp')}
                placeholder="6-digit code"
                required={!omitOtp}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input className="input" value={form.phone} onChange={update('phone')} placeholder="For delivery updates" />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Default delivery address *
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Recipient name (optional)</label>
                <input
                  className="input"
                  value={form.deliveryRecipientName}
                  onChange={update('deliveryRecipientName')}
                  placeholder="Defaults to your full name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Street address *</label>
                <input
                  className="input"
                  required
                  minLength={5}
                  value={form.deliveryAddress}
                  onChange={update('deliveryAddress')}
                  placeholder="House no., street, area"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">City *</label>
                <input className="input" required value={form.deliveryCity} onChange={update('deliveryCity')} placeholder="Lagos" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1.5 block">State *</label>
                <select
                  className="input"
                  required
                  value={form.deliveryState}
                  onChange={update('deliveryState')}
                >
                  <option value="">Select state</option>
                  {NG_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password *
            </label>
            <input className="input" type="password" value={form.password} onChange={update('password')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Confirm Password *
            </label>
            <input className="input" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
            {loading ? 'Creating account…' : 'Register as customer'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Already have a customer account?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
