import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Shield, UserPlus, Search, ChevronLeft, ChevronRight,
  Loader2, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, Building2,
} from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

const ROLE_CFG = {
  SUPER_ADMIN:   { label: 'Super Admin',   color: '#7C3AED', bg: '#F5F3FF' },
  FINANCE_ADMIN: { label: 'Finance Admin', color: '#0052CC', bg: '#EBF2FF' },
  SUPPORT:       { label: 'Support',       color: '#00875A', bg: '#E3FCEF' },
  COMPLIANCE:    { label: 'Compliance',    color: '#FF8B00', bg: '#FFF7E6' },
};

const USER_ROLE_CFG = {
  OWNER:      { label: 'Owner',      color: '#7C3AED', bg: '#F5F3FF' },
  ADMIN:      { label: 'Admin',      color: '#0052CC', bg: '#EBF2FF' },
  ACCOUNTANT: { label: 'Accountant', color: '#00875A', bg: '#E3FCEF' },
  SALES:      { label: 'Sales',      color: '#FF8B00', bg: '#FFF7E6' },
  WAREHOUSE:  { label: 'Warehouse',  color: '#64748B', bg: '#F1F5F9' },
  HR:         { label: 'HR',         color: '#EC4899', bg: '#FCE7F3' },
  STAFF:      { label: 'Staff',      color: '#6366F1', bg: '#EEF2FF' },
  VIEWER:     { label: 'Viewer',     color: '#94A3B8', bg: '#F8FAFC' },
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

export default function UsersManagementPage() {
  const [tab, setTab] = useState('admin');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'SUPPORT' });
  const [showPassword, setShowPassword] = useState(false);
  const qc = useQueryClient();

  const { data: adminUsers, isLoading: adminsLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/admin-users').then(r => r.data.data).catch(() => []),
    enabled: tab === 'admin',
  });

  const { data: tenantUsersData, isLoading: tenantUsersLoading } = useQuery({
    queryKey: ['tenant-users', page],
    queryFn: () => api.get('/admin/tenant-users', { params: { page, limit: 20 } }).then(r => r.data).catch(() => ({ data: [] })),
    enabled: tab === 'tenant',
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/users', data),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); setShowCreateForm(false); setNewAdmin({ email: '', password: '', firstName: '', lastName: '', role: 'SUPPORT' }); },
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ adminId, ...body }) => api.patch(`/admin/admin-users/${adminId}`, body),
    onSuccess: () => qc.invalidateQueries(['admin-users']),
  });

  const toggleUserMutation = useMutation({
    mutationFn: (userId) => api.patch(`/admin/tenant-users/${userId}/toggle`),
    onSuccess: () => qc.invalidateQueries(['tenant-users']),
  });

  const filteredAdmins = (adminUsers || []).filter(a =>
    !search || `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Users Management</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage admin team and tenant user accounts</p>
        </div>
        {tab === 'admin' && (
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
            <UserPlus className="w-4 h-4" /> Add Admin
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: 'admin', label: 'Admin Users', icon: Shield },
          { id: 'tenant', label: 'Tenant Users', icon: Building2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setPage(1); setSearch(''); }}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold transition-all',
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Create admin form */}
      {showCreateForm && tab === 'admin' && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
          <h3 className="text-[14px] font-bold text-slate-800">Create Admin User</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <input value={newAdmin.firstName} onChange={e => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
              placeholder="First name" className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <input value={newAdmin.lastName} onChange={e => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
              placeholder="Last name" className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <input value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
              placeholder="Email" type="email" className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <div className="relative">
              <input value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                placeholder="Password" type={showPassword ? 'text' : 'password'} className="w-full px-3 py-2.5 pr-9 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <select value={newAdmin.role} onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(newAdmin)} disabled={createMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100">Cancel</button>
          </div>
          {createMutation.isError && <p className="text-[12px] text-red-500">{createMutation.error?.response?.data?.error || 'Failed to create admin'}</p>}
        </div>
      )}

      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'admin' ? 'Search admin users…' : 'Search tenant users…'}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-[13px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </div>

      {/* Admin Users Table */}
      {tab === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-black uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adminsLoading && [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50 animate-pulse">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                </tr>
              ))}
              {filteredAdmins.map(admin => {
                const roleCfg = ROLE_CFG[admin.role] || ROLE_CFG.SUPPORT;
                return (
                  <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                          {admin.firstName?.[0]}{admin.lastName?.[0]}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-800">{admin.firstName} {admin.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{admin.email}</td>
                    <td className="px-4 py-3">
                      <select defaultValue={admin.role}
                        onChange={e => updateAdminMutation.mutate({ adminId: admin.id, role: e.target.value })}
                        className="text-[11px] font-bold rounded-lg px-2 py-1 border-0" style={{ background: roleCfg.bg, color: roleCfg.color }}>
                        {Object.entries(ROLE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', admin.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        {admin.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDate(admin.lastLoginAt)}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDate(admin.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => updateAdminMutation.mutate({ adminId: admin.id, isActive: !admin.isActive })}
                        className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors',
                          admin.isActive ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100')}>
                        {admin.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!adminsLoading && filteredAdmins.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-[13px] text-slate-400">No admin users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tenant Users Table */}
      {tab === 'tenant' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Name', 'Email', 'Tenant', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-black uppercase text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenantUsersLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50 animate-pulse">
                  {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-slate-100 rounded" /></td>)}
                </tr>
              ))}
              {(tenantUsersData?.data || []).filter(u =>
                !search || `${u.firstName} ${u.lastName} ${u.email} ${u.tenant?.businessName}`.toLowerCase().includes(search.toLowerCase())
              ).map(user => {
                const roleCfg = USER_ROLE_CFG[user.role] || USER_ROLE_CFG.STAFF;
                return (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{user.firstName} {user.lastName}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold text-indigo-600">{user.tenant?.businessName || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: roleCfg.bg, color: roleCfg.color }}>
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        {user.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">{fmtDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleUserMutation.mutate(user.id)}
                        className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors',
                          user.isActive ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100')}>
                        {user.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!tenantUsersLoading && (tenantUsersData?.data || []).length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-[13px] text-slate-400">No tenant users found</td></tr>
              )}
            </tbody>
          </table>
          {(tenantUsersData?.totalPages || 0) > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[12px] text-slate-400">Page {page} of {tenantUsersData.totalPages}</span>
              <div className="flex gap-1.5">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white text-slate-600">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button disabled={page >= (tenantUsersData?.totalPages || 1)} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-slate-200 disabled:opacity-30 bg-white text-slate-600">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
