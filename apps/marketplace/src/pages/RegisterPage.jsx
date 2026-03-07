import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Phone, User } from 'lucide-react';
import useShopperAuthStore from '../store/shopperAuthStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const register = useShopperAuthStore((s) => s.register);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const next = new URLSearchParams(location.search).get('next') || '/products';

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const result = register(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(next);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">Buyer registration</h1>
        <p className="text-sm text-gray-500 mt-1">Create an account to shop, add to cart, and checkout on the marketplace.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Full Name
            </label>
            <input className="input" value={form.fullName} onChange={update('fullName')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <input className="input" type="email" value={form.email} onChange={update('email')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <input className="input" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input className="input" type="password" value={form.password} onChange={update('password')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Confirm Password
            </label>
            <input className="input" type="password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
          </div>
          <button type="submit" className="w-full btn-buy py-3 rounded-xl font-bold text-sm">Register as buyer</button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Already have a buyer account?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-brand-600 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
