import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Plus, ImageIcon, Trash2, Users, UserPlus, ScrollText, Copy, Check, Fingerprint } from 'lucide-react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';
import { cn } from '../lib/utils';

function tenantLogoSrc(logoUrl) {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return logoUrl;
}

function b64ToBuf(base64url) {
  const base64 = String(base64url || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function bufToB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export default function SettingsPage() {
  const { user, tenant, updateTenant } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('business');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [editableForm, setEditableForm] = useState({
    phone: '',
    website: '',
    industry: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bankSortCode: '',
    invoiceTemplate: 'CLASSIC',
  });
  const [userForm, setUserForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManageUsers = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const isSecureContext = useMemo(() => window.isSecureContext || window.location.hostname === 'localhost', []);

  useEffect(() => {
    if (!tenant) return;
    setEditableForm({
      phone: tenant.phone || '',
      website: tenant.website || '',
      industry: tenant.industry || '',
      bankName: tenant.bankName || '',
      bankAccountNumber: tenant.bankAccountNumber || '',
      bankAccountName: tenant.bankAccountName || '',
      bankSortCode: tenant.bankSortCode || '',
      invoiceTemplate: tenant.invoiceTemplate || 'CLASSIC',
    });
  }, [tenant]);

  useEffect(() => {
    setUserForm((f) => ({
      ...f,
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      email: user?.email || '',
    }));
  }, [user?.firstName, user?.lastName, user?.phone, user?.email]);

  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => api.get('/currencies').then((r) => r.data.data) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data.data), enabled: tab === 'users' && canManageUsers });

  const updateProfileMutation = useMutation({
    mutationFn: (d) => api.put('/users/me', d),
    onSuccess: async () => {
      await qc.invalidateQueries(['auth-me']);
      setSuccess('Profile updated.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (d) => api.post('/auth/change-password', d),
    onSuccess: () => {
      setUserForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      setSuccess('Password changed.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const createUserMutation = useMutation({
    mutationFn: (d) => api.post('/users', d),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['audit-logs']);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF', permissions: [] });
      setSuccess('User created.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['audit-logs']);
      setSuccess('User updated.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed to update user'),
  });

  const bulkInviteMutation = useMutation({
    mutationFn: (invites) => api.post('/users/bulk-invite', { invites }),
    onSuccess: (res) => {
      qc.invalidateQueries(['users']);
      qc.invalidateQueries(['audit-logs']);
      setBulkResult(res.data?.data || null);
      setSuccess(`Bulk invite: ${res.data?.data?.created?.length || 0} created, ${res.data?.data?.skipped?.length || 0} skipped.`);
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Bulk invite failed'),
  });

  function parseBulkInviteText(text) {
    const lines = String(text || '')
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const invites = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length < 3) continue;
      const [email, firstName, lastName, roleOpt] = parts;
      const row = { email, firstName, lastName };
      if (roleOpt) row.role = roleOpt.toUpperCase();
      invites.push(row);
    }
    return invites;
  }

  const PERMISSIONS = [
    { key: 'users:read', label: 'View users' },
    { key: 'users:manage', label: 'Create / edit / activate users' },
    { key: 'departments:view', label: 'View departments' },
    { key: 'departments:manage', label: 'Create / edit departments' },
    { key: 'announcements:view', label: 'View announcements' },
    { key: 'announcements:manage', label: 'Create / edit announcements' },
    { key: 'projects:view', label: 'View projects' },
    { key: 'projects:manage', label: 'Create / edit projects' },
    { key: 'tasks:view', label: 'View tasks' },
    { key: 'tasks:manage', label: 'Create / edit tasks' },
    { key: 'finance:read', label: 'View finance' },
    { key: 'finance:post', label: 'Post / reverse journals' },
    { key: 'invoices:manage', label: 'Create / edit invoices' },
    { key: 'invoices:collect', label: 'Record payments' },
    { key: 'inventory:manage', label: 'Manage stock / warehouses' },
    { key: 'payroll:manage', label: 'Run payroll' },
    { key: 'reports:view', label: 'View reports' },
    { key: 'settings:manage', label: 'Manage tenant settings' },
  ];

  const normalizePermissions = (p) => {
    if (!p) return [];
    if (Array.isArray(p)) return p;
    return [];
  };

  const togglePerm = (current, key) => {
    const set = new Set(current || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    return Array.from(set);
  };

  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF', permissions: [] });
  const [editPermUser, setEditPermUser] = useState(null);
  const [usersSubTab, setUsersSubTab] = useState('directory'); // directory | bulk | audit
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const bizMutation = useMutation({
    mutationFn: (d) => api.put('/tenants/me', d),
    onSuccess: (res) => {
      updateTenant(res.data.data);
      setSuccess('Profile updated.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || e.response?.data?.message || 'Failed'),
  });

  const logoMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/tenants/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      const payload = res.data?.data;
      if (payload?.tenant) updateTenant(payload.tenant);
      else if (payload?.logoUrl && tenant) updateTenant({ ...tenant, logoUrl: payload.logoUrl });
      setSuccess('Logo updated.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Logo upload failed'),
  });

  const clearLogoMutation = useMutation({
    mutationFn: () => api.put('/tenants/me', { logoUrl: null }),
    onSuccess: (res) => {
      updateTenant(res.data.data);
      setSuccess('Logo removed.');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e) => setError(e.response?.data?.error || 'Failed'),
  });

  const addCurrencyMutation = useMutation({
    mutationFn: (d) => api.post('/currencies', d),
    onSuccess: () => qc.invalidateQueries(['currencies']),
  });

  const [newCurrency, setNewCurrency] = useState({ code: '', name: '', symbol: '', exchangeRate: 1 });

  const setEditable = (k) => (e) => setEditableForm((f) => ({ ...f, [k]: e.target.value }));

  const readonlyClass = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-600 cursor-not-allowed';

  const registerPasskey = async () => {
    if (passkeyLoading) return;
    setError('');
    setSuccess('');

    const supported =
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials !== 'undefined' &&
      isSecureContext;

    if (!supported) {
      setError('Passkeys are not supported in this browser or context.');
      return;
    }

    setPasskeyLoading(true);
    try {
      const { data } = await api.post('/auth/webauthn/register/options');
      const options = data?.options;
      if (!options) {
        setError('Could not start passkey registration.');
        return;
      }

      const publicKey = {
        ...options,
        challenge: b64ToBuf(options.challenge),
        user: {
          ...options.user,
          id: b64ToBuf(options.user.id),
        },
        excludeCredentials: Array.isArray(options.excludeCredentials)
          ? options.excludeCredentials.map((c) => ({
              ...c,
              id: b64ToBuf(c.id),
            }))
          : [],
      };

      const cred = await navigator.credentials.create({ publicKey });
      if (!cred) {
        setError('No credential returned.');
        return;
      }

      const attestation = {
        id: cred.id,
        rawId: bufToB64(cred.rawId),
        type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults?.() || {},
        response: {
          attestationObject: bufToB64(cred.response.attestationObject),
          clientDataJSON: bufToB64(cred.response.clientDataJSON),
          transports: cred.response.getTransports ? cred.response.getTransports() : undefined,
        },
      };

      await api.post('/auth/webauthn/register/verify', { response: attestation });
      setSuccess('Passkey added successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      if (e?.name === 'NotAllowedError') setError('Passkey registration was cancelled or timed out.');
      else setError(e.response?.data?.error || 'Passkey registration failed.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="page-header">
        <div><h1 className="page-title">Settings</h1><p className="page-subtitle">Manage your business profile and preferences</p></div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {[['business','Business Profile'],['security','Security'],['currencies','Currencies'],['users','Users']].map(([t, l]) => (
          <button key={t} onClick={() => { setTab(t); setError(''); }} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition', tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}>{l}</button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

      {tab === 'business' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My profile</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                <input value={userForm.firstName} onChange={(e) => setUserForm((f) => ({ ...f, firstName: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                <input value={userForm.lastName} onChange={(e) => setUserForm((f) => ({ ...f, lastName: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input value={userForm.phone} onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input readOnly value={userForm.email} className={readonlyClass} />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setError(''); updateProfileMutation.mutate({ firstName: userForm.firstName, lastName: userForm.lastName, phone: userForm.phone }); }}
                disabled={updateProfileMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition"
              >
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save profile
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Change password</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current password</label>
                <input type="password" value={userForm.currentPassword} onChange={(e) => setUserForm((f) => ({ ...f, currentPassword: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                <input type="password" value={userForm.newPassword} onChange={(e) => setUserForm((f) => ({ ...f, newPassword: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setError(''); changePasswordMutation.mutate({ currentPassword: userForm.currentPassword, newPassword: userForm.newPassword }); }}
                disabled={changePasswordMutation.isPending || !userForm.currentPassword || !userForm.newPassword}
                className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 font-semibold text-sm px-5 py-2.5 rounded-lg transition"
              >
                {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Update password
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm">
            <strong>Legal details</strong> (business name, address, email, tax IDs) are set at registration and can only be changed by platform support after verification.
            You can upload your <strong>logo</strong> and update contact phone, website, industry, and bank details below.
          </div>

          {/* Logo */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company logo</div>
            <p className="text-sm text-slate-600">Shown on documents and the app where your brand appears. PNG, JPG or WebP, max 2MB.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {tenant?.logoUrl ? (
                  <img src={tenantLogoSrc(tenant.logoUrl)} alt="" className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition">
                  {logoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  Upload logo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={logoMutation.isPending}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      if (f) logoMutation.mutate(f);
                    }}
                  />
                </label>
                {tenant?.logoUrl && (
                  <button
                    type="button"
                    onClick={() => clearLogoMutation.mutate()}
                    disabled={clearLogoMutation.isPending}
                    className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Read-only legal */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legal & registration <span className="text-slate-400 font-normal normal-case">(read-only)</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Registered business name</label><input readOnly value={tenant?.businessName || ''} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Trading name</label><input readOnly value={tenant?.tradingName || ''} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Business email</label><input readOnly type="email" value={tenant?.email || ''} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label><input readOnly value={tenant?.country || ''} className={readonlyClass} /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label><input readOnly value={tenant?.address || ''} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">City</label><input readOnly value={tenant?.city || ''} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">State</label><input readOnly value={tenant?.state || ''} className={readonlyClass} /></div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tax & registration IDs <span className="text-slate-400 font-normal normal-case">(read-only)</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">TIN</label><input readOnly value={tenant?.tin || '—'} className={readonlyClass} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">RC number</label><input readOnly value={tenant?.rcNumber || '—'} className={readonlyClass} /></div>
              </div>
            </div>
          </div>

          {/* Editable operational */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact & operations</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Business phone</label><input value={editableForm.phone} onChange={setEditable('phone')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Website</label><input value={editableForm.website} onChange={setEditable('website')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label><input value={editableForm.industry} onChange={setEditable('industry')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice format</label>
                  <select value={editableForm.invoiceTemplate} onChange={setEditable('invoiceTemplate')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CLASSIC">Classic</option>
                    <option value="MODERN">Modern</option>
                    <option value="COMPACT">Compact</option>
                    <option value="BLUE">Blue</option>
                    <option value="MINIMAL">Minimal</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Bank details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Bank name</label><input value={editableForm.bankName} onChange={setEditable('bankName')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Account name</label><input value={editableForm.bankAccountName} onChange={setEditable('bankAccountName')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Account number</label><input value={editableForm.bankAccountNumber} onChange={setEditable('bankAccountNumber')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Sort code</label><input value={editableForm.bankSortCode} onChange={setEditable('bankSortCode')} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setError(''); bizMutation.mutate(editableForm); }}
                disabled={bizMutation.isPending}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition"
              >
                {bizMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passkeys</div>
                <div className="mt-1 text-sm text-slate-700">
                  Add a passkey to sign in using fingerprint / Face ID on supported devices.
                </div>
              </div>
              <button
                type="button"
                onClick={registerPasskey}
                disabled={passkeyLoading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
              >
                {passkeyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                Add passkey
              </button>
            </div>
          </div>
        </div>
      )}

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

      {tab === 'users' && (
        <div className="space-y-4">
          {!canManageUsers ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 text-sm text-slate-600">
              You do not have permission to manage users.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {[
                  ['directory', 'Directory', Users],
                  ['bulk', 'Bulk invite', UserPlus],
                  ['audit', 'Audit log', ScrollText],
                ].map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setUsersSubTab(key);
                      setError('');
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition',
                      usersSubTab === key ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {usersSubTab === 'bulk' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                      Bulk invite
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      One user per line: <code className="bg-slate-100 px-1 rounded">email, first name, last name</code> or add{' '}
                      <code className="bg-slate-100 px-1 rounded">, ROLE</code> (e.g. STAFF, HR). Max 50 lines. Temporary passwords are
                      generated — copy them once; users should change password after login. Only the <strong>OWNER</strong> can assign{' '}
                      <strong>ADMIN</strong>.
                    </p>
                  </div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={10}
                    placeholder={`ada@company.com, Ada, Lovelace, STAFF\nbob@company.com, Bob, Smith`}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={bulkInviteMutation.isPending || !bulkText.trim()}
                      onClick={() => {
                        setError('');
                        const invites = parseBulkInviteText(bulkText);
                        if (invites.length === 0) {
                          setError('Paste at least one valid line: email, first name, last name');
                          return;
                        }
                        bulkInviteMutation.mutate(invites);
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg"
                    >
                      {bulkInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Run bulk invite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkText('');
                        setBulkResult(null);
                      }}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900"
                    >
                      Clear
                    </button>
                  </div>

                  {bulkResult?.skipped?.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                      <div className="font-semibold text-amber-900">Skipped ({bulkResult.skipped.length})</div>
                      <ul className="mt-1 text-xs text-amber-800 space-y-0.5 max-h-32 overflow-y-auto">
                        {bulkResult.skipped.map((s, i) => (
                          <li key={i}>
                            {s.email}: {s.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bulkResult?.created?.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                      <div className="font-semibold text-green-900 mb-2">Created — copy temporary passwords now</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-green-800 border-b border-green-200">
                              <th className="py-1 pr-2">Email</th>
                              <th className="py-1 pr-2">Role</th>
                              <th className="py-1 pr-2">Temp password</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkResult.created.map((c) => (
                              <tr key={c.id} className="border-b border-green-100">
                                <td className="py-1.5 pr-2 font-mono">{c.email}</td>
                                <td className="py-1.5 pr-2">{c.role}</td>
                                <td className="py-1.5 pr-2">
                                  <div className="flex items-center gap-1">
                                    <code className="bg-white/80 px-1 rounded">{c.temporaryPassword}</code>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(c.temporaryPassword);
                                        setCopiedId(c.id);
                                        setTimeout(() => setCopiedId(null), 2000);
                                      }}
                                      className="p-0.5 text-green-700 hover:bg-green-100 rounded"
                                      title="Copy password"
                                    >
                                      {copiedId === c.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {usersSubTab === 'audit' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-slate-600" />
                    <div>
                      <div className="font-semibold text-slate-900">User audit log</div>
                      <div className="text-xs text-slate-500">CREATE / UPDATE / BULK_INVITE for users in your organization</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                          <th className="text-left px-4 py-2 font-semibold whitespace-nowrap">When</th>
                          <th className="text-left px-4 py-2 font-semibold">Actor</th>
                          <th className="text-left px-4 py-2 font-semibold">Action</th>
                          <th className="text-left px-4 py-2 font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!auditRows || auditRows.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-slate-400">
                              No user-related audit entries yet.
                            </td>
                          </tr>
                        )}
                        {(auditRows || []).map((row) => (
                          <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80 align-top">
                            <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                              {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-2 text-xs">
                              {row.user ? (
                                <>
                                  <div className="text-slate-900">{row.user.firstName} {row.user.lastName}</div>
                                  <div className="text-slate-500">{row.user.email}</div>
                                </>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs font-mono text-slate-800">{row.action}</td>
                            <td className="px-4 py-2 text-xs text-slate-600 max-w-md break-words">
                              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-slate-50 rounded p-2 max-h-24 overflow-y-auto">
                                {JSON.stringify({ newValues: row.newValues, oldValues: row.oldValues }, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {usersSubTab === 'directory' && (
              <>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900">Create user</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input value={newUser.firstName} onChange={(e) => setNewUser((f) => ({ ...f, firstName: e.target.value }))} placeholder="First name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input value={newUser.lastName} onChange={(e) => setNewUser((f) => ({ ...f, lastName: e.target.value }))} placeholder="Last name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input value={newUser.email} onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))} placeholder="Email" type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <input value={newUser.password} onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))} placeholder="Temp password" type="password" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  <select value={newUser.role} onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {['OWNER','ADMIN','ACCOUNTANT','SALES','WAREHOUSE','HR','STAFF'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Permissions</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMISSIONS.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={(newUser.permissions || []).includes(p.key)}
                          onChange={() => setNewUser((f) => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Tip: if you leave permissions empty, role-based access still applies.
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      createUserMutation.mutate({
                        firstName: newUser.firstName,
                        lastName: newUser.lastName,
                        email: String(newUser.email || '').trim().toLowerCase(),
                        password: newUser.password,
                        role: newUser.role,
                        permissions: normalizePermissions(newUser.permissions),
                      });
                    }}
                    disabled={createUserMutation.isPending || !newUser.email || !newUser.password || String(newUser.password).length < 8 || !newUser.firstName || !newUser.lastName}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-lg"
                  >
                    {createUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create
                  </button>
                </div>
                {newUser.password && String(newUser.password).length < 8 && (
                  <div className="text-xs text-amber-700">Password must be at least 8 characters.</div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                      <th className="text-left px-5 py-3 font-semibold">Name</th>
                      <th className="text-left px-5 py-3 font-semibold">Email</th>
                      <th className="text-left px-5 py-3 font-semibold">Role</th>
                      <th className="text-left px-5 py-3 font-semibold">Status</th>
                      <th className="text-right px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users || []).length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No users</td></tr>}
                    {(users || []).map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">{u.firstName?.[0]}{u.lastName?.[0]}</div><span className="font-medium text-slate-900">{u.firstName} {u.lastName}</span></div></td>
                        <td className="px-5 py-3 text-slate-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <select
                            value={u.role}
                            disabled={updateUserMutation.isPending || (u.role === 'OWNER' && user?.role !== 'OWNER')}
                            onChange={(e) => updateUserMutation.mutate({ id: u.id, role: e.target.value })}
                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          >
                            {['OWNER','ADMIN','ACCOUNTANT','SALES','WAREHOUSE','HR','STAFF'].map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3"><span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setEditPermUser({ id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, permissions: (u.permissions || []) })}
                            disabled={updateUserMutation.isPending || (u.role === 'OWNER' && user?.role !== 'OWNER')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 mr-2"
                          >
                            Permissions
                          </button>
                          <button
                            type="button"
                            onClick={() => updateUserMutation.mutate({ id: u.id, isActive: !u.isActive })}
                            disabled={updateUserMutation.isPending || (u.role === 'OWNER' && user?.role !== 'OWNER')}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editPermUser && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
                  <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Edit permissions</div>
                        <div className="text-xs text-slate-500 mt-0.5">{editPermUser.name} — {editPermUser.email}</div>
                      </div>
                      <button type="button" onClick={() => setEditPermUser(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Close</button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PERMISSIONS.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={(editPermUser.permissions || []).includes(p.key)}
                            onChange={() => setEditPermUser((f) => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditPermUser(null)}
                        className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          updateUserMutation.mutate({ id: editPermUser.id, permissions: normalizePermissions(editPermUser.permissions) });
                          setEditPermUser(null);
                        }}
                        disabled={updateUserMutation.isPending}
                        className="text-sm font-semibold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
