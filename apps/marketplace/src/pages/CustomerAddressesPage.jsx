import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Edit3, Loader2 } from 'lucide-react';
import api from '../lib/api';
import CustomerAccountLayout from '../components/CustomerAccountLayout';

export default function CustomerAddressesPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', isDefault: false });

  const { data, isLoading } = useQuery({
    queryKey: ['customer-addresses'],
    queryFn: () => api.get('/marketplace/customer/addresses').then((r) => r.data.data || []),
    staleTime: 30_000,
  });

  const addresses = data || [];

  const sorted = useMemo(() => {
    const list = [...addresses];
    list.sort((a, b) => (b.isDefault === true) - (a.isDefault === true));
    return list;
  }, [addresses]);

  const resetForm = () => {
    setForm({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', isDefault: false });
    setEditingId(null);
    setShowForm(false);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startAdd = () => {
    setEditingId(null);
    setForm({ label: 'Home', name: '', phone: '', address: '', city: '', state: '', isDefault: addresses.length === 0 });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (payload.id) {
        return api.put(`/marketplace/customer/addresses/${payload.id}`, payload).then((r) => r.data.data);
      }
      return api.post('/marketplace/customer/addresses', payload).then((r) => r.data.data);
    },
    onSuccess: () => {
      qc.invalidateQueries(['customer-addresses']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/marketplace/customer/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries(['customer-addresses']),
  });

  const startEdit = (addr) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label || 'Address',
      name: addr.name || '',
      phone: addr.phone || '',
      address: addr.address || '',
      city: addr.city || '',
      state: addr.state || '',
      isDefault: !!addr.isDefault,
    });
    setShowForm(true);
  };

  const remove = (id) => {
    if (!id) return;
    deleteMutation.mutate(id);
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      id: editingId || undefined,
      label: (form.label || 'Address').trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim(),
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      isDefault: !!form.isDefault,
    };

    if (!payload.name || !payload.address) return;
    saveMutation.mutate(payload);
  };

  const setDefault = (id) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;
    saveMutation.mutate({ ...addr, isDefault: true });
  };

  return (
    <CustomerAccountLayout active="addresses">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/account" className="text-gray-500 hover:text-gray-700 text-sm">Account</Link>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-gray-900">Addresses</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Address book</h1>
          <p className="text-sm text-gray-500 mt-1">Saved shipping addresses for your account.</p>
        </div>
        <button type="button" onClick={startAdd} className="btn-buy inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add address
        </button>
      </div>

      {isLoading && !showForm && (
        <div className="card p-6 mb-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading addresses…
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="card p-5 mb-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">Label</label>
              <input className="input" value={form.label} onChange={update('label')} placeholder="Home / Office" />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input
                id="isDefault"
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default</label>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">Full name</label>
              <input className="input" value={form.name} onChange={update('name')} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
              <input className="input" value={form.phone} onChange={update('phone')} placeholder="Optional" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-500" /> Address
            </label>
            <input className="input" value={form.address} onChange={update('address')} placeholder="Street address" required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">City</label>
              <input className="input" value={form.city} onChange={update('city')} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5">State</label>
              <input className="input" value={form.state} onChange={update('state')} placeholder="Optional" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saveMutation.isLoading} className="btn-buy py-2.5 px-4 rounded-xl font-semibold text-sm disabled:opacity-60">
              {saveMutation.isLoading ? 'Saving…' : editingId ? 'Save changes' : 'Add address'}
            </button>
            <button type="button" onClick={resetForm} className="btn-outline py-2.5 px-4 rounded-xl font-semibold text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 && !isLoading ? (
        <div className="card p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No saved addresses yet.</p>
          <button type="button" onClick={startAdd} className="btn-buy inline-block py-2.5 px-5 rounded-xl font-semibold text-sm">
            Add your first address
          </button>
        </div>
      ) : sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-gray-900 truncate">{a.label || 'Address'}</div>
                    {a.isDefault && <span className="badge-brand">Default</span>}
                  </div>
                  <div className="text-sm text-gray-700 mt-1 font-semibold">{a.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {[a.address, a.city, a.state].filter(Boolean).join(', ')}
                  </div>
                  {a.phone && <div className="text-sm text-gray-500 mt-0.5">{a.phone}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!a.isDefault && (
                    <button type="button" onClick={() => setDefault(a.id)} className="btn-outline px-3 py-2 rounded-xl text-xs font-semibold">
                      Set default
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(a)} className="btn-ghost inline-flex items-center gap-1">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button type="button" onClick={() => remove(a.id)} className="btn-ghost text-red-600 hover:text-red-700 inline-flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </CustomerAccountLayout>
  );
}

