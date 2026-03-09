import { create } from 'zustand';
import api from '../lib/api';

const useAuthStore = create((set) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,
  serverUnreachable: false,

  init: async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await api.get('/auth/admin/me');
      if (!data.admin || data.type !== 'admin') throw new Error('Not an admin session');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ admin: data.admin, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('admin_token');
      const isServerError = err.response?.status >= 502 || err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK';
      set({ isLoading: false, serverUnreachable: !!isServerError });
    }
  },

  clearServerUnreachable: () => set({ serverUnreachable: false }),

  login: async (email, password) => {
    const { data } = await api.post('/auth/admin/login', { email, password });
    if (!data.admin) throw new Error('Access denied: invalid admin response');
    // clear out any regular user tokens if they exist
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
