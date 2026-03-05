import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,

  init: async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      if (data.admin?.role !== 'SUPER_ADMIN') throw new Error('Not super admin');
      set({ admin: data.admin, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('admin_token');
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password });
    if (data.admin?.role !== 'SUPER_ADMIN') throw new Error('Access denied: not a super admin account');
    localStorage.setItem('admin_token', data.accessToken);
    set({ admin: data.admin, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    set({ admin: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
