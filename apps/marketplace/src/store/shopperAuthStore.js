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

      sendRegisterOtp: async (email) => {
        const normalized = (email || '').trim().toLowerCase();
        if (!normalized) {
          return { ok: false, error: 'Enter your email first.' };
        }
        try {
          const { data } = await api.post('/marketplace/auth/register/send-otp', { email: normalized });
          if (data.disabled) {
            return { ok: true, disabled: true, message: data.message };
          }
          return { ok: true, message: data.message };
        } catch (err) {
          const d = err.response?.data;
          const base = d?.error || 'Could not send code.';
          const detail = d?.detail ? ` ${d.detail}` : '';
          return {
            ok: false,
            error: `${base}${detail}`.trim(),
            retryAfterSec: d?.retryAfterSec,
          };
        }
      },

      resendRegisterOtp: async (email) => {
        const normalized = (email || '').trim().toLowerCase();
        if (!normalized) {
          return { ok: false, error: 'Enter your email first.' };
        }
        try {
          const { data } = await api.post('/marketplace/auth/register/resend-otp', { email: normalized });
          if (data.disabled) return { ok: true, disabled: true };
          return { ok: true };
        } catch (err) {
          const d = err.response?.data;
          return {
            ok: false,
            error: d?.error || 'Could not resend code.',
            retryAfterSec: d?.retryAfterSec,
          };
        }
      },

      register: async ({
        fullName,
        email,
        phone,
        password,
        deliveryRecipientName,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        otp,
        omitOtp,
      }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!fullName || !normalizedEmail || !password) {
          return { ok: false, error: 'Full name, email, and password are required.' };
        }
        if (password.length < 8) {
          return { ok: false, error: 'Password must be at least 8 characters.' };
        }
        const dAddr = String(deliveryAddress || '').trim();
        const dCity = String(deliveryCity || '').trim();
        const dState = String(deliveryState || '').trim();
        if (!dAddr || dAddr.length < 5) {
          return { ok: false, error: 'Delivery street address is required (at least 5 characters).' };
        }
        if (!dCity || !dState) {
          return { ok: false, error: 'Delivery city and state are required.' };
        }
        if (!omitOtp) {
          const otpStr = String(otp || '').trim();
          if (!otpStr) {
            return { ok: false, error: 'Enter the verification code from your email (request a code first).' };
          }
        }
        try {
          const payload = {
            fullName: fullName.trim(),
            email: normalizedEmail,
            phone: (phone || '').trim() || undefined,
            password,
            deliveryAddress: {
              address: dAddr,
              city: dCity,
              state: dState,
            },
          };
          const rName = String(deliveryRecipientName || '').trim();
          if (rName) payload.deliveryAddress.recipientName = rName;
          if (!omitOtp) payload.otp = String(otp || '').trim();

          const { data } = await api.post('/marketplace/auth/register', payload);
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
          const data = err.response?.data;
          const msg = data?.error || 'Invalid email or password.';
          const code = data?.code;
          const emailForResend = data?.email;
          return { ok: false, error: msg, code, emailForResend };
        }
      },

      resendVerification: async (email) => {
        try {
          await api.post('/marketplace/auth/resend-verification', { email: (email || '').trim().toLowerCase() });
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err.response?.data?.error || 'Failed to send verification email.' };
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
