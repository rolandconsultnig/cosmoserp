import { create } from 'zustand';
import api from '../lib/api';
import { Capacitor, registerPlugin } from '@capacitor/core';

const AuthBridge = registerPlugin('AuthBridge');

const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,
  impersonation: null,

  setSession: async (data) => {
    if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
    if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    set({
      user: data?.user || null,
      tenant: data?.user?.tenant || null,
      isAuthenticated: Boolean(data?.accessToken),
      impersonation: null,
    });
  },

  init: async () => {
    let token = localStorage.getItem('accessToken');

    if (!token && typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() !== 'web') {
      try {
        const res = await AuthBridge.getAccessToken();
        if (res?.accessToken) {
          localStorage.setItem('accessToken', res.accessToken);
          token = res.accessToken;
        }
      } catch {
        // ignore and fall through
      }
    }

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

    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() !== 'web') {
      try {
        await AuthBridge.storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      } catch {
        // ignore
      }
    }

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

  biometricUnlock: async () => {
    if (typeof Capacitor === 'undefined' || !Capacitor.getPlatform || Capacitor.getPlatform() === 'web') {
      throw new Error('Biometric unlock is only available on the mobile app');
    }

    const tokens = await AuthBridge.unlockAndGetTokens();
    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) throw new Error('No stored refresh token');

    localStorage.setItem('refreshToken', refreshToken);

    let accessToken = tokens?.accessToken;
    if (!accessToken) {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      accessToken = data?.accessToken;
    }
    if (!accessToken) throw new Error('Could not obtain access token');

    localStorage.setItem('accessToken', accessToken);
    try {
      await AuthBridge.storeTokens({ accessToken, refreshToken });
    } catch {
      // ignore
    }

    const { data: me } = await api.get('/auth/me');
    set({ user: me.user, tenant: me.user?.tenant, isAuthenticated: true, impersonation: me.impersonation || null });
    return me;
  },

  logout: async () => {
    try { await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }); } catch {}
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform && Capacitor.getPlatform() !== 'web') {
      try { await AuthBridge.clearTokens(); } catch {}
    }
    localStorage.clear();
    set({ user: null, tenant: null, isAuthenticated: false, impersonation: null });
  },

  updateTenant: (tenant) => set({ tenant }),
}));

export default useAuthStore;
