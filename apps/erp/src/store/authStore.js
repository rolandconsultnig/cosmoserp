import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  impersonation: null,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ isLoading: false, impersonation: null }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({
        user: data.user,
        tenant: data.user?.tenant,
        isAuthenticated: true,
        isLoading: false,
        impersonation: data.impersonation || null,
      });
    } catch {
      localStorage.clear();
      set({ isLoading: false, impersonation: null });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, tenant: data.user?.tenant, isAuthenticated: true, impersonation: null });
    return data;
  },

  /** Apply admin-issued impersonation JWT (no refresh token). */
  applyImpersonationToken: async (accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.removeItem('refreshToken');
    const { data } = await api.get('/auth/me');
    set({
      user: data.user,
      tenant: data.user?.tenant,
      isAuthenticated: true,
      isLoading: false,
      impersonation: data.impersonation || null,
    });
  },

  logout: async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }); } catch {}
    localStorage.clear();
    set({ user: null, tenant: null, isAuthenticated: false, impersonation: null });
  },

  updateTenant: (tenant) => set({ tenant }),
}));

export default useAuthStore;
