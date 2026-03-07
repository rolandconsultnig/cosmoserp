import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useShopperAuthStore = create(
  persist(
    (set, get) => ({
      shopper: null,
      isAuthenticated: false,

      register: ({ fullName, email, phone, password }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!fullName || !normalizedEmail || !password) {
          return { ok: false, error: 'Full name, email, and password are required.' };
        }
        const existing = get().shopper;
        if (existing?.email === normalizedEmail && existing.password !== password) {
          return { ok: false, error: 'Account already exists. Please sign in.' };
        }
        const shopper = {
          fullName: fullName.trim(),
          email: normalizedEmail,
          phone: (phone || '').trim(),
          password,
          registeredAt: new Date().toISOString(),
        };
        set({ shopper, isAuthenticated: true });
        return { ok: true };
      },

      login: ({ email, password }) => {
        const normalizedEmail = (email || '').trim().toLowerCase();
        const shopper = get().shopper;
        if (!shopper || shopper.email !== normalizedEmail || shopper.password !== password) {
          return { ok: false, error: 'Invalid email or password.' };
        }
        set({ isAuthenticated: true });
        return { ok: true };
      },

      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'cosmos-shopper-auth' }
  )
);

export default useShopperAuthStore;
