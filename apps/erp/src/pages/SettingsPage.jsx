import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Plus, X } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn } from '../lib/utils';

export default function SettingsPage() {
  const { user, tenant, updateTenant } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('business');
  const [bizForm, setBizForm] = useState({
    businessName: tenant?.businessName || '',
    tradingName: tenant?.tradingName || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || '',
    city: tenant?.city || '',
    state: tenant?.state || '',
    tin: tenant?.tin || '',
    rcNumber: tenant?.rcNumber || '',
    vatNumber: tenant?.vatNumber || '',
  });
  const [userForm, setUserForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => api.get('/currencies').then((r) => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data.data), enabled: tab === 'users' });

  const bizMutation = useMutation({
    mutationFn: (d) => api.put('/tenants/profile', d),
    onSuccess: (res) => { updateTenant(res.data.data); setSuccess('Business profile updated.'); setTimeout(() => setSuccess(''), 3000); },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const addCurrencyMutation = useMutation({
    mutationFn: (d) => api.post('/currencies', d),
    onSuccess: () => qc.invalidateQueries(['currencies']),
  });

  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', exchangeRate: 1 });

  const setBiz = (k) => (e) => setBizForm((f) => ({ ...f, [k]: e.target.value }));

  const nigerianStates = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your business profile and preferences</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {[['business','Business Profile'],['currencies','Currencies'],['users','Users']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>{l}</button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

      {/* Business Profile */}
      {tab === 'business' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Business Information</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Registered Business Name</label><input value={bizForm.businessName} onChange={setBiz('businessName')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Trading Name</label><input value={bizForm.tradingName} onChange={setBiz('tradingName')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Business Email</label><input type="email" value={bizForm.email} onChange={setBiz('email')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Business Phone</label><input value={bizForm.phone} onChange={setBiz('phone')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label><input value={bizForm.address} onChange={setBiz('address')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">City</label><input value={bizForm.city} onChange={setBiz('city')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <select value={bizForm.state} onChange={setBiz('state')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select state</option>
                  {nigerianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tax & Registration IDs</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">TIN</label><input value={bizForm.tin} onChange={setBiz('tin')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tax Identification Number" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">RC Number</label><input value={bizForm.rcNumber} onChange={setBiz('rcNumber')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="CAC Registration" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">VAT Number</label><input value={bizForm.vatNumber} onChange={setBiz('vatNumber')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => bizMutation.mutate(bizForm)} disabled={bizMutation.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition">
              {bizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Currencies */}
      {tab === 'currencies' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Code</th><th className="text-left px-5 py-3 font-semibold">Name</th><th className="text-left px-5 py-3 font-semibold">Symbol</th><th className="text-right px-5 py-3 font-semibold">Rate to NGN</th><th className="text-left px-5 py-3 font-semibold">Default</th></tr></thead>
              <tbody>
                {(currencies || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No currencies configured</td></tr>}
                {(currencies || []).map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="px-5 py-3 font-mono font-semibold text-slate-900">{c.code}</td>
                    <td className="px-5 py-3 text-slate-700">{c.name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.symbol}</td>
                    <td className="px-5 py-3 text-right font-semibold">{parseFloat(c.exchangeRate).toFixed(4)}</td>
                    <td className="px-5 py-3">{c.isDefault && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Default</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Add Currency</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Code *</label><input value={newCurrency.code} onChange={(e) => setNewCurrency((f) => ({ ...f, code: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="USD" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Name *</label><input value={newCurrency.name} onChange={(e) => setNewCurrency((f) => ({ ...f, name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="US Dollar" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Symbol</label><input value={newCurrency.symbol} onChange={(e) => setNewCurrency((f) => ({ ...f, symbol: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="$" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Rate to NGN</label><input type="number" value={newCurrency.exchangeRate} onChange={(e) => setNewCurrency((f) => ({ ...f, exchangeRate: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <button onClick={() => addCurrencyMutation.mutate({ ...newCurrency, exchangeRate: parseFloat(newCurrency.exchangeRate) })} disabled={addCurrencyMutation.isPending || !newCurrency.code}
              className="mt-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              {addCurrencyMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Currency
            </button>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-3 font-semibold">Name</th><th className="text-left px-5 py-3 font-semibold">Email</th><th className="text-left px-5 py-3 font-semibold">Role</th><th className="text-left px-5 py-3 font-semibold">Status</th></tr></thead>
            <tbody>
              {(users || []).length === 0 && <tr><td colSpan={4} className="text-center py-8 text-slate-400">No users</td></tr>}
              {(users || []).map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">{u.firstName?.[0]}{u.lastName?.[0]}</div><span className="font-medium text-slate-900">{u.firstName} {u.lastName}</span></div></td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{u.role}</span></td>
                  <td className="px-5 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
