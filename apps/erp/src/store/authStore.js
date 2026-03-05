import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, tenant: data.user?.tenant, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.clear();
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, tenant: data.user?.tenant, isAuthenticated: true });
    return data;
  },

  logout: async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }); } catch {}
    localStorage.clear();
    set({ user: null, tenant: null, isAuthenticated: false });
  },

  updateTenant: (tenant) => set({ tenant }),
}));

export default useAuthStore;
