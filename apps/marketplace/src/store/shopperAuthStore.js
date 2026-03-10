import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

const useShopperAuthStore = create(
  persist(
    (set, get) => ({
      shopper: null,
      customer: null,
      isAuthenticated: false,

      setFromApi: (customer, token) => {
        if (token) localStorage.setItem('mkt_token', token);
        set({
          customer,
          shopper: customer ? { fullName: customer.fullName, email: customer.email, phone: customer.phone } : null,
          isAuthenticated: !!customer,
        });
      },

      register: async ({ fullName, email, phone, password }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!fullName || !normalizedEmail || !password) {
          return { ok: false, error: 'Full name, email, and password are required.' };
        }
        if (password.length < 8) {
          return { ok: false, error: 'Password must be at least 8 characters.' };
        }
        try {
          const { data } = await api.post('/marketplace/auth/register', {
            fullName: fullName.trim(),
            email: normalizedEmail,
            phone: (phone || '').trim() || undefined,
            password,
          });
          get().setFromApi(data.customer, data.accessToken);
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || 'Registration failed.';
          return { ok: false, error: msg };
        }
      },

      login: async ({ email, password }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!normalizedEmail || !password) {
          return { ok: false, error: 'Email and password are required.' };
        }
        try {
          const { data } = await api.post('/marketplace/auth/login', {
            email: normalizedEmail,
            password,
          });
          get().setFromApi(data.customer, data.accessToken);
          return { ok: true };
        } catch (err) {
          const msg = err.response?.data?.error || 'Invalid email or password.';
          return { ok: false, error: msg };
        }
      },

      logout: () => {
        localStorage.removeItem('mkt_token');
        set({ shopper: null, customer: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = localStorage.getItem('mkt_token');
        if (!token) return;
        try {
          const { data } = await api.get('/marketplace/customer/me');
          get().setFromApi(data.data, token);
        } catch {
          get().logout();
        }
      },
    }),
    { name: 'cosmos-shopper-auth', partialize: (s) => ({ customer: s.customer, shopper: s.shopper, isAuthenticated: s.isAuthenticated }) }
  )
);

export default useShopperAuthStore;
