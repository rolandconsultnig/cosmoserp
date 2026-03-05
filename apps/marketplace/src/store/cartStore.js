import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const existing = get().items.find((i) => i.id === product.id);
        if (existing) {
          set({ items: get().items.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i) });
        } else {
          set({ items: [...get().items, { ...product, quantity }] });
        }
      },

      updateQty: (id, quantity) => {
        if (quantity <= 0) return get().removeItem(id);
        set({ items: get().items.map((i) => i.id === id ? { ...i, quantity } : i) });
      },

      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      clear: () => set({ items: [] }),

      get total() {
        return get().items.reduce((s, i) => s + parseFloat(i.sellingPrice) * i.quantity, 0);
      },

      get count() {
        return get().items.reduce((s, i) => s + i.quantity, 0);
      },
    }),
    { name: 'cosmos-cart' }
  )
);

export default useCartStore;
