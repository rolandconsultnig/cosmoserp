import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Camera, Loader2 } from 'lucide-react';
import api from '../lib/api';
import useShopperAuthStore from '../store/shopperAuthStore';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

export default function CustomerProfilePage() {
  const qc = useQueryClient();
  const { customer, setFromApi, isAuthenticated } = useShopperAuthStore();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (customer) {
      setForm({ fullName: customer.fullName || '', phone: customer.phone || '' });
    }
  }, [customer?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.patch('/marketplace/customer/me', data),
    onSuccess: (response) => {
      const updated = response?.data?.data;
      if (updated) {
        setFromApi(updated, localStorage.getItem('mkt_token'));
      }
      qc.invalidateQueries(['customer-me']);
    },
  });

  const submit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ fullName: form.fullName.trim(), phone: form.phone.trim() || null });
  };

  const onAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/marketplace/customer/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatarUrl = data?.data?.avatarUrl;
      if (avatarUrl) {
        // update auth store + invalidate me
        setFromApi(
          { ...customer, avatarUrl },
          localStorage.getItem('mkt_token')
        );
        qc.invalidateQueries(['customer-me']);
      }
    } catch {
      // minimal: could show toast; keeping silent to avoid extra state
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
    <CustomerAccountLayout active="profile">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Profile</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit profile</h1>

      <div className="grid gap-6 md:grid-cols-[280px,minmax(0,1fr)] items-start">
        <div className="card p-5">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={onAvatarClick}
              className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center group"
            >
              {customer.avatarUrl ? (
                <img
                  src={customer.avatarUrl}
                  alt={customer.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {avatarUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </button>
            <div className="text-sm text-gray-500">
              <div className="font-semibold text-gray-900 mb-0.5">Profile picture</div>
              <p>Click the avatar to upload a new photo (JPG, PNG, WebP).</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Mail className="w-4 h-4" /> {customer.email}
          </div>
          <p className="text-xs text-gray-400 mb-1">Email cannot be changed. Contact support if needed.</p>
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
    </CustomerAccountLayout>
  );
}
