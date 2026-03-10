import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone } from 'lucide-react';
import api from '../lib/api';
import useShopperAuthStore from '../store/shopperAuthStore';

export default function CustomerProfilePage() {
  const qc = useQueryClient();
  const { customer, setFromApi, isAuthenticated } = useShopperAuthStore();
  const [form, setForm] = useState({ fullName: '', phone: '' });

  useEffect(() => {
    if (customer) {
      setForm({ fullName: customer.fullName || '', phone: customer.phone || '' });
    }
  }, [customer?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/marketplace/customer/me', data),
    onSuccess: (_, variables) => {
      setFromApi(
        { ...customer, fullName: variables.fullName, phone: variables.phone },
        localStorage.getItem('mkt_token')
      );
      qc.invalidateQueries(['customer-me']);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ fullName: form.fullName.trim(), phone: form.phone.trim() || null });
  };

  if (!isAuthenticated || !customer) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Please sign in to edit your profile.</p>
        <Link to="/login?next=/account/profile" className="btn-buy inline-block mt-4 py-2.5 px-5 rounded-xl font-semibold text-sm">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Profile</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit profile</h1>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Mail className="w-4 h-4" /> {customer.email}
        </div>
        <p className="text-xs text-gray-400 mb-4">Email cannot be changed. Contact support if needed.</p>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
            <User className="w-3.5 h-3.5 text-brand-500" /> Full name
          </label>
          <input
            className="input w-full"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-500" /> Phone
          </label>
          <input
            className="input w-full"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        {updateMutation.error && (
          <p className="text-sm text-red-600">{updateMutation.error.response?.data?.error || 'Update failed'}</p>
        )}
        {updateMutation.isSuccess && (
          <p className="text-sm text-green-600">Profile updated.</p>
        )}
        <button
          type="submit"
          disabled={updateMutation.isLoading}
          className="w-full btn-buy py-3 rounded-xl font-bold text-sm disabled:opacity-60"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
