import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import { LOGO_URL } from '../lib/branding';

export default function RegisterPage() {
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    city: '',
    state: '',
    businessType: 'LIMITED_LIABILITY',
    otp: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendOtp = async () => {
    setError('');
    setOtpHint('');
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError('Enter your business email first, then request a code.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/tenants/register/send-otp', { email });
      setCodeRequested(true);
      setOtpHint('Check your inbox for a 6-digit code (expires in 15 minutes).');
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not send code.';
      setError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    setError('');
    setOtpHint('');
    const email = form.email.trim().toLowerCase();
    if (!email) {
      setError('Enter your business email first.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/tenants/register/resend-otp', { email });
      setOtpHint('A new 6-digit code was sent. Check your inbox (expires in 15 minutes).');
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not resend code.';
      setError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        businessName: form.businessName,
        email: form.email.trim().toLowerCase(),
        phone: form.phone,
        password: form.password,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state,
        businessType: form.businessType,
        otp: form.otp.trim(),
      };
      await api.post('/tenants/register', payload);
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const states = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <div className="relative w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <img src={LOGO_URL} alt="Mixtio ERP" className="h-10 w-auto object-contain" />
            <div>
              <div className="font-bold text-slate-900 text-lg">Mixtio ERP</div>
              <div className="text-xs text-slate-500">Register Your Business</div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Start your free 5-day trial</h1>
          <p className="text-sm text-slate-500 mb-5">Verify your email with a one-time code, then create your account.</p>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
          {otpHint && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-3 text-sm mb-4">{otpHint}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
                <input required value={form.businessName} onChange={set('businessName')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Acme Trading Ltd" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Email *</label>
                <div className="flex gap-2">
                  <input type="email" required value={form.email} onChange={set('email')} className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@acme.ng" />
                  <button type="button" onClick={sendOtp} disabled={otpLoading} className="shrink-0 px-3 py-2.5 text-sm font-medium rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-60 whitespace-nowrap">
                    {otpLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Email code'}
                  </button>
                </div>
                {codeRequested && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Didn&apos;t get it?{' '}
                    <button
                      type="button"
                      onClick={resendOtp}
                      disabled={otpLoading}
                      className="text-blue-600 font-medium hover:underline disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email verification code *</label>
                <input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={form.otp} onChange={set('otp')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="6-digit code" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <input required value={form.phone} onChange={set('phone')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="08012345678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
                <select value={form.businessType} onChange={set('businessType')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LIMITED_LIABILITY">Limited Liability</option>
                  <option value="PUBLIC_LIMITED">Public Limited</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Business street address *</label>
                <input
                  required
                  minLength={5}
                  value={form.address}
                  onChange={set('address')}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="No. 12 Allen Avenue, Ikeja"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                <input required value={form.city} onChange={set('city')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Lagos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
                <select required value={form.state} onChange={set('state')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select State</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <input type="password" required minLength={8} value={form.password} onChange={set('password')} className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min 8 characters" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create Free Account'}
            </button>
          </form>
          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
