import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

export default function CustomerSecurityPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [show, setShow] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.currentPassword || !form.newPassword) {
      setError('Current password and new password are required.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/marketplace/customer/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(data?.message || 'Password updated.');
      setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerAccountLayout active="security">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Security</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Security</h1>
      <p className="text-sm text-gray-500 mb-6">Change your password and keep your account secure.</p>

      <div className="card p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">Forgot your password?</div>
            <p className="text-sm text-gray-500 mt-1">
              You can request a reset link if you can’t remember your current password.
            </p>
            <Link to="/forgot-password" className="inline-block mt-2 text-sm font-semibold text-brand-600 hover:underline">
              Reset via email
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
            {success}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Current password
          </label>
          <div className="relative">
            <input
              className="input pr-10"
              type={show ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={update('currentPassword')}
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> New password
          </label>
          <input
            className="input"
            type="password"
            minLength={8}
            value={form.newPassword}
            onChange={update('newPassword')}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 8 characters.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5">Confirm new password</label>
          <input
            className="input"
            type="password"
            minLength={8}
            value={form.confirmNewPassword}
            onChange={update('confirmNewPassword')}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </CustomerAccountLayout>
  );
}

